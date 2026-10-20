import { describe, expect, it } from 'vitest';
import { DEFAULT_PARAMS } from './controls';
import { estimateSquashDb } from './squash';

describe('estimateSquashDb', () => {
	it('is zero below the threshold', () => {
		expect(estimateSquashDb(DEFAULT_PARAMS, -40, -90)).toBe(0);
	});

	it('takes the louder mic, after its trim, through the ratio', () => {
		// -12 dB peak over a -24 dB threshold at 4:1 → 12 dB over, squashed by 9.
		expect(estimateSquashDb(DEFAULT_PARAMS, -12, -30)).toBe(9);
		expect(estimateSquashDb({ ...DEFAULT_PARAMS, trimRight: 6 }, -40, -18)).toBe(9);
	});
});
