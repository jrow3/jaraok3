import { describe, test, expect } from 'vitest';
import type { QueueItem } from '../../types';
import { passedOver, movedAheadNote } from './movedAhead';

const song = (id: string, singer: string, status?: QueueItem['status']): QueueItem => ({
	id,
	source: 'local',
	songId: 1,
	artist: 'Artist',
	title: 'Title',
	singer,
	status
});

describe('passedOver', () => {
	test('lists the downloading songs that were ahead of the song now on stage', () => {
		const before = [song('a', 'Sam', 'downloading'), song('b', 'Dee', 'ready'), song('c', 'Priya'), song('d', 'Jo', 'downloading')];
		expect(passedOver(before, 'c').map((item) => item.id)).toEqual(['a']);
	});

	test('a song that was first in line passed no one', () => {
		expect(passedOver([song('a', 'Priya'), song('b', 'Sam', 'downloading')], 'a')).toEqual([]);
	});

	test('a song the TV never saw in line passed no one', () => {
		expect(passedOver([song('a', 'Sam', 'downloading')], 'zzz')).toEqual([]);
	});
});

describe('movedAheadNote', () => {
	test('names the one singer who was passed', () => {
		expect(movedAheadNote('Priya', [song('a', 'Sam', 'downloading')])).toEqual({
			title: 'Priya goes first',
			detail: 'Sam\u2019s song is still down\u00adloading'
		});
	});

	test('counts several', () => {
		const passed = [song('a', 'Sam', 'downloading'), song('b', 'Dee', 'downloading')];
		expect(movedAheadNote('Priya', passed).detail).toBe('2 songs are still down\u00adloading');
	});
});
