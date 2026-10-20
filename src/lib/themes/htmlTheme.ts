import { THEMES, themeById, type ThemeId } from './themes';

export type Screen = 'phone' | 'tv';

export interface ThemedPage {
	theme: ThemeId;
	screen: Screen;
	/** 'host': the TV theme the host picked (the TV and the host page); 'phone': each phone's own. */
	themeFrom: 'host' | 'phone';
}

const THEME_COLORS = JSON.stringify(Object.fromEntries(THEMES.map((theme) => [theme.id, theme.background])));

// Fills app.html's theme placeholders. The TV and the host page get the host's theme here,
// before any paint; a guest phone gets the default plus every theme's bar color, so the
// inline script can swap in the phone's own theme before the first paint.
export function fillThemePlaceholders(html: string, page: ThemedPage): string {
	return html
		.replace('%karaoke.theme%', page.theme)
		.replace('%karaoke.screen%', page.screen)
		.replace('%karaoke.theme-from%', page.themeFrom)
		.replace('%karaoke.theme-color%', themeById(page.theme).background)
		.replace('%karaoke.theme-colors%', THEME_COLORS);
}
