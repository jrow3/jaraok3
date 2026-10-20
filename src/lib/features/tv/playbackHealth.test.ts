import { describe, test, expect } from 'vitest';
import { STALL_LIMIT_MS, startWatch, noteTime, hasStalled, failureMessage, isEmbedBlocked } from './playbackHealth';

describe('the stall watch', () => {
	test('time moving forward restarts the clock', () => {
		const watch = noteTime(startWatch(0), 1.5, 9000);
		expect(watch).toEqual({ lastTime: 1.5, lastMovedAt: 9000 });
		expect(hasStalled(watch, 9000 + STALL_LIMIT_MS - 1)).toBe(false);
	});

	test('a frozen time does not', () => {
		const moving = noteTime(startWatch(0), 1.5, 1000);
		expect(noteTime(moving, 1.5, 8000)).toBe(moving);
	});

	// A host restart bumps playKey and starts a fresh watch, so a jump back on the same
	// watch is a player looping over a bad spot, not a song moving on.
	test('a backward jump does not either', () => {
		const moving = noteTime(startWatch(0), 1.5, 1000);
		expect(noteTime(moving, 0.5, 8000)).toBe(moving);
	});

	test('the first report at time 0 counts as progress', () => {
		expect(noteTime(startWatch(0), 0, 4000)).toEqual({ lastTime: 0, lastMovedAt: 4000 });
	});

	test('stalls once the limit passes with no progress', () => {
		expect(hasStalled(startWatch(1000), 1000 + STALL_LIMIT_MS - 1)).toBe(false);
		expect(hasStalled(startWatch(1000), 1000 + STALL_LIMIT_MS)).toBe(true);
	});
});

describe('failureMessage', () => {
	test('names the song and says the TV moves on', () => {
		expect(failureMessage('Mr. Brightside', false)).toBe('Couldn\u2019t play Mr. Brightside, skipping');
	});
});

describe('a song the TV could not play', () => {
	const youtube = { source: 'youtube' as const, ytId: 'pi-Odu9CDmw' };

	test.each([101, 150])('YouTube error %i means its owner turned off embedding', (code) => {
		expect(isEmbedBlocked(youtube, code)).toBe(true);
	});

	test.each([2, 5, 100])('YouTube error %i is a plain failure', (code) => {
		expect(isEmbedBlocked(youtube, code)).toBe(false);
	});

	test('a local song that fails is a plain failure', () => {
		expect(isEmbedBlocked({ source: 'local-video' }, undefined)).toBe(false);
	});

	test('a YouTube song without a video id cannot be downloaded instead', () => {
		expect(isEmbedBlocked({ source: 'youtube' }, 150)).toBe(false);
	});

	test('the TV says an embed-blocked song is downloading instead of skipping', () => {
		expect(failureMessage('Lose Yourself', true)).toBe('Downloading Lose Yourself, plays when ready');
	});
});
