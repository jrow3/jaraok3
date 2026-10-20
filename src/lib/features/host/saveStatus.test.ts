import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSaver, sectionFields, sectionOf, SAVED_SHOW_MS, type SaveSection, type SaveState } from './saveStatus';
import type { SettingsFields } from './settingsModel';

type Send = (patch: Partial<SettingsFields>) => Promise<number>;

function setup(send: Send) {
	const states: Partial<Record<SaveSection, SaveState>> = {};
	return { states, saver: createSaver(states, send) };
}

describe('sections', () => {
	test('a change belongs to the section whose heading shows it', () => {
		expect(sectionOf({ brandTiers: {} })).toBe('brands');
		expect(sectionOf({ songDelaySec: 3 })).toBe('playback');
		expect(sectionOf({ ytChannelBlocklist: [] })).toBe('hidden');
		expect(sectionOf({ lyricsLayout: 'panel' })).toBe('tv');
	});

	test('a retry sends every field of its section', () => {
		const data: SettingsFields = {
			brandPriority: ['SC'],
			brandTiers: {},
			songDelaySec: 5,
			ytChannelPriority: [],
			ytChannelBlocklist: [],
			starredSongIds: [],
			recsEnabled: false,
			isVibrationOn: true,
			lyricsLayout: 'full',
			isJoinCodeShown: false,
			isTimeLeftShown: true,
			isUpNextAlwaysShown: true,
			isSingerThemeShown: true,
			tvTheme: 'tokyo'
		};
		expect(sectionFields('guests', data)).toEqual({ recsEnabled: false, isVibrationOn: true });
		expect(sectionFields('tv', data)).toEqual({
			lyricsLayout: 'full',
			isJoinCodeShown: false,
			isTimeLeftShown: true,
			isUpNextAlwaysShown: true,
			isSingerThemeShown: true,
			tvTheme: 'tokyo'
		});
	});
});

describe('createSaver', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	test('shows saving, then saved for a moment, then nothing', async () => {
		const { states, saver } = setup(async () => 200);
		const pending = saver.save({ recsEnabled: false });
		expect(states.guests).toBe('saving');
		expect(await pending).toBe('saved');
		expect(states.guests).toBe('saved');
		vi.advanceTimersByTime(SAVED_SHOW_MS);
		expect(states.guests).toBeUndefined();
	});

	test('a failed save stays failed', async () => {
		const { states, saver } = setup(async () => 500);
		expect(await saver.save({ brandPriority: [] })).toBe('failed');
		vi.advanceTimersByTime(SAVED_SHOW_MS);
		expect(states.brands).toBe('failed');
	});

	test('no connection counts as a failed save', async () => {
		const { states, saver } = setup(async () => {
			throw new TypeError('Failed to fetch');
		});
		expect(await saver.save({ ytChannelPriority: [] })).toBe('failed');
		expect(states).toEqual({ channels: 'failed' });
	});

	test('an expired PIN session is reported so the page can ask again', async () => {
		const { saver } = setup(async () => 401);
		expect(await saver.save({ recsEnabled: true })).toBe('expired');
	});

	test('clearing drops every heading, so a fresh settings load shows no stale failure', async () => {
		const { states, saver } = setup(async () => 401);
		await saver.save({ recsEnabled: true });
		saver.clear();
		expect(states).toEqual({});
	});

	test('a slower answer to an older save never overwrites a newer one', async () => {
		let finishFirst: (status: number) => void = () => {};
		const send = vi
			.fn<Send>()
			.mockImplementationOnce(() => new Promise((resolve) => (finishFirst = resolve)))
			.mockImplementationOnce(async () => 200);
		const { states, saver } = setup(send);
		const first = saver.save({ songDelaySec: 4 });
		await saver.save({ songDelaySec: 3 });
		finishFirst(500);
		await first;
		expect(states.playback).toBe('saved');
	});
});
