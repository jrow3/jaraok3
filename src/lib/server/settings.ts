import type Database from 'better-sqlite3';
import type { DisplaySettings, LyricsLayout, PartySettings, Tier } from '../types';
import { clampSongDelay } from '../features/host/settingsModel';
import { DEFAULT_TV_THEME, isThemeId, type ThemeId } from '../themes/themes';
import { DEFAULT_MIXER, toMixerState, type MixerState } from '../features/mixer/presets';

// Reputation-seeded quality tiers per karaoke brand (green = accurate original-
// style backing + timing; red = covers / poor timing). Anything unlisted is
// treated as yellow. The host edits these in Settings.
export const DEFAULT_TIERS: Record<string, Tier> = {
	// green — reputable licensed brands, accurate original-style + tight timing
	'SC Karaoke': 'green', // Sound Choice
	'SF Karaoke': 'green', // Sunfly
	'CB Karaoke': 'green', // Chartbuster
	'Z Karaoke': 'green', // Zoom
	'MM Karaoke': 'green', // Music Maestro
	'PS Karaoke': 'green', // Pocket Songs
	'KV Karaoke': 'green', // Karaoke Version (KaraFun / Recisio)
	'DK Karaoke': 'green', // DKKaraoke
	'MF Karaoke': 'green', // Music Factory
	'SBI Karaoke': 'green', // SBI Audio
	'TT Karaoke': 'green', // Top Tunes
	// red — budget covers / documented poor timing
	'NU Karaoke': 'red', // NuTech
	'SGB Karaoke': 'red' // Sweet Georgia Brown
	// everything else defaults to yellow
};

export interface Settings {
	brandPriority: string[];
	brandTiers: Record<string, Tier>;
	songDelaySec: number;
	ytChannelPriority: string[];
	ytChannelBlocklist: string[];
	starredSongIds: number[];
	recsEnabled: boolean;
	/** Guests' phones may buzz when they're next (each phone can still turn it off). */
	isVibrationOn: boolean;
	lyricsLayout: LyricsLayout;
	/** The TV shows the join code in a corner while a song plays. */
	isJoinCodeShown: boolean;
	/** The TV shows the time left in the song, bottom right. */
	isTimeLeftShown: boolean;
	/** Over a video, Up next stays the whole song; off, it shows only at the start and near the end. */
	isUpNextAlwaysShown: boolean;
	/** The TV wears each singer's phone theme during their song, instead of its own. */
	isSingerThemeShown: boolean;
	/** The TV's theme; each phone picks its own. */
	tvTheme: ThemeId;
	/** The Sound tab: saved over the socket only, never through POST /api/settings. */
	mixer: MixerState;
}

const DEFAULTS: Settings = {
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
	tvTheme: DEFAULT_TV_THEME,
	mixer: DEFAULT_MIXER
};

function ensure(db: Database.Database): void {
	db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)');
}

export function getSettings(db: Database.Database): Settings {
	ensure(db);
	const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
	const stored: Record<string, unknown> = {};
	for (const { key, value } of rows) stored[key] = JSON.parse(value);
	return { ...DEFAULTS, ...stored } as Settings;
}

export function setSettings(db: Database.Database, partial: Partial<Settings>): Settings {
	ensure(db);
	const upsert = db.prepare(
		'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
	);
	const tx = db.transaction((entries: [string, unknown][]) => {
		for (const [key, value] of entries) upsert.run(key, JSON.stringify(value));
	});
	tx(Object.entries(partial));
	return getSettings(db);
}

// The pause the TV holds before each song. Capped here too, because a value stored
// before the settings API capped it (say 120) would otherwise still hold for minutes.
export function songHoldMs(db: Database.Database): number {
	return clampSongDelay(getSettings(db).songDelaySec) * 1000;
}

// What any phone may read through GET /api/party-settings, which needs no PIN, so
// nothing else in the settings table leaks.
export function partySettings(settings: Settings): PartySettings {
	return { isVibrationOn: settings.isVibrationOn };
}

// A stored theme may since have been removed from the app; the TV still needs one.
export function displaySettings(settings: Settings): DisplaySettings {
	return {
		lyricsLayout: settings.lyricsLayout,
		isJoinCodeShown: settings.isJoinCodeShown,
		isTimeLeftShown: settings.isTimeLeftShown,
		isUpNextAlwaysShown: settings.isUpNextAlwaysShown,
		isSingerThemeShown: settings.isSingerThemeShown,
		tvTheme: isThemeId(settings.tvTheme) ? settings.tvTheme : DEFAULT_TV_THEME,
		musicLevel: toMixerState(settings.mixer).live.musicLevel
	};
}

export interface Brand {
	tag: string;
	count: number;
}

export function getBrands(db: Database.Database, limit = 60): Brand[] {
	return db
		.prepare(
			`SELECT disc_tag AS tag, COUNT(*) AS count FROM songs
			 WHERE disc_tag IS NOT NULL AND disc_tag != ''
			 GROUP BY disc_tag ORDER BY count DESC, tag ASC LIMIT ?`
		)
		.all(limit) as Brand[];
}
