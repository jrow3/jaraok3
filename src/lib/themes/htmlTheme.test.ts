import { describe, test, expect } from 'vitest';
import { fillThemePlaceholders } from './htmlTheme';
import { THEMES } from './themes';

const PAGE =
	'<html data-theme="%karaoke.theme%" data-screen="%karaoke.screen%" data-theme-from="%karaoke.theme-from%">' +
	'<meta name="theme-color" content="%karaoke.theme-color%" />' +
	'<script>var colors = %karaoke.theme-colors%;</script>';

describe('fillThemePlaceholders', () => {
	test('names the theme and the screen on the page', () => {
		const html = fillThemePlaceholders(PAGE, { theme: 'classic', screen: 'tv', themeFrom: 'host' });
		expect(html).toContain('<html data-theme="classic" data-screen="tv" data-theme-from="host">');
		expect(html).toContain('<meta name="theme-color" content="#0b0910" />');
	});

	test('gives the inline script every theme and its bar color', () => {
		const html = fillThemePlaceholders(PAGE, { theme: 'classic', screen: 'phone', themeFrom: 'phone' });
		const colors = JSON.parse(html.match(/var colors = (.*);<\/script>/)![1]);
		expect(colors).toEqual(Object.fromEntries(THEMES.map((theme) => [theme.id, theme.background])));
	});

	test("marks a page that wears the host's theme, so a phone's own theme stays off it", () => {
		const html = fillThemePlaceholders(PAGE, { theme: 'swiss', screen: 'phone', themeFrom: 'host' });
		expect(html).toContain('data-theme="swiss" data-screen="phone" data-theme-from="host"');
	});
});
