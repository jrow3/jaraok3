import { describe, test, expect } from 'vitest';
import {
	parseSettings,
	orderBrands,
	addUniqueName,
	toggleId,
	tierOf,
	clampSongDelay,
	withLibraryBrands
} from './settingsModel';

describe('orderBrands', () => {
	test('keeps the saved order, drops brands that left the library, and appends new ones', () => {
		expect(orderBrands(['SC', 'SF', 'ZM'], ['SF', 'OLD', 'SC'])).toEqual(['SF', 'SC', 'ZM']);
	});
});

describe('parseSettings', () => {
	test('fills missing lists and flags with their defaults', () => {
		const data = parseSettings({
			brands: [{ tag: 'SC', count: 1200 }],
			settings: { brandPriority: [], brandTiers: { SC: 'green' }, songDelaySec: 5 }
		});
		expect(data).toEqual({
			brandPriority: ['SC'],
			brandCounts: { SC: 1200 },
			brandTiers: { SC: 'green' },
			songDelaySec: 5,
			ytChannelPriority: [],
			ytChannelBlocklist: [],
			starredSongIds: [],
			recsEnabled: true,
			isVibrationOn: true,
			lyricsLayout: 'full',
			isJoinCodeShown: true,
			isTimeLeftShown: true,
			isUpNextAlwaysShown: true,
			isSingerThemeShown: false,
			tvTheme: 'tokyo'
		});
	});

	test('a pause stored before the 30-second cap shows as the cap', () => {
		const data = parseSettings({
			brands: [],
			settings: { brandPriority: [], brandTiers: {}, songDelaySec: 120 }
		});
		expect(data.songDelaySec).toBe(30);
	});

	test('keeps the saved TV choices', () => {
		const data = parseSettings({
			brands: [],
			settings: {
				brandPriority: [],
				brandTiers: {},
				songDelaySec: 5,
				lyricsLayout: 'panel',
				isJoinCodeShown: false,
				isTimeLeftShown: false,
				isUpNextAlwaysShown: false,
				isSingerThemeShown: true,
				tvTheme: 'classic'
			}
		});
		expect(data.lyricsLayout).toBe('panel');
		expect(data.isJoinCodeShown).toBe(false);
		expect(data.isTimeLeftShown).toBe(false);
		expect(data.isUpNextAlwaysShown).toBe(false);
		expect(data.isSingerThemeShown).toBe(true);
		expect(data.tvTheme).toBe('classic');
	});

	test('a stored TV theme the app no longer has shows as the default, as the TV does', () => {
		const data = parseSettings({
			brands: [],
			settings: { brandPriority: [], brandTiers: {}, songDelaySec: 5, tvTheme: 'vaporwave' }
		});
		expect(data.tvTheme).toBe('tokyo');
	});
});

describe('withLibraryBrands', () => {
	test('takes the rescanned brands and keeps every setting the host has on screen', () => {
		const onScreen = {
			...parseSettings({
				brands: [
					{ tag: 'SC', count: 10 },
					{ tag: 'OLD', count: 3 }
				],
				settings: { brandPriority: ['SC', 'OLD'], brandTiers: {}, songDelaySec: 5 }
			}),
			brandPriority: ['OLD', 'SC'],
			brandTiers: { SC: 'red' as const },
			recsEnabled: false
		};
		const data = withLibraryBrands(onScreen, [
			{ tag: 'SC', count: 12 },
			{ tag: 'NEW', count: 4 }
		]);
		expect(data).toEqual({
			...onScreen,
			brandPriority: ['SC', 'NEW'],
			brandCounts: { SC: 12, NEW: 4 }
		});
	});
});

describe('addUniqueName', () => {
	test('adds a trimmed name', () => {
		expect(addUniqueName(['Sing King'], '  EdKara ')).toEqual(['Sing King', 'EdKara']);
	});

	test('ignores blanks and duplicates in any letter case', () => {
		expect(addUniqueName(['Sing King'], '   ')).toBeNull();
		expect(addUniqueName(['Sing King'], 'sing king')).toBeNull();
	});
});

describe('toggleId', () => {
	test('adds a missing id and removes a present one', () => {
		expect(toggleId([1, 2], 3)).toEqual([1, 2, 3]);
		expect(toggleId([1, 2], 1)).toEqual([2]);
	});
});

describe('tierOf', () => {
	test('an unrated brand counts as yellow', () => {
		expect(tierOf({ SC: 'green' }, 'SC')).toBe('green');
		expect(tierOf({ SC: 'green' }, 'XX')).toBe('yellow');
	});
});

describe('clampSongDelay', () => {
	test('keeps the pause between songs to whole seconds from 0 to 30', () => {
		expect(clampSongDelay(-3)).toBe(0);
		expect(clampSongDelay(4.6)).toBe(5);
		expect(clampSongDelay(99)).toBe(30);
	});
});
