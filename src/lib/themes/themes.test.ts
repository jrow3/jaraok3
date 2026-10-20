import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { THEMES, DEFAULT_PHONE_THEME, DEFAULT_TV_THEME, isThemeId, themeById } from './themes';

describe('theme registry', () => {
	test('knows every registered theme by its id', () => {
		for (const theme of THEMES) expect(isThemeId(theme.id)).toBe(true);
	});

	test('refuses anything that is not a registered id', () => {
		for (const value of ['nope', '', 'Classic', 'constructor', null, 7, { id: 'classic' }]) {
			expect(isThemeId(value)).toBe(false);
		}
	});

	test('the defaults are registered themes', () => {
		expect(isThemeId(DEFAULT_PHONE_THEME)).toBe(true);
		expect(isThemeId(DEFAULT_TV_THEME)).toBe(true);
	});

	test('ids are unique', () => {
		expect(new Set(THEMES.map((theme) => theme.id)).size).toBe(THEMES.length);
	});

	test('finds a theme by id', () => {
		expect(themeById('classic').name).toBe('Classic');
	});

	// The picker's mini wordmark must look like the one the theme puts in the header.
	test("letters each picker card in its theme's wordmark font", () => {
		const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf-8');
		const token = (css: string, name: string) => css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1];
		const root = read('../../app.css');
		for (const theme of THEMES) {
			const css = theme.id === 'classic' ? '' : read(`./${theme.id}.css`);
			expect(theme.wordmarkFont).toBe(token(css, '--wm-font') ?? token(root, '--font-ui'));
			expect(String(theme.wordmarkWeight)).toBe(token(css, '--wm-weight') ?? token(root, '--wm-weight'));
		}
	});
});
