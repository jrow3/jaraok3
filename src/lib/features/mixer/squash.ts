import type { MixerParams } from './controls';

// The agent can't read the compressor's own gain-reduction output, so the meter shows
// what the compressor's curve does to the louder mic's peak: close enough to set a
// threshold by, which is all the meter is for. EQ and the gate are ignored.
export function estimateSquashDb(params: MixerParams, inL: number, inR: number): number {
	const level = Math.max(inL + params.trimLeft, inR + params.trimRight);
	const over = level - params.compThreshold;
	return over > 0 ? over * (1 - 1 / params.compRatio) : 0;
}
