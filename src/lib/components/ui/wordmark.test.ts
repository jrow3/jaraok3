import { describe, expect, it } from 'vitest';
import { wordmarkLetters } from './wordmark';

describe('wordmarkLetters', () => {
	it('paints j, r and 3 as accents in the brand name', () => {
		const letters = wordmarkLetters('jaraok3');
		expect(letters.map((letter) => letter.letter).join('')).toBe('jaraok3');
		expect(letters.filter((letter) => letter.paint !== 'body').map((letter) => letter.letter)).toEqual(['j', 'r', '3']);
	});

	it('sets any other name plainly, one tilted span per letter', () => {
		const letters = wordmarkLetters('Sing It');
		expect(letters).toHaveLength(7);
		expect(letters.every((letter) => letter.paint === 'body')).toBe(true);
		expect(letters[4].letter).toBe(' ');
		expect(letters.map((letter) => letter.tilt)).toEqual([-7, 3, -4, 3, -2, -4, 8]);
	});
});
