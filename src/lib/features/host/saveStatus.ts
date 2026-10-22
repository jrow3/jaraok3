import type { SettingsFields } from './settingsModel';

export type SaveSection = 'guests' | 'playback' | 'tv' | 'brands' | 'channels' | 'hidden' | 'stars';
export type SaveState = 'saving' | 'saved' | 'failed';
export type SaveOutcome = 'saved' | 'failed' | 'expired';

// Long enough to notice after a tap, short enough that a settled page shows no noise.
export const SAVED_SHOW_MS = 2000;

// Each setting belongs to the section whose heading shows whether it saved.
// Stars have no heading; a failed star shows a toast instead.
const SECTION_OF: Record<keyof SettingsFields, SaveSection> = {
	recsEnabled: 'guests',
	isVibrationOn: 'guests',
	songDelaySec: 'playback',
	lyricsLayout: 'tv',
	isJoinCodeShown: 'tv',
	isTimeLeftShown: 'tv',
	isUpNextAlwaysShown: 'tv',
	isSingerThemeShown: 'tv',
	tvTheme: 'tv',
	brandPriority: 'brands',
	brandTiers: 'brands',
	ytChannelPriority: 'channels',
	ytChannelBlocklist: 'hidden',
	starredSongIds: 'stars'
};

const FIELDS = Object.keys(SECTION_OF) as (keyof SettingsFields)[];

// Every change the host makes touches fields of one section.
export const sectionOf = (patch: Partial<SettingsFields>): SaveSection =>
	SECTION_OF[Object.keys(patch)[0] as keyof SettingsFields];

export function sectionFields(section: SaveSection, data: SettingsFields): Partial<SettingsFields> {
	const fields = FIELDS.filter((field) => SECTION_OF[field] === section);
	return Object.fromEntries(fields.map((field) => [field, data[field]])) as Partial<SettingsFields>;
}

// 0 is what a save that never reached the server reports.
const outcomeOf = (status: number): SaveOutcome =>
	status === 401 ? 'expired' : status >= 200 && status < 300 ? 'saved' : 'failed';

// Takes a plain object so the logic runs in node tests; the host store passes a $state
// proxy. `send` answers the HTTP status.
export function createSaver(
	states: Partial<Record<SaveSection, SaveState>>,
	send: (patch: Partial<SettingsFields>) => Promise<number>
) {
	const latest: Partial<Record<SaveSection, number>> = {};
	let count = 0;

	async function save(patch: Partial<SettingsFields>): Promise<SaveOutcome> {
		const section = sectionOf(patch);
		const ticket = ++count;
		latest[section] = ticket;
		states[section] = 'saving';
		const outcome = outcomeOf(await send(patch).catch(() => 0));
		// Two quick taps can answer out of order; only the newest save sets the heading.
		if (latest[section] !== ticket) return outcome;
		states[section] = outcome === 'saved' ? 'saved' : 'failed';
		if (outcome === 'saved') {
			setTimeout(() => {
				if (latest[section] === ticket) delete states[section];
			}, SAVED_SHOW_MS);
		}
		return outcome;
	}

	// Deletes rather than replacing the object, which the host store holds as a $state proxy.
	function clear() {
		for (const section of Object.keys(states) as SaveSection[]) delete states[section];
	}

	return { save, clear };
}
