import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { THEMES } from '../themes';

const here = new URL('./', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, here), 'utf-8');

const FILES = (readdirSync(here, { recursive: true }) as string[])
	.map((path) => path.replaceAll('\\', '/'))
	.filter((path) => path.endsWith('.svelte'));
const SPOTS = FILES.filter((path) => !path.includes('/'));
const PIECES = FILES.filter((path) => path.includes('/'));

function markup(source: string): string {
	return source.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, '').trim();
}

// Once the root closes nothing may open again, so every piece renders inside it.
function isAllInsideRoot(body: string): boolean {
	let depth = 0;
	for (const tag of body.matchAll(/<\/?span\b/g)) {
		if (depth === 0 && tag.index > 0) return false;
		depth += tag[0] === '<span' ? 1 : -1;
	}
	return depth === 0 && body.endsWith('</span>');
}

// Every property a @keyframes block sets, across all its steps.
function keyframeProperties(source: string): string[] {
	const blocks = source.matchAll(/@keyframes\s+[-\w]+\s*\{((?:[^{}]*\{[^{}]*\})*[^{}]*)\}/g);
	return [...blocks].flatMap((block) => [...block[1].matchAll(/([a-z-]+)\s*:/g)].map((match) => match[1]));
}

// transparent and currentColor stay allowed: neither brings a color of its own.
const NAMED_COLOR = /(?<![-\w])(white|black|red|blue|green|gold|yellow|orange|pink|purple|gray|grey|silver)(?![-\w])/i;

// Comments are left out, since they may name the colors a piece imitates.
function paintValues(source: string): string[] {
	const style = (source.match(/<style>([\s\S]*)<\/style>/)?.[1] ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
	const declarations = [...style.matchAll(/(?:^|[;{])\s*[a-z-]+\s*:\s*([^;{}]*)/gm)];
	const attributes = [...markup(source).matchAll(/\b(?:fill|stroke)="([^"]*)"/g)];
	return [...declarations, ...attributes].map((match) => match[1]);
}

describe('flourishes', () => {
	test('every spot hides itself and its pieces from screen readers', () => {
		expect(SPOTS).not.toEqual([]);
		for (const spot of SPOTS) {
			const body = markup(read(spot));
			expect(body, spot).toMatch(/^<span class="flourish" data-flourish="[a-z]+" aria-hidden="true">/);
			expect(isAllInsideRoot(body), spot).toBe(true);
		}
		// Older Safari can drop a display: contents spot, and its aria-hidden, from the accessibility tree.
		for (const piece of PIECES) expect(markup(read(piece)), piece).toMatch(/^<(span|svg)\b[^>]*\baria-hidden="true"/);
	});

	test('nothing in a flourish can take focus', () => {
		const focusable = /<(button|a|input|select|textarea|summary|iframe)\b|<(audio|video)\b[^>]*\bcontrols\b|tabindex|contenteditable/;
		expect(FILES.filter((path) => focusable.test(read(path)))).toEqual([]);
	});

	// Anything else would lay out or repaint every frame on the kiosk while the lyrics draw.
	// Covers every file a theme's motion lives in: the flourishes, the theme sheets, the wordmark's
	// letters, and the two components the gel gloss reaches.
	test('animates only transform and opacity', () => {
		const sheets = readdirSync(new URL('../', here))
			.filter((name) => name.endsWith('.css'))
			.map((name) => `../${name}`);
		const components = [
			'../../components/ui/Wordmark.svelte',
			'../../components/ui/Button.svelte',
			'../../features/host/controls/NowPlaying.svelte'
		];
		const sources = [...FILES, ...sheets, ...components].map(read);
		const properties = new Set(sources.flatMap(keyframeProperties));
		expect([...properties].filter((name) => name !== 'transform' && name !== 'opacity')).toEqual([]);
		// SMIL runs on the main thread, and the reduced-motion rule can't stop it.
		expect(FILES.filter((path) => /<(animate|animateTransform|animateMotion|set)\b/.test(read(path)))).toEqual([]);
	});

	test('paints only with tokens', () => {
		const literal = /#[0-9a-f]{3,8}\b|\b(rgba?|hsla?)\(/i;
		expect(FILES.filter((path) => literal.test(read(path)))).toEqual([]);
		expect(FILES.filter((path) => paintValues(read(path)).some((value) => NAMED_COLOR.test(value)))).toEqual([]);
	});

	test("keeps each theme's pieces to that theme", () => {
		for (const path of PIECES) {
			const [themeId] = path.split('/');
			expect(THEMES.some((theme) => theme.id === themeId && themeId !== 'classic')).toBe(true);
			expect(read(path)).toContain('display: none');
			expect(read(path)).toContain(`:global(:root[data-theme='${themeId}'])`);
		}
	});

	// The flourishes rely on this rule for their still pose: each one's resting style is it.
	test('the reduced-motion rule still stops every animation', () => {
		const css = readFileSync(new URL('../../../app.css', import.meta.url), 'utf-8');
		const block = css.match(/@media \(prefers-reduced-motion: reduce\) \{\s*\*,\s*\*::before,\s*\*::after \{([^}]*)\}/);
		expect(block?.[1]).toContain('animation: none !important');
	});
});
