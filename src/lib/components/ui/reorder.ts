// Both return null when nothing would change, so callers skip a pointless save.
function moveTo<T>(list: T[], from: number, to: number): T[] | null {
	const isInRange = (index: number) => index >= 0 && index < list.length;
	if (from === to || !isInRange(from) || !isInRange(to)) return null;
	const next = [...list];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved);
	return next;
}

export function moveBy<T>(list: T[], index: number, offset: number): T[] | null {
	return moveTo(list, index, index + offset);
}

export function moveBefore<T>(list: T[], from: number, before: number): T[] | null {
	return moveTo(list, from, from < before ? before - 1 : before);
}
