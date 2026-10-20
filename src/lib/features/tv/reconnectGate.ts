export type SnapshotVerdict = 'wait' | 'reseed' | 'judge';

// The TV's notices compare each snapshot with the last one they saw. The first one, and the
// first after an outage, can only re-seed: what changed meanwhile isn't news, and judging it
// against a baseline from before the outage announces stale songs. The snapshot held while
// offline is still the state when `connect` fires, so the gate waits for a new one.
export function createReconnectGate<T>() {
	let isStale = true;
	let staleSnapshot: T | undefined;
	return (snapshot: T, isConnected: boolean): SnapshotVerdict => {
		if (!isConnected) {
			isStale = true;
			staleSnapshot = snapshot;
			return 'wait';
		}
		if (snapshot === staleSnapshot) return 'wait';
		if (!isStale) return 'judge';
		isStale = false;
		staleSnapshot = undefined;
		return 'reseed';
	};
}
