import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { contrastRatio } from './contrast';
import { THEMES } from './themes';

describe('contrastRatio', () => {
	test('matches WCAG for black and white', () => {
		expect(contrastRatio('#000', '#ffffff')).toBeCloseTo(21, 5);
		expect(contrastRatio('#777777', '#777')).toBeCloseTo(1, 5);
	});

	test('judges a translucent surface over what it sits on', () => {
		expect(contrastRatio('#ffffff', 'rgba(0, 0, 0, 0)', '#ffffff')).toBeCloseTo(1, 5);
		expect(contrastRatio('#ffffff', 'rgba(0, 0, 0, 1)', '#ffffff')).toBeCloseTo(21, 5);
	});

	test('judges a tint over a translucent surface through both to the page', () => {
		const stacked = contrastRatio('#000', 'rgba(255, 255, 255, 0.5)', 'rgba(0, 0, 0, 0.5)', '#ffffff');
		expect(stacked).toBeCloseTo(contrastRatio('#000', 'rgb(191.25, 191.25, 191.25)'), 5);
	});
});

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf-8');

// Either quote style matches, so restyling a selector can't hide its rule.
function selectorPattern(selector: string): string {
	return selector.replace(/[[\]]/g, '\\$&').replaceAll("'", `['"]`);
}

// The `--name: value;` declarations of one rule, or none if the file has no such rule. Any spacing
// before the brace matches too.
function ruleTokens(css: string, selector: string): Record<string, string> {
	const rule = css.match(new RegExp(`${selectorPattern(selector)}\\s*\\{([^}]*)\\}`));
	if (!rule) return {};
	const body = rule[1].replace(/\/\*[\s\S]*?\*\//g, '');
	return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1], match[2].trim()]));
}

