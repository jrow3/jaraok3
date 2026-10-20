import { describe, test, expect } from 'vitest';
import { powerLook } from './powerButton';

describe('powerLook', () => {
	test('reads on only once a TV screen has connected', () => {
		expect(powerLook({ isOn: true, isTvConnected: false }, false)).toBe('starting');
		expect(powerLook({ isOn: true, isTvConnected: true }, false)).toBe('on');
	});

	test('reads off whatever screens are open, unknown until the server says, and asks on the first tap', () => {
		expect(powerLook({ isOn: false, isTvConnected: true }, false)).toBe('off');
		expect(powerLook(null, false)).toBe('unknown');
		expect(powerLook({ isOn: true, isTvConnected: true }, true)).toBe('confirming');
	});
});
