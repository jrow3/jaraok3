import { describe, expect, it } from 'vitest';
import { brandName } from './brandName';

describe('brandName', () => {
	it('spells out the companies whose codes are certain', () => {
		expect(brandName('SF Karaoke')).toBe('Sunfly');
		expect(brandName('SC Karaoke')).toBe('Sound Choice');
		expect(brandName('CB Karaoke')).toBe('Chartbuster');
		expect(brandName('Z Karaoke')).toBe('Zoom Karaoke');
		expect(brandName('#Z Karaoke')).toBe('Zoom Karaoke');
		expect(brandName('ME Karaoke')).toBe('Mr Entertainer');
		expect(brandName('PS Karaoke')).toBe('Pocket Songs');
	});

	it('leaves every other tag as the library has it', () => {
		expect(brandName('MM Karaoke')).toBe('MM Karaoke');
		expect(brandName('Sing King')).toBe('Sing King');
	});
});
