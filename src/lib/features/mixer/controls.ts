import { snap } from '../../components/ui/sliderMath';

// Every knob and fader the Sound tab shows. Server validation, the widgets and the
// PipeWire mapping all read this one table, so a range can never disagree between them.
// Defaults are a hand-tuned starting point for wireless vocal mics into a line in, the
// same values mic-fx.conf.template boots with.

export type ControlGroup = 'input' | 'eq' | 'gate' | 'comp' | 'echo' | 'reverb' | 'output';

export interface ControlSpec {
	group: ControlGroup;
	label: string;
	unit: string;
	min: number;
	max: number;
	step: number;
	default: number;
	isToggle?: boolean;
}

export const CONTROLS = {
	trimLeft: { group: 'input', label: 'Input L', unit: 'dB', min: -24, max: 12, step: 1, default: 0 },
	trimRight: { group: 'input', label: 'Input R', unit: 'dB', min: -24, max: 12, step: 1, default: 0 },
	voiceLevel: { group: 'input', label: 'Voice', unit: 'dB', min: -40, max: 18, step: 1, default: 0 },
	isVoiceMuted: { group: 'input', label: 'Mute mics', unit: '', min: 0, max: 1, step: 1, default: 0, isToggle: true },

	lowCutHz: { group: 'eq', label: 'Low cut', unit: 'Hz', min: 20, max: 300, step: 5, default: 20 },
	bassGain: { group: 'eq', label: 'Bass', unit: 'dB', min: -12, max: 12, step: 0.5, default: 0 },
	midFreq: { group: 'eq', label: 'Mid freq', unit: 'Hz', min: 200, max: 4000, step: 50, default: 1000 },
	midGain: { group: 'eq', label: 'Mid', unit: 'dB', min: -12, max: 12, step: 0.5, default: 0 },
	presenceGain: { group: 'eq', label: 'Presence', unit: 'dB', min: -12, max: 12, step: 0.5, default: 0 },
	airGain: { group: 'eq', label: 'Air', unit: 'dB', min: -12, max: 12, step: 0.5, default: 0 },

	gateThreshold: { group: 'gate', label: 'Threshold', unit: 'dB', min: -70, max: 0, step: 1, default: -50 },
	gateRange: { group: 'gate', label: 'Depth', unit: 'dB', min: -90, max: 0, step: 1, default: -40 },
	gateAttack: { group: 'gate', label: 'Attack', unit: 'ms', min: 0.1, max: 100, step: 0.1, default: 3 },
	gateHold: { group: 'gate', label: 'Hold', unit: 'ms', min: 10, max: 2000, step: 10, default: 250 },
	gateDecay: { group: 'gate', label: 'Release', unit: 'ms', min: 10, max: 4000, step: 10, default: 400 },

	compThreshold: { group: 'comp', label: 'Threshold', unit: 'dB', min: -30, max: 0, step: 0.5, default: -24 },
	compRatio: { group: 'comp', label: 'Ratio', unit: ':1', min: 1, max: 20, step: 0.5, default: 4 },
	compAttack: { group: 'comp', label: 'Attack', unit: 'ms', min: 1.5, max: 400, step: 0.5, default: 10 },
	compRelease: { group: 'comp', label: 'Release', unit: 'ms', min: 2, max: 800, step: 1, default: 150 },
	compKnee: { group: 'comp', label: 'Knee', unit: 'dB', min: 1, max: 10, step: 0.5, default: 3 },
	compMakeup: { group: 'comp', label: 'Makeup', unit: 'dB', min: 0, max: 24, step: 0.5, default: 9 },

	echoTime: { group: 'echo', label: 'Time', unit: 's', min: 0.05, max: 1, step: 0.01, default: 0.25 },
	echoLevel: { group: 'echo', label: 'Level', unit: 'dB', min: -60, max: 0, step: 1, default: -60 },

	reverbSize: { group: 'reverb', label: 'Room', unit: 'm', min: 1, max: 150, step: 1, default: 30 },
	reverbTime: { group: 'reverb', label: 'Decay', unit: 's', min: 0.1, max: 10, step: 0.1, default: 1.5 },
	reverbDamping: { group: 'reverb', label: 'Damping', unit: '', min: 0, max: 1, step: 0.05, default: 0.5 },
	reverbEarly: { group: 'reverb', label: 'Early', unit: 'dB', min: -70, max: 0, step: 1, default: -11 },
	reverbTail: { group: 'reverb', label: 'Tail', unit: 'dB', min: -70, max: 0, step: 1, default: -15 },

	musicLevel: { group: 'output', label: 'Music', unit: '%', min: 0, max: 100, step: 1, default: 100 },
	masterLevel: { group: 'output', label: 'Master', unit: '%', min: 0, max: 100, step: 1, default: 100 }
} satisfies Record<string, ControlSpec>;

export type ControlId = keyof typeof CONTROLS;
export type MixerParams = Record<ControlId, number>;

export const CONTROL_IDS = Object.keys(CONTROLS) as ControlId[];

export const isControlId = (value: unknown): value is ControlId =>
	typeof value === 'string' && Object.hasOwn(CONTROLS, value);

export function clampControl(id: ControlId, value: number): number {
	const spec: ControlSpec = CONTROLS[id];
	return Number.isFinite(value) ? snap(spec, value) : spec.default;
}

export const DEFAULT_PARAMS = Object.fromEntries(CONTROL_IDS.map((id) => [id, CONTROLS[id].default])) as MixerParams;

// Stored params may predate a control or hold junk; anything missing or invalid falls back.
export function toParams(raw: unknown): MixerParams {
	const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	return Object.fromEntries(
		CONTROL_IDS.map((id) => {
			const value = source[id];
			return [id, typeof value === 'number' ? clampControl(id, value) : CONTROLS[id].default];
		})
	) as MixerParams;
}
