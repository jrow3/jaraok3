import { describe, test, expect } from 'vitest';
import { buildYtQuery, parseYtResults, rankYtResults } from './youtube';

describe('buildYtQuery', () => {
	test('appends "karaoke" and wraps as an ytsearch query', () => {
		expect(buildYtQuery('bohemian rhapsody', 10)).toBe('ytsearch10:bohemian rhapsody karaoke');
	});
	test('does not double up when the query already says karaoke', () => {
		expect(buildYtQuery('sweet caroline karaoke', 10)).toBe('ytsearch10:sweet caroline karaoke');
	});
	test('honors the result count', () => {
		expect(buildYtQuery('africa', 5)).toBe('ytsearch5:africa karaoke');
	});
});

describe('parseYtResults', () => {
	const sample = JSON.stringify({
		entries: [
			{ id: 'abc123', title: 'Bohemian Rhapsody (Karaoke)', uploader: 'Sing King', duration: 355 },
			{
				id: 'def456',
				title: 'Bohemian Rhapsody - Karaoke',
				channel: 'KaraFun',
				duration: 359.4,
				playable_in_embed: false
			},
			{ id: null, title: 'broken' },
			{ title: 'no id at all' }
		]
	});

	test('maps entries to id/title/channel/duration/embeddable and drops entries without an id', () => {
		const results = parseYtResults(sample);
		expect(results).toHaveLength(2);
		expect(results[0]).toEqual({
			ytId: 'abc123',
			title: 'Bohemian Rhapsody (Karaoke)',
			channel: 'Sing King',
			durationSec: 355,
			playableInEmbed: null
		});
		expect(results[1].channel).toBe('KaraFun');
		expect(results[1].durationSec).toBe(359);
		expect(results[1].playableInEmbed).toBe(false);
	});

	test('returns [] for output with no entries', () => {
		expect(parseYtResults('{}')).toEqual([]);
	});

	test('falls back to "YouTube" when an entry has no uploader or channel', () => {
		const noChannel = JSON.stringify({ entries: [{ id: 'ghi789', title: 'No Channel' }] });
		expect(parseYtResults(noChannel)[0].channel).toBe('YouTube');
	});
});

describe('rankYtResults', () => {
	const r = (ytId: string, channel: string, playableInEmbed: boolean | null = null) => ({
		ytId,
		title: ytId,
		channel,
		durationSec: null,
		playableInEmbed
	});

	test('drops channels on the blocklist (case-insensitive substring)', () => {
		const out = rankYtResults([r('a', 'Sing King'), r('b', 'KaraFun Karaoke'), r('c', 'EdKara')], {
			blocklist: ['karafun']
		});
		expect(out.map((x) => x.ytId)).toEqual(['a', 'c']);
	});

	test('floats preferred channels to the top, preserving order otherwise', () => {
		const input = [r('a', 'Random Uploads'), r('b', 'EdKara'), r('c', 'Sing King'), r('d', 'Another')];
		const out = rankYtResults(input, { priority: ['Sing King', 'EdKara'] });
		expect(out.map((x) => x.ytId)).toEqual(['c', 'b', 'a', 'd']);
	});

	test('matches priority channels case-insensitively by substring', () => {
		const out = rankYtResults([r('a', 'Random'), r('b', 'Sing King Official')], {
			priority: ['sing king']
		});
		expect(out[0].ytId).toBe('b');
	});
});
