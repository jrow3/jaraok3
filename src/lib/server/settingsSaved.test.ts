import { describe, test, expect, vi } from 'vitest';
import { announceSettingsSaved, onSettingsSaved } from './settingsSaved';

describe('settings saved signal', () => {
	test('a listener hears each save until it stops listening', () => {
		const listener = vi.fn();
		const stop = onSettingsSaved(listener);
		announceSettingsSaved();
		stop();
		announceSettingsSaved();
		expect(listener).toHaveBeenCalledTimes(1);
	});
});
