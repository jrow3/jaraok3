import { describe, test, expect } from 'vitest';
import { isNearEnd, remainingLabel } from './progress';

describe('isNearEnd', () => {
	test('turns on in the last 30 seconds', () => {
		expect(isNearEnd(200, 240)).toBe(false);
		expect(isNearEnd(211, 240)).toBe(true);
	});

	test('stays off until the player knows the length', () => {
		expect(isNearEnd(0, 0)).toBe(false);
	});
});

describe('remainingLabel', () => {
	test('shows minutes and seconds left, never below zero', () => {
		expect(remainingLabel(54.6, 240)).toBe('3:05');
		expect(remainingLabel(241, 240)).toBe('0:00');
	});

	test('a negative time still gives a well-formed label, counted from the full length', () => {
		expect(remainingLabel(-5, 240)).toBe('4:05');
	});

	test('reads zero until the player knows the length', () => {
		expect(remainingLabel(0, 0)).toBe('0:00');
		expect(remainingLabel(12, 0)).toBe('0:00');
	});
});
