import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

const ytdlp = vi.hoisted(() => ({ runs: 0, stdout: '' }));
vi.mock('node:child_process', () => ({
	execFile: (_bin: string, _args: string[], _options: unknown, done: (e: Error | null, out?: { stdout: string }) => void) => {
		ytdlp.runs++;
		setTimeout(() => done(null, { stdout: ytdlp.stdout }), 5);
	}
}));

const { searchYouTube } = await import('./youtube');

const ONE_RESULT = JSON.stringify({ entries: [{ id: 'abc123', title: 'Africa (Karaoke)', channel: 'Sing King' }] });

beforeEach(() => {
	ytdlp.runs = 0;
});

describe('searchYouTube', () => {
	test('guests searching the same thing at once share one yt-dlp run', async () => {
		ytdlp.stdout = ONE_RESULT;
		const answers = await Promise.all([searchYouTube('africa'), searchYouTube('Africa '), searchYouTube('africa')]);
		expect(ytdlp.runs).toBe(1);
		expect(answers.every((results) => results.length === 1)).toBe(true);
	});

	test('an unreadable answer is asked again rather than remembered as no results', async () => {
		ytdlp.stdout = 'not json';
		expect(await searchYouTube('toto')).toEqual([]);
		ytdlp.stdout = ONE_RESULT;
		expect(await searchYouTube('toto')).toHaveLength(1);
		expect(ytdlp.runs).toBe(2);
	});
});
