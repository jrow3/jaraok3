import { describe, test, expect } from 'vitest';
import { toSettingsPatch } from './settingsPatch';

describe('toSettingsPatch', () => {
	test('keeps a lyrics layout the TV knows', () => {
		expect(toSettingsPatch({ lyricsLayout: 'panel' })).toEqual({ lyricsLayout: 'panel' });
		expect(toSettingsPatch({ lyricsLayout: 'full' })).toEqual({ lyricsLayout: 'full' });
	});

	test('drops a lyrics layout the TV has no layout for', () => {
		expect(toSettingsPatch({ lyricsLayout: 'sideways' })).toEqual({});
		expect(toSettingsPatch({ lyricsLayout: true })).toEqual({});
	});

	test('keeps the host switches only as booleans', () => {
		expect(toSettingsPatch({ recsEnabled: false, isVibrationOn: 'no' })).toEqual({ recsEnabled: false });
	});

	test('keeps the join code switch', () => {
		expect(toSettingsPatch({ isJoinCodeShown: false })).toEqual({ isJoinCodeShown: false });
		expect(toSettingsPatch({ isJoinCodeShown: 'false' })).toEqual({});
	});

	test('keeps the time left switch', () => {
		expect(toSettingsPatch({ isTimeLeftShown: false })).toEqual({ isTimeLeftShown: false });
		expect(toSettingsPatch({ isTimeLeftShown: 'false' })).toEqual({});
	});

	test('keeps the Up next switch', () => {
		expect(toSettingsPatch({ isUpNextAlwaysShown: false })).toEqual({ isUpNextAlwaysShown: false });
		expect(toSettingsPatch({ isUpNextAlwaysShown: 'false' })).toEqual({});
	});

	test('keeps the singer theme switch', () => {
		expect(toSettingsPatch({ isSingerThemeShown: true })).toEqual({ isSingerThemeShown: true });
		expect(toSettingsPatch({ isSingerThemeShown: 'true' })).toEqual({});
	});

	test('keeps a TV theme the app has', () => {
		expect(toSettingsPatch({ tvTheme: 'classic' })).toEqual({ tvTheme: 'classic' });
	});

	test('drops a TV theme the app does not have', () => {
		expect(toSettingsPatch({ tvTheme: 'vaporwave' })).toEqual({});
		expect(toSettingsPatch({ tvTheme: ['tokyo'] })).toEqual({});
	});

	test('drops fields it does not know', () => {
		expect(toSettingsPatch({ isAdmin: true })).toEqual({});
	});
});
