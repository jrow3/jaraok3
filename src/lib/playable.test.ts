import { describe, test, expect } from 'vitest';
import { isPlayable } from './playable';

describe('isPlayable', () => {
	test('a song with no download status can play', () => {
		expect(isPlayable({})).toBe(true);
	});
	test('a finished download can play', () => {
		expect(isPlayable({ status: 'ready' })).toBe(true);
	});
	test('a song still downloading cannot play', () => {
		expect(isPlayable({ status: 'downloading' })).toBe(false);
	});
	test('a failed download cannot play', () => {
		expect(isPlayable({ status: 'failed' })).toBe(false);
	});
});
