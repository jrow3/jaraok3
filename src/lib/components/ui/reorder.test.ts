import { describe, test, expect } from 'vitest';
import { moveBy, moveBefore } from './reorder';

describe('moveBy', () => {
	test('moves an item one step up or down', () => {
		expect(moveBy(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c']);
		expect(moveBy(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b']);
	});

	test('returns null at either end, so nothing is saved', () => {
		expect(moveBy(['a', 'b'], 0, -1)).toBeNull();
		expect(moveBy(['a', 'b'], 1, 1)).toBeNull();
	});

	test('leaves the original list alone', () => {
		const list = ['a', 'b'];
		moveBy(list, 0, 1);
		expect(list).toEqual(['a', 'b']);
	});
});

describe('moveBefore', () => {
	test('dropping on a later row lands just above it', () => {
		expect(moveBefore(['a', 'b', 'c', 'd'], 0, 3)).toEqual(['b', 'c', 'a', 'd']);
	});

	test('dropping on an earlier row lands just above it', () => {
		expect(moveBefore(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
	});

	test('dropping on itself or on the row below changes nothing', () => {
		expect(moveBefore(['a', 'b', 'c'], 1, 1)).toBeNull();
		expect(moveBefore(['a', 'b', 'c'], 0, 1)).toBeNull();
	});
});
