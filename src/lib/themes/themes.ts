// Every theme the app can wear. A theme's tokens live in its CSS file beside this one; the
// colors here are only what the pickers draw and what a phone's browser bar takes.
export interface Theme {
	id: string;
	name: string;
	/** The phone page's background, also the phone's browser bar color. */
	background: string;
	/** The picker card's mini wordmark, as a phone shows it: letters, j and 3. */
	ink: string;
	j: string;
	three: string;
	/** The mini wordmark's lettering: the theme's own --wm-font and --wm-weight. */
	wordmarkFont: string;
	wordmarkWeight: number;
	/** The picker card's row of color chips. */
	swatches: readonly [string, string, string, string];
}

export const THEMES = [
	{
		id: 'tokyo',
		name: 'Tokyo Box',
		background: '#fff3dc',
		ink: '#1e1a16',
		j: '#d7263d',
		three: '#d7263d',
		wordmarkFont: "'Dela Gothic One', 'Zen Kaku Gothic New', sans-serif",
		wordmarkWeight: 400,
		swatches: ['#fff3dc', '#d7263d', '#ffc425', '#1faf6e']
	},
	{
		id: 'swiss',
		name: 'Swiss',
		background: '#f3f1ec',
		ink: '#111111',
		j: '#ff2e1f',
		three: '#ff2e1f',
		wordmarkFont: "'Archivo', 'Helvetica Neue', Helvetica, Arial, sans-serif",
		wordmarkWeight: 850,
		swatches: ['#f3f1ec', '#111111', '#ff2e1f', '#5b5954']
	},
	{
		id: 'chrome',
		name: 'Y2K Chrome',
		background: '#eef1f4',
		ink: '#1c2129',
		j: '#0a6fd6',
		three: '#5e8a00',
		wordmarkFont: "'Unbounded', 'Segoe UI', sans-serif",
		wordmarkWeight: 800,
		swatches: ['#c9ced6', '#6cd3ff', '#b8f400', '#0e1116']
	},
	{
		id: 'onair',
		name: 'On Air',
		background: '#15120f',
		ink: '#f2e8d2',
		j: '#e3321c',
		three: '#ffae3b',
		wordmarkFont: "'Michroma', 'Archivo', sans-serif",
		wordmarkWeight: 400,
		swatches: ['#15120f', '#c8c2b6', '#e3321c', '#ffae3b']
	},
	{
		id: 'gummy',
		name: 'Gummy Candy',
		background: '#fff4ea',
		ink: '#2b1a22',
		j: '#d6327a',
		three: '#d6327a',
		wordmarkFont: "'Modak', 'Baloo 2', sans-serif",
		wordmarkWeight: 400,
		swatches: ['#fff4ea', '#ff5fa2', '#ff8a2b', '#34d39e']
	},
	{
		id: 'disco',
		name: 'Disco Vinyl',
		background: '#22130c',
		ink: '#f4e4c1',
		j: '#e0701f',
		three: '#e8a91c',
		wordmarkFont: "'Fraunces', Georgia, serif",
		wordmarkWeight: 900,
		swatches: ['#22130c', '#e8a91c', '#e0701f', '#b5421f']
	},
	{
		id: 'classic',
		name: 'Classic',
		background: '#0b0910',
		ink: '#f2effa',
		j: '#c7b3ff',
		three: '#c7b3ff',
		wordmarkFont: "'Bricolage Grotesque', 'Segoe UI', sans-serif",
		wordmarkWeight: 800,
		swatches: ['#0b0910', '#c7b3ff', '#7a5af8', '#f2effa']
	}
] as const satisfies readonly Theme[];

export type ThemeId = (typeof THEMES)[number]['id'];

export const DEFAULT_PHONE_THEME: ThemeId = 'tokyo';
export const DEFAULT_TV_THEME: ThemeId = 'tokyo';

export function isThemeId(value: unknown): value is ThemeId {
	return THEMES.some((theme) => theme.id === value);
}

export function themeById(id: ThemeId): Theme {
	return THEMES.find((theme) => theme.id === id)!;
}
