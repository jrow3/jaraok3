import type { QueueItem } from '../../types';

export function sungLabel(count: number): string {
	return `${count} ${count === 1 ? 'song' : 'songs'} sung`;
}

// With only downloads queued, an idle TV otherwise looks like nothing is happening.
export function downloadingLabel(queue: QueueItem[]): string | null {
	const count = queue.filter((item) => item.status === 'downloading').length;
	if (count === 0) return null;
	return `${count} ${count === 1 ? 'song' : 'songs'} downloading\u2026`;
}
