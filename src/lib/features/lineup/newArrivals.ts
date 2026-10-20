// On the first look (`previous` is null) nothing counts as new, so opening the
// page or switching tabs doesn't light up every row.
export function newArrivals(previous: string[] | null, current: string[]): string[] {
	if (previous === null) return [];
	const known = new Set(previous);
	return current.filter((id) => !known.has(id));
}
