import type { MixerParams } from './controls';

// What the host agent hands PipeWire. Keys are "<node>:<control port>" from
// deploy/audio/mic-fx.conf.template; a misspelt port is silently ignored by PipeWire,
// so the test pins every name against that file.
export interface PipewireApply {
	filter: Record<string, number>;
	/** The audio interface's output volume, 0..1. Above 1 PipeWire boosts digitally and clips. */
	sinkVolume: number;
}

// Below this an echo level is "off", not a whisper of echo.
const ECHO_OFF_DB = -60;

const linear = (db: number) => Number((10 ** (db / 20)).toFixed(4));

export function toPipewire(params: MixerParams): PipewireApply {
	const isMuted = params.isVoiceMuted === 1;
	return {
		filter: {
			'mix:Gain 1': isMuted ? 0 : linear(params.trimLeft),
			'mix:Gain 2': isMuted ? 0 : linear(params.trimRight),
			'lowcut:Freq': params.lowCutHz,
			'bass:Gain': params.bassGain,
			'mid:Freq': params.midFreq,
			'mid:Gain': params.midGain,
			'presence:Gain': params.presenceGain,
			'air:Gain': params.airGain,
			'gate:Threshold (dB)': params.gateThreshold,
			'gate:Range (dB)': params.gateRange,
			'gate:Attack (ms)': params.gateAttack,
			'gate:Hold (ms)': params.gateHold,
			'gate:Decay (ms)': params.gateDecay,
			'comp:Threshold level (dB)': params.compThreshold,
			'comp:Ratio (1:n)': params.compRatio,
			'comp:Attack time (ms)': params.compAttack,
			'comp:Release time (ms)': params.compRelease,
			'comp:Knee radius (dB)': params.compKnee,
			'comp:Makeup gain (dB)': params.compMakeup,
			'echo:Delay (s)': params.echoTime,
			'voice:Gain 1': linear(params.voiceLevel),
			'voice:Gain 2': params.echoLevel <= ECHO_OFF_DB ? 0 : linear(params.voiceLevel + params.echoLevel),
			'verb:Roomsize (m)': params.reverbSize,
			'verb:Reverb time (s)': params.reverbTime,
			'verb:Damping': params.reverbDamping,
			'verb:Early reflection level (dB)': params.reverbEarly,
			'verb:Tail level (dB)': params.reverbTail
		},
		sinkVolume: params.masterLevel / 100
	};
}
