export type LetterPaint = 'j' | 'body' | 'three';

export interface WordmarkLetter {
	letter: string;
	paint: LetterPaint;
	tilt: number;
}

export const BRAND_NAME = 'jaraok3';

// The brand's candy wordmark: j, r and 3 painted as accents (together they spell jr3),
// each letter tilted its own way.
const BRAND: WordmarkLetter[] = [
	{ letter: 'j', paint: 'j', tilt: -7 },
	{ letter: 'a', paint: 'body', tilt: 3 },
	{ letter: 'r', paint: 'j', tilt: -4 },
	{ letter: 'a', paint: 'body', tilt: 3 },
	{ letter: 'o', paint: 'body', tilt: -2 },
	{ letter: 'k', paint: 'body', tilt: -4 },
	{ letter: '3', paint: 'three', tilt: 8 }
];

// Any other name (PUBLIC_APP_NAME) is set in the body color, but keeps the same rhythm of
// tilts, so a theme's wobble and bounce still work letter by letter.
export function wordmarkLetters(name: string): WordmarkLetter[] {
	if (name === BRAND_NAME) return BRAND;
	return [...name].map((letter, index) => ({
		// A plain space would collapse between the inline-block letter spans.
		letter: letter === ' ' ? ' ' : letter,
		paint: 'body',
		tilt: BRAND[index % BRAND.length].tilt
	}));
}
