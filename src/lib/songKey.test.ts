import { describe, test, expect } from 'vitest';
import { songKey } from './songKey';

describe('songKey', () => {
	test('ignores case, punctuation and spacing', () => {
		expect(songKey('Journey', "Don't Stop Believin'")).toBe(songKey('journey', 'Dont  Stop Believin'));
	});
	test('different songs by the same artist differ', () => {
		expect(songKey('Queen', 'Under Pressure')).not.toBe(songKey('Queen', 'Somebody to Love'));
	});
	test('a live or acoustic take stays distinct', () => {
		expect(songKey('Bon Jovi', "Livin' on a Prayer (acoustic)")).not.toBe(songKey('Bon Jovi', "Livin' on a Prayer"));
	});
	test('treats a curly apostrophe like a straight one', () => {
		expect(songKey('Journey', 'Don’t Stop')).toBe(songKey('Journey', "Don't Stop"));
	});
});
