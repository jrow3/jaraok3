import type { LyricsLayout, QueueItem } from '../../types';

// Where the stage's words go: the rail beside letterboxed lyrics, the bands beside full-screen
// lyrics, or over a video.
export type StageSpot = 'rail' | 'band' | 'video';

// Video is 16:9 already, so only a CDG song follows the host's lyrics layout.
export function stageSpot(source: QueueItem['source'], layout: LyricsLayout): StageSpot {
	if (source !== 'local') return 'video';
	return layout === 'panel' ? 'rail' : 'band';
}

export interface UpNextMoment {
	isAlwaysShown: boolean;
	isNameShown: boolean;
	isNearEnd: boolean;
}

// Up next never leaves the stage, but mid-song it goes faint unless the host keeps it up: it comes
// back to full with the singer's name at the start and for the call near the end.
export function isUpNextFull({ isAlwaysShown, isNameShown, isNearEnd }: UpNextMoment): boolean {
	return isAlwaysShown || isNameShown || isNearEnd;
}
