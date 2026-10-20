import { describe, test, expect } from 'vitest';
import { newArrivals } from './newArrivals';

describe('newArrivals', () => {
	test('nothing is new on the first look', () => {
		expect(newArrivals(null, ['a', 'b'])).toEqual([]);
	});

	test('reports ids that were not there before, in line order', () => {
		expect(newArrivals(['a'], ['b', 'a', 'c'])).toEqual(['b', 'c']);
	});

	test('a reorder or a removal adds nothing', () => {
		expect(newArrivals(['a', 'b', 'c'], ['c', 'a'])).toEqual([]);
	});
});
