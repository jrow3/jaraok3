import type { MixerParams } from './controls';

export type CompressorLevel = 'off' | 'light' | 'medium' | 'heavy';

type CompressorSettings = Pick<MixerParams, 'compThreshold' | 'compRatio' | 'compMakeup'>;

// Each level's makeup roughly cancels what it takes off a strong singer (peaks near
// -10 dB), so switching levels changes how even the singers are, not how loud.
// Medium is the hand-tuned rig setting the control defaults start from.
export const COMPRESSOR_LEVELS: Record<CompressorLevel, CompressorSettings> = {
	off: { compThreshold: 0, compRatio: 1, compMakeup: 0 },
	light: { compThreshold: -18, compRatio: 2, compMakeup: 4 },
	medium: { compThreshold: -24, compRatio: 4, compMakeup: 9 },
	heavy: { compThreshold: -30, compRatio: 8, compMakeup: 14 }
};

export const COMPRESSOR_LEVEL_IDS = Object.keys(COMPRESSOR_LEVELS) as CompressorLevel[];

// After a fine-tune the knobs match no level, so none of the buttons is lit.
export function currentCompressorLevel(params: MixerParams): CompressorLevel | null {
	return (
		COMPRESSOR_LEVEL_IDS.find((level) =>
			Object.entries(COMPRESSOR_LEVELS[level]).every(([id, value]) => params[id as keyof CompressorSettings] === value)
		) ?? null
	);
}
