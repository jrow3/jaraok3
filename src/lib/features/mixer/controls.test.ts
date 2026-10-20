import { describe, expect, it } from 'vitest';
import { CONTROLS, CONTROL_IDS, DEFAULT_PARAMS, clampControl, isControlId, toParams } from './controls';

describe('controls', () => {
	it('keeps every default inside its own range', () => {
		for (const id of CONTROL_IDS) {
			const spec = CONTROLS[id];
			expect(spec.default, id).toBeGreaterThanOrEqual(spec.min);
			expect(spec.default, id).toBeLessThanOrEqual(spec.max);
			expect(clampControl(id, spec.default), id).toBe(spec.default);
		}
	});

	it('clamps to the range and snaps to the step', () => {
		expect(clampControl('compRatio', 99)).toBe(20);
		expect(clampControl('compRatio', 3.3)).toBe(3.5);
		expect(clampControl('echoTime', 0.333)).toBe(0.33);
		expect(clampControl('gateThreshold', Number.NaN)).toBe(-50);
	});

	it('knows its own ids and nothing else', () => {
		expect(isControlId('reverbTail')).toBe(true);
		expect(isControlId('toString')).toBe(false);
		expect(isControlId(3)).toBe(false);
	});

	it('fills missing or junk stored values with defaults', () => {
		const params = toParams({ compRatio: 8, reverbTail: 'loud', extra: 1 });
		expect(params.compRatio).toBe(8);
		expect(params.reverbTail).toBe(DEFAULT_PARAMS.reverbTail);
		expect(params).not.toHaveProperty('extra');
		expect(toParams(null)).toEqual(DEFAULT_PARAMS);
	});
});
