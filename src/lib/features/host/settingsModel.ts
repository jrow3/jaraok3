import type { LyricsLayout, Tier } from '../../types';
import { DEFAULT_TV_THEME, isThemeId, type ThemeId } from '../../themes/themes';

export interface Brand {
	tag: string;
	count: number;
}

export interface SettingsFields {
	brandPriority: string[];
	brandTiers: Record<string, Tier>;
	songDelaySec: number;
	ytChannelPriority: string[];
	ytChannelBlocklist: string[];
	starredSongIds: number[];
	recsEnabled: boolean;
	isVibrationOn: boolean;
	lyricsLayout: LyricsLayout;
	isJoinCodeShown: boolean;
	isTimeLeftShown: boolean;
	isUpNextAlwaysShown: boolean;
	isSingerThemeShown: boolean;
	tvTheme: ThemeId;
}

export interface HostSettingsData extends SettingsFields {
	brandCounts: Record<string, number>;
}

interface SettingsResponse {
	brands: Brand[];
	// tvTheme is a string: the stored theme may since have been removed from the app.
	settings: Pick<SettingsFields, 'brandPriority' | 'brandTiers' | 'songDelaySec'> &
		Partial<Omit<SettingsFields, 'tvTheme'>> & { tvTheme?: string };
}

export function orderBrands(tags: string[], saved: string[]): string[] {
	const known = saved.filter((tag) => tags.includes(tag));
	return [...known, ...tags.filter((tag) => !known.includes(tag))];
}

export function parseSettings({ brands, settings }: SettingsResponse): HostSettingsData {
	return {
		brandPriority: orderBrands(
			brands.map((brand) => brand.tag),
			settings.brandPriority
		),
		brandCounts: Object.fromEntries(brands.map((brand) => [brand.tag, brand.count])),
		brandTiers: { ...settings.brandTiers },
		songDelaySec: clampSongDelay(settings.songDelaySec),
		ytChannelPriority: [...(settings.ytChannelPriority ?? [])],
		ytChannelBlocklist: [...(settings.ytChannelBlocklist ?? [])],
		starredSongIds: [...(settings.starredSongIds ?? [])],
		recsEnabled: settings.recsEnabled ?? true,
		isVibrationOn: settings.isVibrationOn ?? true,
		lyricsLayout: settings.lyricsLayout ?? 'full',
		isJoinCodeShown: settings.isJoinCodeShown ?? true,
		isTimeLeftShown: settings.isTimeLeftShown ?? true,
		isUpNextAlwaysShown: settings.isUpNextAlwaysShown ?? true,
		isSingerThemeShown: settings.isSingerThemeShown ?? false,
		tvTheme: isThemeId(settings.tvTheme) ? settings.tvTheme : DEFAULT_TV_THEME
	};
}

// After a rescan only the library's brands change. The host's settings on screen may
// still be saving or have failed, so a reload of them would lose that change.
export function withLibraryBrands(data: HostSettingsData, brands: Brand[]): HostSettingsData {
	return {
		...data,
		brandPriority: orderBrands(
			brands.map((brand) => brand.tag),
			data.brandPriority
		),
		brandCounts: Object.fromEntries(brands.map((brand) => [brand.tag, brand.count]))
	};
}

export function addUniqueName(list: string[], text: string): string[] | null {
	const name = text.trim();
	if (!name || list.some((existing) => existing.toLowerCase() === name.toLowerCase())) return null;
	return [...list, name];
}

export function toggleId(list: number[], id: number): number[] {
	return list.includes(id) ? list.filter((existing) => existing !== id) : [...list, id];
}

// A brand without a rating ranks as yellow, here and in the server's search.
export const tierOf = (tiers: Record<string, Tier>, tag: string): Tier => tiers[tag] ?? 'yellow';

export const MAX_SONG_DELAY_SEC = 30;

// The TV's "Up next" hold before each song: a party can't wait more than half a
// minute for a singer, and 0 turns it off.
export function clampSongDelay(seconds: number): number {
	return Math.min(MAX_SONG_DELAY_SEC, Math.max(0, Math.round(seconds)));
}
