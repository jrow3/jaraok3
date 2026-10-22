import type { QueueItem } from '../../types';

export interface MovedAheadNote {
	title: string;
	detail: string;
}

// The downloading songs that were ahead of `currentId` in the last queue the TV saw:
// the server passed over them because they weren't ready.
export function passedOver(previousQueue: QueueItem[], currentId: string): QueueItem[] {
	const index = previousQueue.findIndex((item) => item.id === currentId);
	return previousQueue.slice(0, Math.max(index, 0)).filter((item) => item.status === 'downloading');
}

export function movedAheadNote(singer: string, passed: QueueItem[]): MovedAheadNote {
	// The soft hyphen lets the TV's narrow bands break the long word where a reader expects.
	const detail =
		passed.length === 1
			? `${passed[0].singer}\u2019s song is still down\u00adloading`
			: `${passed.length} songs are still down\u00adloading`;
	return { title: `${singer} goes first`, detail };
}