function resolve(tokens: Record<string, string>, name: string): string {
	if (name.startsWith('#')) return name;
	const value = tokens[name];
	if (value === undefined) throw new Error(`${name} has no value`);
	// A layered background is judged on its solid base: the stripes, glow and beams over it are decoration.
	const base = value.match(/(?:^|,\s*)(#[0-9a-f]{3,6}|var\((--[\w-]+)\))$/i);
	if (!base) return value;
	return base[2] ? resolve(tokens, base[2]) : base[1];
}

// A gradient with no solid base shows every stop somewhere, so text on it must read on each one.
function stops(tokens: Record<string, string>, name: string): string[] {
	const value = resolve(tokens, name);
	if (!value.includes('gradient(')) return [value];
	const colors = value.matchAll(/#[0-9a-f]{3,6}|rgba?\([^)]*\)|var\((--[\w-]+)\)/gi);
	return [...colors].map((match) => (match[1] ? resolve(tokens, match[1]) : match[0]));
}

interface Pair {
	text: string;
	on: string;
	/** The layers under a translucent `on`, top first, down to an opaque one. */
	over?: string[];
	/** WCAG AA for body text unless said otherwise. */
	min?: number;
}

const PHONE_PAIRS: Pair[] = [
	{ text: '--ink-hi', on: '--bg-0' },
	{ text: '--ink-hi', on: '--bg-1' },
	{ text: '--ink-mid', on: '--bg-0' },
	{ text: '--ink-mid', on: '--bg-1' },
	{ text: '--ink-hi', on: '--s2', over: ['--bg-0'] },
	{ text: '--ink-mid', on: '--s1', over: ['--bg-0'] },
	{ text: '--ink-mid', on: '--s2', over: ['--bg-0'] },
	{ text: '--accent', on: '--bg-0' },
	{ text: '--accent', on: '--s1', over: ['--bg-0'] },
	{ text: '--accent-ink', on: '--accent' },
	{ text: '--good-ink', on: '--good' },
	{ text: '--warn-ink', on: '--warn' },
	{ text: '--bad-ink', on: '--bad' },
	{ text: '--good', on: '--bg-0' },
	{ text: '--warn', on: '--bg-0' },
	{ text: '--bad', on: '--bg-0' },
	{ text: '--bad-soft', on: '--bg-0' },
	// The "You're singing" spotlight.
	{ text: '--on-brand', on: '--brand-gradient' },
	// A sticker's letters, beside the wordmark.
	{ text: '--sticker-ink', on: '--sticker' },
	// Tinted chips and tags (.chip, .tag-*, status pills, the NowBar's place, an open result), on a
	// card and on the page; a fresh lineup row's tint replaces its card.
	{ text: '--accent', on: '--accent-a10', over: ['--s1', '--bg-0'] },
	{ text: '--accent', on: '--accent-a10', over: ['--bg-0'] },
	{ text: '--accent', on: '--accent-a10', over: ['--surface-glass', '--bg-0'] },
	{ text: '--ink-mid', on: '--accent-a10', over: ['--bg-0'] },
	{ text: '--accent', on: '--accent-a18', over: ['--s1', '--bg-0'] },
	{ text: '--accent', on: '--accent-a18', over: ['--bg-0'] },
	{ text: '--good', on: '--good-a13', over: ['--s1', '--bg-0'] },
	{ text: '--good', on: '--good-a13', over: ['--bg-0'] },
	{ text: '--warn', on: '--warn-a14', over: ['--s1', '--bg-0'] },
	{ text: '--warn', on: '--warn-a14', over: ['--bg-0'] },
	{ text: '--bad', on: '--bad-a14', over: ['--s1', '--bg-0'] },
	{ text: '--bad', on: '--bad-a14', over: ['--bg-0'] },
	{ text: '--bad-soft', on: '--bad-a14', over: ['--s1', '--bg-0'] },
	{ text: '--bad-soft', on: '--bad-a14', over: ['--bg-0'] },
	// A chip, like the guest's name, on the page.
	{ text: '--chip-ink', on: '--chip-surface', over: ['--bg-0'] },
	// A disabled primary button's label.
	{ text: '--ink-hi', on: '--s3', over: ['--bg-0'] },
	// The plain CDG tag, on a card and on the page.
	{ text: '--ink-mid', on: '--tag-neutral', over: ['--s1', '--bg-0'] },
	{ text: '--ink-mid', on: '--tag-neutral', over: ['--bg-0'] },
	// The theme sheet's chips.
	{ text: '--accent', on: '--accent-a18', over: ['--s1', '--bg-1'] },
	// The singer's own row: the lineup and host cards, the "You're next" spotlight, the NowBar.
	...['--ink-hi', '--ink-mid', '--accent'].flatMap((text) =>
		['--s1', '--s2', '--surface-glass'].map((card) => ({ text, on: '--surface-now', over: [card, '--bg-0'] }))
	),
	// Toasts and the NowBar.
	{ text: '--ink-hi', on: '--surface-glass', over: ['--bg-0'] },
	{ text: '--ink-mid', on: '--surface-glass', over: ['--bg-0'] },
	// Placeholders and the smallest labels: Classic's level, the large-text floor.
	{ text: '--ink-low', on: '--bg-0', min: 3 },
	{ text: '--ink-low', on: '--s1', over: ['--bg-0'], min: 3 },
	{ text: '--ink-low', on: '--s2', over: ['--bg-0'], min: 3 }
];

// The phone header's wordmark: display-size letters, so the large-text floor.
const WORDMARK_PAIRS: Pair[] = ['--wm-body', '--wm-j', '--wm-3'].map((text) => ({ text, on: '--bg-0', min: 3 }));

const TV_GLASS_PAIRS: Pair[] = ['--tv-glass', '--tv-glass-quiet'].flatMap((glass) =>
	['--tv-page-bg', '--tv-stage-bg'].flatMap((base) =>
		['--ink-hi', '--ink-mid', '--accent', '--warn', '--bad'].map((text) => ({ text, on: glass, over: [base] }))
	)
);

// TV text is 28px and up, so WCAG's large-text floor of 3:1 is the bar there.
const TV_PAIRS: Pair[] = [
	{ text: '--ink-hi', on: '--tv-page-bg' },
	{ text: '--ink-mid', on: '--tv-page-bg' },
	{ text: '--accent', on: '--tv-page-bg' },
	{ text: '--warn', on: '--tv-page-bg' },
	{ text: '--accent-ink', on: '--accent' },
	{ text: '--sticker-ink', on: '--sticker' },
	{ text: '--ink-hi', on: '--tv-stage-bg' },
	{ text: '--ink-mid', on: '--tv-stage-bg' },
	...TV_GLASS_PAIRS,
	// Words laid over a video, which may be any picture: judged over a white frame and a black one.
	{ text: '--ink-hi', on: '--tv-scrim', over: ['#ffffff'] },
	{ text: '--ink-hi', on: '--tv-scrim', over: ['#000000'] },
	// The labels beside full-screen lyrics sit on the stage's own background.
	{ text: '--accent', on: '--tv-stage-bg' },
	// Phones scan the join code: black modules on the plate.
	{ text: '#000000', on: '--tv-qr-plate', min: 7 }
].map((pair) => ({ min: 3, ...pair }));

function failures(tokens: Record<string, string>, pairs: Pair[]): string[] {
	return pairs.flatMap(({ text, on, over = [], min = 4.5 }) => {
		const beneath = over.map((layer) => resolve(tokens, layer));
		const ratios = stops(tokens, text).flatMap((ink) => stops(tokens, on).map((stop) => contrastRatio(ink, stop, ...beneath)));
		const ratio = Math.min(...ratios);
		const where = [on, ...over].join(' over ');
		return ratio >= min ? [] : [`${text} on ${where}: ${ratio.toFixed(2)} (needs ${min})`];
	});
}

const rootTokens = ruleTokens(read('../../app.css'), ':root');

describe.each(THEMES)('the $id theme', ({ id }) => {
	// Classic is app.css's :root itself.
	const css = id === 'classic' ? '' : read(`./${id}.css`);
	const phoneTokens = ruleTokens(css, `:root[data-theme='${id}']`);
	const tvSelector = `:root[data-theme='${id}'][data-screen='tv']`;
	const tvTokens = ruleTokens(css, tvSelector);
	const hasTvPalette = new RegExp(selectorPattern(tvSelector)).test(css);

	// A rule the test can't find would be judged on Classic's colors and pass.
	test.runIf(id !== 'classic')('has a phone palette the test can find', () => {
		expect(Object.keys(phoneTokens)).not.toEqual([]);
	});

	test.runIf(hasTvPalette)('has a TV palette the test can find', () => {
		expect(Object.keys(tvTokens)).not.toEqual([]);
	});

	test('changes only tokens that have a default', () => {
		const unknown = Object.keys({ ...phoneTokens, ...tvTokens }).filter((name) => !(name in rootTokens));
		expect(unknown).toEqual([]);
	});

	test('keeps phone text readable', () => {
		expect(failures({ ...rootTokens, ...phoneTokens }, PHONE_PAIRS)).toEqual([]);
	});

	// A metallic wordmark's sheen runs through the page's own tone by design, so only letters
	// painted one flat color are judged.
	test('keeps a flat-painted phone wordmark readable', () => {
		const tokens = { ...rootTokens, ...phoneTokens };
		const flatPairs = WORDMARK_PAIRS.filter(({ text }) => new Set(stops(tokens, text)).size === 1);
		expect(failures(tokens, flatPairs)).toEqual([]);
	});

	test('keeps TV text readable', () => {
		expect(failures({ ...rootTokens, ...phoneTokens, ...tvTokens }, TV_PAIRS)).toEqual([]);
	});

	// /display's body paints --page-bg, so a phone page of the theme's own would show on the TV.
	const hasOwnPhonePage = '--page-bg' in phoneTokens && phoneTokens['--page-bg'] !== rootTokens['--page-bg'];
	test.runIf(hasOwnPhonePage)('gives the TV its own page background', () => {
		expect(tvTokens['--page-bg']).toBeDefined();
	});
});
