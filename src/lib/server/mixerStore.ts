import { getDb } from './db';
import { mixerFileContents, type MixerStore } from './mixer';
import { writeMixerFile } from './mixerFile';
import { levelSocketPath } from './mixerLevels';
import { getSettings, setSettings } from './settings';
import { announceSettingsSaved } from './settingsSaved';
import { loadSingerSound, saveSingerSound } from './singerSoundStore';
import { toMixerState } from '../features/mixer/presets';

// Where the live mixer keeps its state: the settings table, the singers' own sounds, and
// the control folder the host agent reads.
export const mixerStore: MixerStore = {
	load: () => toMixerState(getSettings(getDb()).mixer),
	save: (state) => {
		setSettings(getDb(), { mixer: state });
		// The Music fader is the TV's song volume.
		announceSettingsSaved();
	},
	apply: (params) => writeMixerFile(mixerFileContents(params)),
	loadSinger: (owner) => {
		try {
			return loadSingerSound(getDb(), owner);
		} catch {
			// A missing or broken database means no singer sound, never a broken broadcast.
			return {};
		}
	},
	saveSinger: (owner, sound) => saveSingerSound(getDb(), owner, sound),
	levelPath: levelSocketPath
};
