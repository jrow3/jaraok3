import { describe, test, expect } from 'vitest';
import { queuePosition } from './queue';

describe('queuePosition', () => {
	const queue = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];

	test('returns the 1-based spot of an item in the waiting queue', () => {
		expect(queuePosition(queue, 'q1')).toBe(1);
		expect(queuePosition(queue, 'q3')).toBe(3);
	});

	test('returns 0 when the item is not waiting (playing or done)', () => {
		expect(queuePosition(queue, 'gone')).toBe(0);
		expect(queuePosition([], 'q1')).toBe(0);
	});
});
