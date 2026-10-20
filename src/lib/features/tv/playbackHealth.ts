import type { QueueItem } from '$lib/types';

// A local file starts in well under a second; one that shows no progress this long is stuck (B12).
export const STALL_LIMIT_MS = 10_000;

// Long enough to read the card, short enough that the room isn't left waiting (F8).
export const FAILURE_CARD_MS = 3000;

export interface PlaybackWatch {
	lastTime: number;
	lastMovedAt: number;
}

export function startWatch(now: number, lastTime = -1): PlaybackWatch {
	return { lastTime, lastMovedAt: now };
}

export function noteTime(watch: PlaybackWatch, time: number, now: number): PlaybackWatch {
	return time > watch.lastTime ? { lastTime: time, lastMovedAt: now } : watch;
}

export function hasStalled(watch: PlaybackWatch, now: number): boolean {
	return now - watch.lastMovedAt >= STALL_LIMIT_MS;
}

// YouTube's error codes for a video whose owner turned off embedding: it can still be
// sung from a download, so it isn't a failure like a missing or private video.
export function isEmbedBlocked(item: Pick<QueueItem, 'source' | 'ytId'>, errorCode: number | undefined): boolean {
	return item.source === 'youtube' && !!item.ytId && (errorCode === 101 || errorCode === 150);
}

export function failureMessage(title: string, isEmbedBlocked: boolean): string {
	return isEmbedBlocked ? `Downloading ${title}, plays when ready` : `Couldn\u2019t play ${title}, skipping`;
}
