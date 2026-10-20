import { describe, test, expect } from 'vitest';
import { buildSuggestRequest } from './suggestions';
import type { PartySnapshot, QueueItem } from '../../types';

const item = (id: string, title: string, songId?: number): QueueItem => ({
	id,
	source: 'local',
	songId,
	artist: 'ABBA',
	title,
	singer: 'Sam'
});
const party = (overrides: Partial<PartySnapshot>): PartySnapshot => ({
	current: null,
	isPlaying: false,
	queue: [],
	history: [],
	playKey: 0,
	sungCount: 0,
	sung: [],
	ended: [],
	hold: null,
	...overrides
});

describe('buildSuggestRequest', () => {
	test('seeds from the phone’s picks and tonight’s songs, one entry per song', () => {
		const request = buildSuggestRequest(party({ current: item('a', 'Waterloo', 1), history: [item('b', 'SOS', 2)] }), [
			{ songId: 1, artist: 'abba', title: 'WATERLOO' },
			{ songId: 9, artist: 'Queen', title: 'Bohemian Rhapsody' }
		]);
		expect(request.seed).toEqual([
			{ artist: 'ABBA', title: 'Waterloo', songId: 1 },
			{ songId: 9, artist: 'Queen', title: 'Bohemian Rhapsody' },
			{ artist: 'ABBA', title: 'SOS', songId: 2 }
		]);
	});

	test('excludes what is playing or queued, and everything sung tonight', () => {
		const request = buildSuggestRequest(
			party({
				current: item('a', 'Waterloo', 1),
				queue: [item('b', 'SOS'), item('c', 'Fernando', 3)],
				sung: ['queen|bohemian rhapsody']
			})
		);
		expect(request.exclude).toEqual([1, 3]);
		expect(request.excludeKeys).toEqual(['queen|bohemian rhapsody', 'abba|waterloo', 'abba|sos', 'abba|fernando']);
	});

	test('sends at most 20 seeds', () => {
		const history = Array.from({ length: 25 }, (_, index) => item(`h${index}`, `Song ${index}`));
		expect(buildSuggestRequest(party({ history })).seed).toHaveLength(20);
	});
});
