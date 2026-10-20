import type { QueueItem } from './types';

// The server's advance() and the screens that predict it must agree on what can start,
// so they share this one rule: a download still running or failed has nothing to play.
export function isPlayable(item: Pick<QueueItem, 'status'>): boolean {
	return !item.status || item.status === 'ready';
}
