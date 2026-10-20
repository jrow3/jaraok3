export interface SliderRange {
	min: number;
	max: number;
	step: number;
}

const PAGE_STEPS = 10;

export function snap(range: SliderRange, value: number): number {
	const clamped = Math.min(range.max, Math.max(range.min, value));
	const steps = Math.round((clamped - range.min) / range.step);
	// Rounding to the step's own precision keeps 0.1 steps from drifting to 0.30000000000000004.
	const decimals = (String(range.step).split('.')[1] ?? '').length;
	return Number((range.min + steps * range.step).toFixed(decimals));
}

export function toFraction(range: SliderRange, value: number): number {
	return (snap(range, value) - range.min) / (range.max - range.min);
}

export function fromFraction(range: SliderRange, fraction: number): number {
	return snap(range, range.min + fraction * (range.max - range.min));
}

export function stepByKey(range: SliderRange, value: number, key: string): number | null {
	switch (key) {
		case 'ArrowUp':
		case 'ArrowRight':
			return snap(range, value + range.step);
		case 'ArrowDown':
		case 'ArrowLeft':
			return snap(range, value - range.step);
		case 'PageUp':
			return snap(range, value + range.step * PAGE_STEPS);
		case 'PageDown':
			return snap(range, value - range.step * PAGE_STEPS);
		case 'Home':
			return range.min;
		case 'End':
			return range.max;
		default:
			return null;
	}
}
