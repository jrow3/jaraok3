import { DEFAULT_PARAMS, toParams, type MixerParams } from './controls';

export interface MixerPreset {
	id: string;
	name: string;
	params: MixerParams;
}

/** What the server stores and every host phone shows. */
export interface MixerState {
	/** What's playing through the speakers right now; may differ from the active preset until saved. */
	live: MixerParams;
	presets: MixerPreset[];
	activePresetId: string | null;
}

const MAX_PRESETS = 20;
const MAX_NAME = 40;

const DRY = { echoLevel: -60, reverbEarly: -70, reverbTail: -70 };

export const BUILT_IN_PRESETS: MixerPreset[] = [
	{ id: 'party', name: 'Party', params: DEFAULT_PARAMS },
	{ id: 'dry', name: 'Dry', params: { ...DEFAULT_PARAMS, ...DRY } },
	{
		id: 'arena',
		name: 'Arena',
		params: { ...DEFAULT_PARAMS, reverbSize: 90, reverbTime: 3, reverbTail: -10, echoLevel: -18, echoTime: 0.32 }
	},
	{
		id: 'ballad',
		name: 'Ballad',
		params: { ...DEFAULT_PARAMS, reverbTime: 2.5, reverbTail: -12, compRatio: 3, presenceGain: 2 }
	}
];

export const DEFAULT_MIXER: MixerState = {
	live: DEFAULT_PARAMS,
	presets: BUILT_IN_PRESETS,
	activePresetId: 'party'
};

export function cleanPresetName(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	const name = raw.trim().slice(0, MAX_NAME);
	return name || null;
}

// The stored blob is trusted no further than the settings table: rebuilt field by field.
export function toMixerState(raw: unknown): MixerState {
	if (!raw || typeof raw !== 'object') return DEFAULT_MIXER;
	const source = raw as Record<string, unknown>;
	const presets = (Array.isArray(source.presets) ? source.presets : [])
		.flatMap((preset: Record<string, unknown>) => {
			const name = cleanPresetName(preset?.name);
			return typeof preset?.id === 'string' && name ? [{ id: preset.id, name, params: toParams(preset.params) }] : [];
		})
		.slice(0, MAX_PRESETS);
	const activePresetId = presets.some((preset) => preset.id === source.activePresetId)
		? (source.activePresetId as string)
		: null;
	return { live: toParams(source.live), presets, activePresetId };
}

export function loadPreset(state: MixerState, id: string): MixerState | null {
	const preset = state.presets.find((candidate) => candidate.id === id);
	return preset ? { ...state, live: preset.params, activePresetId: id } : null;
}

export function saveToPreset(state: MixerState, id: string): MixerState | null {
	if (!state.presets.some((preset) => preset.id === id)) return null;
	return {
		...state,
		presets: state.presets.map((preset) => (preset.id === id ? { ...preset, params: state.live } : preset)),
		activePresetId: id
	};
}

export function addPreset(state: MixerState, name: string, id: string): MixerState | null {
	if (state.presets.length >= MAX_PRESETS) return null;
	return { ...state, presets: [...state.presets, { id, name, params: state.live }], activePresetId: id };
}

export function renamePreset(state: MixerState, id: string, name: string): MixerState | null {
	if (!state.presets.some((preset) => preset.id === id)) return null;
	return { ...state, presets: state.presets.map((preset) => (preset.id === id ? { ...preset, name } : preset)) };
}

// Deleting leaves the sound alone: the live settings keep playing, now unsaved.
export function deletePreset(state: MixerState, id: string): MixerState | null {
	if (!state.presets.some((preset) => preset.id === id)) return null;
	return {
		...state,
		presets: state.presets.filter((preset) => preset.id !== id),
		activePresetId: state.activePresetId === id ? null : state.activePresetId
	};
}

export function isUnsaved(state: MixerState): boolean {
	const active = state.presets.find((preset) => preset.id === state.activePresetId);
	return !active || Object.entries(state.live).some(([id, value]) => active.params[id as keyof MixerParams] !== value);
}
