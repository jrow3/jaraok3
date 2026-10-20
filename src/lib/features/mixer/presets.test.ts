import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from './controls';
import {
	DEFAULT_MIXER,
	addPreset,
	cleanPresetName,
	deletePreset,
	isUnsaved,
	loadPreset,
	renamePreset,
	saveToPreset,
	toMixerState
} from './presets';

const tweaked = { ...DEFAULT_MIXER, live: { ...DEFAULT_PARAMS, reverbTail: -5 } };

describe('mixer presets', () => {
	it('starts on Party, matching the live sound', () => {
		expect(DEFAULT_MIXER.activePresetId).toBe('party');
		expect(isUnsaved(DEFAULT_MIXER)).toBe(false);
	});

	it('loading a preset makes it the live sound', () => {
		const state = loadPreset(DEFAULT_MIXER, 'dry')!;
		expect(state.live.reverbTail).toBe(-70);
		expect(state.activePresetId).toBe('dry');
		expect(loadPreset(DEFAULT_MIXER, 'nope')).toBeNull();
	});

	it('a tweak is unsaved until saved back to the preset', () => {
		expect(isUnsaved(tweaked)).toBe(true);
		const saved = saveToPreset(tweaked, 'party')!;
		expect(isUnsaved(saved)).toBe(false);
		expect(saved.presets.find((preset) => preset.id === 'party')!.params.reverbTail).toBe(-5);
	});

	it('save as adds a preset from the live sound and selects it', () => {
		const state = addPreset(tweaked, 'Loud room', 'p1')!;
		expect(state.activePresetId).toBe('p1');
		expect(state.presets.at(-1)).toMatchObject({ id: 'p1', name: 'Loud room' });
	});

	it('renames and deletes, leaving the sound playing unsaved', () => {
		const renamed = renamePreset(DEFAULT_MIXER, 'party', 'House')!;
		expect(renamed.presets[0].name).toBe('House');
		const deleted = deletePreset(DEFAULT_MIXER, 'party')!;
		expect(deleted.activePresetId).toBeNull();
		expect(deleted.live).toEqual(DEFAULT_MIXER.live);
		expect(isUnsaved(deleted)).toBe(true);
	});

	it('cleans names', () => {
		expect(cleanPresetName('  Arena  ')).toBe('Arena');
		expect(cleanPresetName('   ')).toBeNull();
		expect(cleanPresetName(5)).toBeNull();
	});

	it('rebuilds stored state, dropping junk and a dangling active id', () => {
		const state = toMixerState({
			live: { reverbTail: -3 },
			presets: [{ id: 'a', name: 'A', params: {} }, { id: 'b' }, 'junk'],
			activePresetId: 'gone'
		});
		expect(state.live.reverbTail).toBe(-3);
		expect(state.presets.map((preset) => preset.id)).toEqual(['a']);
		expect(state.activePresetId).toBeNull();
		expect(toMixerState(undefined)).toEqual(DEFAULT_MIXER);
	});
});
