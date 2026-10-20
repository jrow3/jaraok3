import { describe, test, expect } from 'vitest';
import { soundStatus } from './soundStatus';
import type { PartyHold, QueueItem } from '../../types';
import type { SingerStage } from '../mixer/stageSound';

const ME = 'tag-me';
const song = (owner: string, isHouseSound?: boolean): QueueItem => ({
	id: 'song-1',
	source: 'local',
	artist: 'ABBA',
	title: 'Waterloo',
	singer: 'Sam',
	owner,
	isHouseSound
});
const HOLD: PartyHold = { until: 0, next: { singer: 'Sam', title: 'Waterloo', artist: 'ABBA' } };
const stage = (overrides: Partial<SingerStage> = {}): SingerStage => ({
	songId: 'song-1',
	singer: 'Sam',
	owner: ME,
	isReset: false,
	...overrides
});

describe('soundStatus', () => {
	test('is live while your own song is on', () => {
		expect(soundStatus({ current: song(ME), hold: null }, ME, stage())).toBe('live');
	});

	test('is reset when the host reset your sound for the song on stage', () => {
		expect(soundStatus({ current: song(ME), hold: null }, ME, stage({ isReset: true }))).toBe('reset');
	});

	test('is live when a reset was for an earlier song', () => {
		expect(soundStatus({ current: song(ME), hold: null }, ME, stage({ songId: 'song-0', isReset: true }))).toBe('live');
	});

	test('is saved when someone else is singing', () => {
		expect(soundStatus({ current: song('them'), hold: null }, ME, stage({ owner: 'them' }))).toBe('saved');
	});

	test('is saved while your song waits in a hold', () => {
		expect(soundStatus({ current: song(ME), hold: HOLD }, ME, null)).toBe('saved');
	});

	test('is saved during your song the host added with the house sound', () => {
		expect(soundStatus({ current: song(ME, true), hold: null }, ME, null)).toBe('saved');
	});
});
