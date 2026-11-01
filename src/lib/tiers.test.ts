import { describe, test, expect } from 'vitest';
import { tierOf } from './tiers';

describe('tierOf', () => {
	test('an unrated brand counts as yellow', () => {
		expect(tierOf({ SC: 'green' }, 'SC')).toBe('green');
		expect(tierOf({ SC: 'green' }, 'XX')).toBe('yellow');
	});
});
