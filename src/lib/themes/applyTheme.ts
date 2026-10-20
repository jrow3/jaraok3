import { themeById, type ThemeId } from './themes';

export function applyTheme(id: ThemeId): void {
	document.documentElement.dataset.theme = id;
	document.querySelector('meta[name="theme-color"]')!.setAttribute('content', themeById(id).background);
}
