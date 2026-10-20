import type { Tier } from '../types';
import type { Settings } from './settings';
import { clampSongDelay } from '../features/host/settingsModel';
import { isThemeId } from '../themes/themes';

// Only fields named here reach the settings table; a field the host page sends that
// isn't listed is dropped without an error, so every new setting needs its line here.
export function toSettingsPatch(body: Record<string, unknown>): Partial<Settings> {
	const patch: Partial<Settings> = {};
	if (Array.isArray(body.starredSongIds)) {
		patch.starredSongIds = body.starredSongIds.map(Number).filter((n: number) => Number.isInteger(n));
	}
	if (typeof body.recsEnabled === 'boolean') patch.recsEnabled = body.recsEnabled;
	if (typeof body.isVibrationOn === 'boolean') patch.isVibrationOn = body.isVibrationOn;
	if (typeof body.isJoinCodeShown === 'boolean') patch.isJoinCodeShown = body.isJoinCodeShown;
	if (typeof body.isTimeLeftShown === 'boolean') patch.isTimeLeftShown = body.isTimeLeftShown;
	if (typeof body.isUpNextAlwaysShown === 'boolean') patch.isUpNextAlwaysShown = body.isUpNextAlwaysShown;
	if (typeof body.isSingerThemeShown === 'boolean') patch.isSingerThemeShown = body.isSingerThemeShown;
	if (body.lyricsLayout === 'full' || body.lyricsLayout === 'panel') patch.lyricsLayout = body.lyricsLayout;
	if (isThemeId(body.tvTheme)) patch.tvTheme = body.tvTheme;
	if (Array.isArray(body.brandPriority)) patch.brandPriority = body.brandPriority.map(String);
	if (Array.isArray(body.ytChannelPriority)) {
		patch.ytChannelPriority = body.ytChannelPriority
			.map((c: unknown) => String(c).trim())
			.filter((c: string) => c.length > 0);
	}
	if (Array.isArray(body.ytChannelBlocklist)) {
		patch.ytChannelBlocklist = body.ytChannelBlocklist
			.map((c: unknown) => String(c).trim())
			.filter((c: string) => c.length > 0);
	}
	if (Number.isFinite(body.songDelaySec)) patch.songDelaySec = clampSongDelay(body.songDelaySec as number);
	if (body.brandTiers && typeof body.brandTiers === 'object') {
		const clean: Record<string, Tier> = {};
		for (const [tag, tier] of Object.entries(body.brandTiers)) {
			if (tier === 'green' || tier === 'yellow' || tier === 'red') clean[tag] = tier;
		}
		patch.brandTiers = clean;
	}
	return patch;
}
