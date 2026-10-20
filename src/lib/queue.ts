// The 1-based spot of a queue item among the waiting list, or 0 if it is no
// longer waiting (now playing, removed, or done).
export function queuePosition(queue: { id: string }[], id: string): number {
	const index = queue.findIndex((item) => item.id === id);
	return index === -1 ? 0 : index + 1;
}
