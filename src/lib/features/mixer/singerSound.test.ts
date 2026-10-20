import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS, clampControl, type ControlId } from './controls';
import {
	SINGER_CONTROL_IDS,
	SINGER_HELP,
	STARTING_POINTS,
	currentStartingPoint,
	houseValues,
	toSingerSound,
	withSinger
} from './singerSound';

describe('toSingerSound', () => {
	it('keeps singer controls and clamps them', () => {
		expect(toSingerSound({ reverbTail: 5, echoTime: 0.333 })).toEqual({ reverbTail: 0, echoTime: 0.33 });
	});
	it('drops host-only controls, unknown keys and junk values', () => {
		expect(toSingerSound({ compRatio: 8, voiceLevel: 6, nope: 1, reverbTime: 'long', echoLevel: Number.NaN })).toEqual({});
		expect(toSingerSound(null)).toEqual({});
	});
});

describe('withSinger', () => {
	it('shows the singer value where set and the house value elsewhere', () => {
		const house = houseValues(DEFAULT_PARAMS);
		expect(withSinger(house, { echoLevel: -12 })).toEqual({ ...house, echoLevel: -12 });
	});
});

describe('starting points', () => {
	it('keeps every value inside its control range', () => {
		for (const point of STARTING_POINTS)
			for (const [id, value] of Object.entries(point.values)) expect(clampControl(id as ControlId, value), `${point.id} ${id}`).toBe(value);
	});
	it('names the point the knobs match, and none after a knob moves', () => {
		const hall = STARTING_POINTS.find((point) => point.id === 'hall')!.values;
		expect(currentStartingPoint(hall)).toBe('hall');
		expect(currentStartingPoint({ ...hall, reverbTail: hall.reverbTail - 1 })).toBeNull();
	});
	it('has help text for every singer control', () => {
		for (const id of SINGER_CONTROL_IDS) expect(SINGER_HELP[id].length).toBeGreaterThan(10);
	});
});
