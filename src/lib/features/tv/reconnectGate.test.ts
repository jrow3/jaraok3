import { describe, test, expect } from 'vitest';
import { createReconnectGate } from './reconnectGate';

describe('createReconnectGate', () => {
	test('the first snapshot re-seeds and the ones after it are judged', () => {
		const check = createReconnectGate<object>();
		expect(check({}, true)).toBe('reseed');
		expect(check({}, true)).toBe('judge');
	});

	test('waits while offline and through the connect, then re-seeds on the fresh snapshot', () => {
		const check = createReconnectGate<object>();
		check({}, true);
		const held = {};
		expect(check(held, false)).toBe('wait');
		expect(check(held, true)).toBe('wait');
		expect(check({}, true)).toBe('reseed');
		expect(check({}, true)).toBe('judge');
	});
});
