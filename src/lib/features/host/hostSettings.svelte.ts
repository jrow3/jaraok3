import { SESSION_ENDED } from '$lib/messages';
import { DEFAULT_TV_THEME } from '$lib/themes/themes';
import { createSaver, sectionFields, sectionOf, type SaveOutcome, type SaveSection, type SaveState } from './saveStatus';
import {
	parseSettings,
	tierOf,
	toggleId,
	withLibraryBrands,
	type HostSettingsData,
	type SettingsFields
} from './settingsModel';

const EMPTY: HostSettingsData = {
	brandPriority: [],
	brandCounts: {},
	brandTiers: {},
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
	tvTheme: DEFAULT_TV_THEME
};

async function postSettings(patch: Partial<SettingsFields>): Promise<number> {
	const response = await fetch('/api/settings', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(patch)
	});
	return response.status;
}

// The settings read doubles as the PIN check: a 401 means this phone has no host cookie yet.
export function createHostSettings() {
	// Checking until the first settings read answers, so a signed-in host never sees the PIN form flash.
	const session = $state({ isChecking: true, isAuthed: false, lockMessage: '' });
	let data = $state<HostSettingsData>(EMPTY);
	const saveStates = $state<Partial<Record<SaveSection, SaveState>>>({});
	const saver = createSaver(saveStates, postSettings);

	async function load() {
		// Offline, the check still ends so the page falls through to the PIN gate instead
		// of spinning forever.
		const response = await fetch('/api/settings').catch((error) => {
			session.isChecking = false;
			throw error;
		});
		session.isAuthed = response.status !== 401;
		session.isChecking = false;
		if (!session.isAuthed) return;
		session.lockMessage = '';
		data = parseSettings(await response.json());
		// The saved values are back on screen, so a heading's "Couldn't save" (an expired
		// save is stored as failed, and outlives the PIN) would point at nothing.
		saver.clear();
	}
	// A failed reload keeps the old brand counts; the rescan itself has already said Done.
	async function reloadBrands() {
		const response = await fetch('/api/settings').catch(() => null);
		if (!response?.ok) return;
		const { brands } = await response.json();
		data = withLibraryBrands(data, brands);
	}
	// The host cookie lasts 30 days; after that every save answers 401, so ask for the
	// PIN again instead of dropping changes quietly.
	const expire = (lockMessage = SESSION_ENDED) => Object.assign(session, { isAuthed: false, lockMessage });
	// The screen shows the new value at once; the section heading says whether it stuck.
	// Sends the whole section, so a newer success can't hide an earlier failed field of it.
	async function update(patch: Partial<SettingsFields>): Promise<SaveOutcome> {
		data = { ...data, ...patch };
		const outcome = await saver.save(sectionFields(sectionOf(patch), data));
		if (outcome === 'expired') expire();
		return outcome;
	}
	return {
		session,
		get data() {
			return data;
		},
		saveStates,
		load,
		reloadBrands,
		update,
		expire,
		retry: (section: SaveSection) => update(sectionFields(section, data)),
		tierOf: (tag: string) => tierOf(data.brandTiers, tag),
		isStarred: (songId: number) => data.starredSongIds.includes(songId),
		toggleStar: (songId: number) => update({ starredSongIds: toggleId(data.starredSongIds, songId) })
	};
}

export type HostSettings = ReturnType<typeof createHostSettings>;
