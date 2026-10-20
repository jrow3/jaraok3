import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { getSettings, setSettings, getBrands, partySettings, displaySettings, songHoldMs, DEFAULT_TIERS } from './settings';
import { buildIndex } from './library';
import type { ThemeId } from '../themes/themes';
import { DEFAULT_MIXER } from '../features/mixer/presets';

describe('settings store', () => {
	let db: Database.Database;
	beforeEach(() => {
		db = new Database(':memory:');
	});
	afterEach(() => db.close());

	test('returns defaults on an empty database', () => {
		expect(getSettings(db)).toEqual({
			brandPriority: [],
			brandTiers: DEFAULT_TIERS,
			songDelaySec: 5,
			ytChannelPriority: ['Sing King', 'EdKara', 'Musisi Karaoke'],
			ytChannelBlocklist: [],
			starredSongIds: [],
			recsEnabled: true,
			isVibrationOn: true,
			lyricsLayout: 'full',
			isJoinCodeShown: true,
			isTimeLeftShown: true,
			isUpNextAlwaysShown: true,
			isSingerThemeShown: false,
			tvTheme: 'tokyo',
			mixer: DEFAULT_MIXER
		});
	});

	test('a pause stored before the cap is held to 30 seconds', () => {
		setSettings(db, { songDelaySec: 120 });
		expect(songHoldMs(db)).toBe(30_000);
	});

	test('round-trips a brand priority list', () => {
		setSettings(db, { brandPriority: ['SF Karaoke', 'SC Karaoke'] });
		expect(getSettings(db).brandPriority).toEqual(['SF Karaoke', 'SC Karaoke']);
	});

	test('a partial update leaves other settings untouched', () => {
		setSettings(db, { brandPriority: ['KaraFun'] });
		setSettings(db, { songDelaySec: 8 });
		expect(getSettings(db)).toEqual({
			brandPriority: ['KaraFun'],
			brandTiers: DEFAULT_TIERS,
			songDelaySec: 8,
			ytChannelPriority: ['Sing King', 'EdKara', 'Musisi Karaoke'],
			ytChannelBlocklist: [],
			starredSongIds: [],
			recsEnabled: true,
			isVibrationOn: true,
			lyricsLayout: 'full',
			isJoinCodeShown: true,
			isTimeLeftShown: true,
			isUpNextAlwaysShown: true,
			isSingerThemeShown: false,
			tvTheme: 'tokyo',
			mixer: DEFAULT_MIXER
		});
	});

	test('guests can read only the vibration switch', () => {
		setSettings(db, { isVibrationOn: false });
		expect(partySettings(getSettings(db))).toEqual({ isVibrationOn: false });
	});

	test('the TV reads only its own display choices', () => {
		setSettings(db, {
			lyricsLayout: 'panel',
			isJoinCodeShown: false,
			isTimeLeftShown: false,
			isUpNextAlwaysShown: false,
			isSingerThemeShown: true,
			isVibrationOn: false,
			tvTheme: 'classic'
		});
		expect(displaySettings(getSettings(db))).toEqual({
			lyricsLayout: 'panel',
			isJoinCodeShown: false,
			isTimeLeftShown: false,
			isUpNextAlwaysShown: false,
			isSingerThemeShown: true,
			tvTheme: 'classic',
			musicLevel: 100
		});
	});

	test('the TV plays songs at the Sound tab Music level', () => {
		setSettings(db, { mixer: { ...DEFAULT_MIXER, live: { ...DEFAULT_MIXER.live, musicLevel: 40 } } });
		expect(displaySettings(getSettings(db)).musicLevel).toBe(40);
	});

	test('a stored TV theme the app no longer has gives the TV the default', () => {
		setSettings(db, { tvTheme: 'retired' as ThemeId });
		expect(displaySettings(getSettings(db)).tvTheme).toBe('tokyo');
	});
});

describe('getBrands', () => {
	let dir: string;
	let db: Database.Database;
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'karaoke-brands-'));
		const touch = (name: string) => writeFileSync(join(dir, name), '');
		touch('A - One [SF Karaoke].mp3');
		touch('A - One [SF Karaoke].cdg');
		touch('B - Two [SF Karaoke].mp3');
		touch('B - Two [SF Karaoke].cdg');
		touch('C - Three [SC Karaoke].mp3');
		touch('C - Three [SC Karaoke].cdg');
		const dbPath = join(dir, 'index.db');
		buildIndex({ libraryPath: dir, dbPath });
		db = new Database(dbPath, { readonly: true });
	});
	afterEach(() => {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	});

	test('lists distinct disc tags with counts, most common first', () => {
		const brands = getBrands(db);
		expect(brands[0]).toEqual({ tag: 'SF Karaoke', count: 2 });
		expect(brands).toContainEqual({ tag: 'SC Karaoke', count: 1 });
	});
});
