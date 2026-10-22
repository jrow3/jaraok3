import type { Party } from '$lib/party.svelte';
import { describeJustAdded, latestArrival } from './upNext';
import { createReconnectGate } from './reconnectGate';

const JUST_ADDED_MS = 10_000;

// The newest song added to the queue, for the stage's "Just added" card. It stays until the song
// leaves the queue; only its first JUST_ADDED_MS on stage are fresh.
export function createJustAddedNotice(party: Party) {
	let id = $state<string | null>(null);
	let isFresh = $state(false);
	// Never pruned: a party queues a few hundred songs at most.
	const seenIds = new Set<string>();
	const isHeld = $derived(!!party.state.hold);
	const checkSnapshot = createReconnectGate<Party['state']>();

	$effect(() => {
		const ids = party.state.queue.map((item) => item.id);
		// The placeholder before the first snapshot has an empty queue, and starting from it
		// made the last queued song on a rebooted kiosk look just added.
		if (!party.received) return;
		const verdict = checkSnapshot(party.state, party.connected);
		if (verdict === 'wait') return;
		const fresh = verdict === 'judge' ? latestArrival(seenIds, ids) : undefined;
		ids.forEach((queuedId) => seenIds.add(queuedId));
		if (!fresh) return;
		id = fresh;
		isFresh = true;
	});

	// The stage isn't up during the hold, so the card's time starts when the hold ends.
	$effect(() => {
		if (!isFresh || isHeld) return;
		const timer = setTimeout(() => (isFresh = false), JUST_ADDED_MS);
		return () => clearTimeout(timer);
	});

	return {
		get song() {
			return describeJustAdded(id, party.state.queue);
		},
		get isFresh() {
			return isFresh;
		}
	};
}
