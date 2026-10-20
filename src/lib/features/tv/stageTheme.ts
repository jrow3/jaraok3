import type { DisplaySettings, PartySnapshot } from '../../types';
import type { ThemeId } from '../../themes/themes';

// The hold names the singer about to take the stage, so it wears their theme before the song does.
export function stageTheme(display: DisplaySettings, snapshot: Pick<PartySnapshot, 'current' | 'hold'>): ThemeId {
	if (!display.isSingerThemeShown) return display.tvTheme;
	const singerTheme = snapshot.hold ? snapshot.hold.next.theme : snapshot.current?.theme;
	return singerTheme ?? display.tvTheme;
}
