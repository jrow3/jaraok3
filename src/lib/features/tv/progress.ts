// The "Next: Sam, get ready" callout the owner kept from F7 starts this long before the end.
export const NEAR_END_SECONDS = 30;

export function isNearEnd(time: number, duration: number): boolean {
	return duration > 0 && duration - time <= NEAR_END_SECONDS;
}

export function remainingLabel(time: number, duration: number): string {
	const seconds = Math.max(0, Math.round(duration - time));
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
