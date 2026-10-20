import { describe, expect, it } from 'vitest';
import { fromFraction, stepByKey, toFraction, type SliderRange } from './sliderMath';

const DB: SliderRange = { min: -60, max: 12, step: 0.5 };

describe('toFraction / fromFraction', () => {
	it('maps the ends of the range to 0 and 1', () => {
		expect(toFraction(DB, -60)).toBe(0);
		expect(toFraction(DB, 12)).toBe(1);
	});

	it('round-trips a value through the fraction and snaps to the step', () => {
		expect(fromFraction(DB, toFraction(DB, -18))).toBe(-18);
		expect(fromFraction(DB, 0.5004)).toBe(-24);
	});

	it('clamps fractions outside 0..1', () => {
		expect(fromFraction(DB, -0.3)).toBe(-60);
		expect(fromFraction(DB, 1.7)).toBe(12);
	});
});

describe('stepByKey', () => {
	it('moves one step on arrows and ten on page keys', () => {
		expect(stepByKey(DB, 0, 'ArrowUp')).toBe(0.5);
		expect(stepByKey(DB, 0, 'ArrowLeft')).toBe(-0.5);
		expect(stepByKey(DB, 0, 'PageUp')).toBe(5);
		expect(stepByKey(DB, 0, 'PageDown')).toBe(-5);
	});

	it('jumps to the ends on Home and End and stays inside the range', () => {
		expect(stepByKey(DB, 0, 'Home')).toBe(-60);
		expect(stepByKey(DB, 0, 'End')).toBe(12);
		expect(stepByKey(DB, 12, 'ArrowUp')).toBe(12);
	});

	it('ignores other keys', () => {
		expect(stepByKey(DB, 3, 'a')).toBeNull();
	});
});
