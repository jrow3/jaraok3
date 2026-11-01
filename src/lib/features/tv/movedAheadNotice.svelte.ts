import type { Party } from '$lib/party.svelte';
import type { QueueItem } from '$lib/types';
import { movedAheadNote, passedOver, type MovedAheadNote } from './movedAhead';
import { createReconnectGate } from './reconnectGate';

export const MOVED_AHEAD_MS = 8000;

// Tells the room when a song jumps ahead of a download that isn't ready.
export function createMovedAheadNotice(party: Party) {
	let note = $state<MovedAheadNote | null>(null);
	let noteSongId: string | null = null;
	let previousQueue: QueueItem[] = [];
	let previousCurrentId: string | null = null;
	const isHeld = $derived(!!party.state.hold);
	const checkSnapshot = createReconnectGate<Party['state']>();

	$effect(() => {
		const { current, queue } = party.state;
		if (!party.received) return;
		const verdict = checkSnapshot(party.state, party.connected);
		if (verdict === 'wait') return;
		const currentId = current?.id ?? null;
		const isNewSong = verdict === 'judge' && !!current && currentId !== previousCurrentId;
		const passed = current && isNewSong ? passedOver(previousQueue, current.id) : [];
		if (current && passed.length > 0) {
			note = movedAheadNote(current.singer, passed);
			noteSongId = currentId;
		} else if (currentId !== noteSongId) {
			// The note is about one song; an undone skip puts another back on stage and makes it wrong.
			note = null;
		}
		previousCurrentId = currentId;
		// A hold's first snapshot already has the next song as current, so it is judged
		// against the queue from before the hold, once. Keeping that old queue for the rest
		// of the hold would let a skip during it announce downloads that have since finished.
		previousQueue = queue;
	});

	// A song passes a download only as the hold starts, and the stage isn't up until it ends.
	$effect(() => {
		if (!note || isHeld) return;
		const timer = setTimeout(() => (note = null), MOVED_AHEAD_MS);
		return () => clearTimeout(timer);
	});

	return {
		get note() {
			return note;
		}
	};
}
