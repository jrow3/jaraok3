import { describe, test, expect } from 'vitest';
import type { QueueItem } from '../../types';
import { upNextSongs, downloadNote, describeJustAdded, latestArrival } from './upNext';

const song = (id: string, singer: string, status?: QueueItem['status']): QueueItem => ({
	id,
	source: 'local',
	songId: 1,
	artist: 'Artist',
	title: `Song ${id}`,
	singer,
	status
});

describe('upNextSongs', () => {
	test('names the next two songs that can play, passing over downloads like the server does', () => {
		const queue = [song('a', 'Sam', 'downloading'), song('b', 'Dee', 'failed'), song('c', 'Priya', 'ready'), song('d', 'Jo'), song('e', 'Al')];
		expect(upNextSongs(queue, 2).map((item) => item.id)).toEqual(['c', 'd']);
	});

	test('names one song when only one waits', () => {
		expect(upNextSongs([song('a', 'Sam', 'downloading'), song('b', 'Jo')], 2).map((item) => item.id)).toEqual(['b']);
	});

	test('is empty when nothing in line can play', () => {
		expect(upNextSongs([song('a', 'Sam', 'downloading')], 2)).toEqual([]);
		expect(upNextSongs([], 2)).toEqual([]);
	});
});

describe('downloadNote', () => {
	test('names the first song still waiting on its download', () => {
		expect(downloadNote([song('a', 'Jo'), song('b', 'Sam', 'downloading'), song('c', 'Dee', 'downloading')])).toEqual({
			text: 'Sam\u2019s song is down\u00adloading, plays when ready',
			isFailed: false
		});
	});

	test('says when a download failed, and is null when none is pending', () => {
		expect(downloadNote([song('a', 'Sam', 'failed')])).toEqual({ text: 'Sam\u2019s song couldn\u2019t download', isFailed: true });
		expect(downloadNote([song('a', 'Jo'), song('b', 'Dee', 'ready')])).toBeNull();
	});
});

describe('describeJustAdded', () => {
	test('reads the singer and place in line from the live queue, so a rename shows at once', () => {
		const queue = [song('a', 'Jo'), { ...song('b', 'Sam'), singer: 'Samantha' }];
		expect(describeJustAdded('b', queue)).toEqual({ id: 'b', singer: 'Samantha', title: 'Song b', position: 2 });
	});

	test('is null once the song has left the queue, or when there is none', () => {
		expect(describeJustAdded('gone', [song('a', 'Jo')])).toBeNull();
		expect(describeJustAdded(null, [song('a', 'Jo')])).toBeNull();
	});
});

describe('latestArrival', () => {
	test('names the last id in line that was never seen', () => {
		expect(latestArrival(new Set(['a']), ['b', 'a', 'c'])).toBe('c');
	});

	test('a song back from an undone skip or removal was seen before, so nothing is new', () => {
		expect(latestArrival(new Set(['a', 'b', 'c']), ['c', 'a'])).toBeUndefined();
	});
});
