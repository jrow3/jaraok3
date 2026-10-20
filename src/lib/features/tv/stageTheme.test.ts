import { describe, test, expect } from 'vitest';
import type { DisplaySettings, PartyHold, QueueItem } from '../../types';
import { stageTheme } from './stageTheme';

const display = (isSingerThemeShown: boolean): DisplaySettings => ({
	lyricsLayout: 'full',
	isJoinCodeShown: true,
	isTimeLeftShown: true,
	isUpNextAlwaysShown: true,
	isSingerThemeShown,
	tvTheme: 'tokyo',
	musicLevel: 100
});

const song = (theme?: QueueItem['theme']): QueueItem => ({
	id: 'q1',
	source: 'local',
	songId: 1,
	artist: 'Artist',
	title: 'Title',
	singer: 'Priya',
	theme
});

const hold = (theme?: QueueItem['theme']): PartyHold => ({
	until: 15_000,
	next: { singer: 'Dave', title: 'B', artist: 'Artist', theme }
});

describe('stageTheme', () => {
	test('with the switch off, the TV keeps its own theme whoever is singing', () => {
		expect(stageTheme(display(false), { current: song('onair'), hold: null })).toBe('tokyo');
		expect(stageTheme(display(false), { current: song('onair'), hold: hold('disco') })).toBe('tokyo');
	});

	test('a song on stage wears its singer’s theme', () => {
		expect(stageTheme(display(true), { current: song('onair'), hold: null })).toBe('onair');
	});

	test('a song added with no theme falls back to the TV theme', () => {
		expect(stageTheme(display(true), { current: song(), hold: null })).toBe('tokyo');
	});

	test('the hold wears the next singer’s theme, or the TV theme when they have none', () => {
		expect(stageTheme(display(true), { current: song('onair'), hold: hold('disco') })).toBe('disco');
		expect(stageTheme(display(true), { current: song('onair'), hold: hold() })).toBe('tokyo');
	});

	test('an idle party keeps the TV theme', () => {
		expect(stageTheme(display(true), { current: null, hold: null })).toBe('tokyo');
	});
});
