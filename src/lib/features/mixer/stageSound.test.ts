import { describe, expect, it } from 'vitest';
import type { PartyHold, QueueItem } from '../../types';
import { DEFAULT_PARAMS } from './controls';
import { singerOnStage, stageParams, type StageSong } from './stageSound';

const song = (extra: Partial<QueueItem> = {}): QueueItem =>
	({ id: 'song-1', singer: 'Sam', owner: 'owner-1', ...extra }) as QueueItem;
const hold = {} as PartyHold;
const saved = () => ({ reverbTail: -5 });
const stage = (current: QueueItem | null, held: PartyHold | null = null): StageSong => ({
	current,
	hold: held
});

describe('singerOnStage', () => {
	it('gives the singer on stage when a guest song has a saved sound', () => {
		expect(singerOnStage(stage(song()), null, saved)).toEqual({
			songId: 'song-1',
			singer: 'Sam',
			owner: 'owner-1',
			isReset: false
		});
	});

	it('gives null when the saved sound is empty', () => {
		expect(singerOnStage(stage(song()), null, () => ({}))).toBeNull();
	});

	it('gives null during a hold', () => {
		expect(singerOnStage(stage(song(), hold), null, saved)).toBeNull();
	});

	it('gives null for a house sound song', () => {
		expect(singerOnStage(stage(song({ isHouseSound: true })), null, saved)).toBeNull();
	});

	it('gives null when the song has no owner', () => {
		expect(singerOnStage(stage(song({ owner: undefined })), null, saved)).toBeNull();
	});

	it('gives null when nothing is playing', () => {
		expect(singerOnStage(stage(null), null, saved)).toBeNull();
	});

	it('marks the singer reset when the reset song is the current one', () => {
		expect(singerOnStage(stage(song()), 'song-1', saved)?.isReset).toBe(true);
	});

	it('gives a reset singer even when their saved sound is empty', () => {
		expect(singerOnStage(stage(song()), 'song-1', () => ({}))).toEqual({
			songId: 'song-1',
			singer: 'Sam',
			owner: 'owner-1',
			isReset: true
		});
	});
});

describe('stageParams', () => {
	const singer = { songId: 'song-1', singer: 'Sam', owner: 'owner-1', isReset: false };

	it('returns the house sound with no singer', () => {
		expect(stageParams(DEFAULT_PARAMS, null, saved())).toBe(DEFAULT_PARAMS);
	});

	it('returns the house sound for a reset singer', () => {
		expect(stageParams(DEFAULT_PARAMS, { ...singer, isReset: true }, saved())).toBe(DEFAULT_PARAMS);
	});

	it("lays the singer's sound over the house and keeps host-only controls", () => {
		const result = stageParams(DEFAULT_PARAMS, singer, saved());
		expect(result.reverbTail).toBe(-5);
		expect(result.compRatio).toBe(DEFAULT_PARAMS.compRatio);
	});
});
