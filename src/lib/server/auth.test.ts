import { describe, test, expect } from 'vitest';
import { tokenFor, verifyToken, checkPin } from './auth';

describe('admin auth', () => {
	test('tokenFor is deterministic and pin-specific', () => {
		expect(tokenFor('1234')).toBe(tokenFor('1234'));
		expect(tokenFor('1234')).not.toBe(tokenFor('9999'));
	});

	test('verifyToken accepts a token minted from the same pin', () => {
		expect(verifyToken(tokenFor('1234'), '1234')).toBe(true);
	});

	test('verifyToken rejects a token minted from a different pin', () => {
		expect(verifyToken(tokenFor('1234'), '9999')).toBe(false);
	});

	test('verifyToken rejects tampered, empty, or missing values', () => {
		expect(verifyToken('deadbeef', '1234')).toBe(false);
		expect(verifyToken('', '1234')).toBe(false);
		expect(verifyToken(null, '1234')).toBe(false);
		expect(verifyToken(undefined, '1234')).toBe(false);
	});

	test('checkPin compares a candidate against the configured pin', () => {
		expect(checkPin('1234', '1234')).toBe(true);
		expect(checkPin('0000', '1234')).toBe(false);
		expect(checkPin('12345', '1234')).toBe(false);
	});

	test('an empty configured pin never verifies (gate treated as off elsewhere)', () => {
		expect(checkPin('', '')).toBe(false);
		expect(verifyToken(tokenFor(''), '')).toBe(false);
	});
});
