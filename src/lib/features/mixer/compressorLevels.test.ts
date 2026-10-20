import { describe, expect, it } from 'vitest';
import { COMPRESSOR_LEVELS, COMPRESSOR_LEVEL_IDS, currentCompressorLevel } from './compressorLevels';
import { DEFAULT_PARAMS, clampControl, type ControlId } from './controls';

describe('compressor levels', () => {
	it('keeps every level inside the knobs’ ranges', () => {
		for (const level of COMPRESSOR_LEVEL_IDS) {
			for (const [id, value] of Object.entries(COMPRESSOR_LEVELS[level])) {
				expect(clampControl(id as ControlId, value), `${level} ${id}`).toBe(value);
			}
		}
	});

	it('reads the defaults as Medium', () => {
		expect(currentCompressorLevel(DEFAULT_PARAMS)).toBe('medium');
	});

	it('names the level the knobs are set to', () => {
		expect(currentCompressorLevel({ ...DEFAULT_PARAMS, ...COMPRESSOR_LEVELS.heavy })).toBe('heavy');
	});

	it('names no level once a knob is fine-tuned', () => {
		expect(currentCompressorLevel({ ...DEFAULT_PARAMS, compRatio: 5 })).toBeNull();
	});
});
