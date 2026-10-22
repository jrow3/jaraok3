import type { QueueItem } from '../../types';
import { isPlayable } from '../../playable';

export interface JustAddedSong {
	id: string;
	singer: string;
	title: string;
	position: number;
}

export interface DownloadNote {
	text: string;
	isFailed: boolean;
}

// The same rule as the server's advance(), so the TV names the songs that will really play, in order.
export function upNextSongs(queue: QueueItem[], count: number): QueueItem[] {
	return queue.filter(isPlayable).slice(0, count);
}

// A song in line that can't play yet, anywhere in the queue: its download hasn't finished, or failed.
export function downloadNote(queue: QueueItem[]): DownloadNote | null {
	const item = queue.find((queued) => queued.status === 'downloading' || queued.status === 'failed');
	if (!item) return null;
	const isFailed = item.status === 'failed';
	// The soft hyphen lets the TV's narrow bands break the long word where a reader expects.
	const text = isFailed
		? `${item.singer}\u2019s song couldn\u2019t download`
		: `${item.singer}\u2019s song is down\u00adloading, plays when ready`;
	return { text, isFailed };
}

// Read from the live queue, so a rename or a reorder shows at once and a removed song disappears.
export function describeJustAdded(id: string | null, queue: QueueItem[]): JustAddedSong | null {
	const index = queue.findIndex((item) => item.id === id);
	if (index === -1) return null;
	const { singer, title } = queue[index];
	return { id: queue[index].id, singer, title, position: index + 1 };
}

// Judged against every id seen tonight, not only the last queue: undoing a skip or a removal
// brings a song back with its old id, and that isn't news.
export function latestArrival(seenIds: ReadonlySet<string>, ids: string[]): string | undefined {
	return ids.filter((id) => !seenIds.has(id)).at(-1);
}
