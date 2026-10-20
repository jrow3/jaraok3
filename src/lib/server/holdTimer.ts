import type { PartyState } from './party';

// One timer per hold. A hold the host cut short or replaced makes its timer do
// nothing, because endHold only ends the hold it was set for.
export function holdTimer(party: PartyState, onEnd: () => void): (until: number) => void {
	let scheduledHoldEnd: number | null = null;
	return (until) => {
		if (scheduledHoldEnd === until) return;
		scheduledHoldEnd = until;
		setTimeout(() => {
			if (party.endHold(until)) onEnd();
		}, until - Date.now());
	};
}
