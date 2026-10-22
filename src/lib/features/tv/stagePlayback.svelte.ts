import type { Party, PartyActionError } from '$lib/party.svelte';
import type { QueueItem } from '$lib/types';
import { FAILURE_CARD_MS, hasStalled, isEmbedBlocked, noteTime, startWatch } from './playbackHealth';
import { createReconnectGate } from './reconnectGate';

export type StagePlayback = ReturnType<typeof createStagePlayback>;

// Often enough for the server to know the song is in its last stretch; rare enough to stay quiet.
const PROGRESS_EVERY_SECONDS = 5;

// The song on stage: its progress, the stall watchdog, the couldn't-play card and the
// autoplay tap. Owned by the stage, so it starts fresh after the hold or the idle screen.
// A getter, because the stage reading its `party` prop at the top level trips Svelte's
// state_referenced_locally warning; the connection never changes, so one read is right.
export function createStagePlayback(getParty: () => Party) {
	const party = getParty();
	// Primitives, so a snapshot that changes something else doesn't reset the song.
	const playKey = $derived(party.state.playKey);
	const failure = createFailureReport(party);
	const end = createEndReport(party);
	const stall = createStallWatch(party, failure.fail, () => isBlocked || !!failure.shown || end.hasEnded);
	let progress = $state({ time: 0, duration: 0 });
	let isBlocked = $state(false);
	let retries = $state(0);
	let reportedAt = Number.NEGATIVE_INFINITY;

	$effect(() => {
		void playKey;
		failure.clear();
		end.clear();
		progress = { time: 0, duration: 0 };
		reportedAt = Number.NEGATIVE_INFINITY;
		isBlocked = false;
		stall.restart();
	});

	function ontime(time: number, duration: number) {
		progress = { time, duration };
		stall.noteTime(time);
		const id = party.state.current?.id;
		if (id && Math.abs(time - reportedAt) >= PROGRESS_EVERY_SECONDS) {
			reportedAt = time;
			party.progress(id, time, duration);
		}
	}

	function block() {
		isBlocked = true;
	}

	// The tap is a user gesture, so the remounted player may now start with sound.
	function retry() {
		isBlocked = false;
		retries++;
		stall.restart();
	}

	return {
		get progress() {
			return progress;
		},
		get failure() {
			return failure.shown;
		},
		get isBlocked() {
			return isBlocked;
		},
		get mountKey() {
			return `${playKey}:${retries}`;
		},
		ontime,
		ended: end.report,
		fail: failure.fail,
		block,
		retry
	};
}

// A local song that should be playing but whose time hasn't moved is stuck (B12).
function createStallWatch(party: Party, onstall: (item: QueueItem) => void, isExcused: () => boolean) {
	const isPlaying = $derived(party.state.isPlaying);
	let watch = startWatch(Date.now());

	// A pause is not a stall: the clock restarts when the song resumes.
	$effect(() => {
		if (isPlaying) watch = startWatch(Date.now(), watch.lastTime);
	});

	$effect(() => {
		const timer = setInterval(check, 1000);
		return () => clearInterval(timer);
	});

	function check() {
		const { current, hold } = party.state;
		// YouTube reports its own failures, and its ads and buffering would read as stalls.
		if (!current || current.source === 'youtube' || !isPlaying || hold || isExcused()) return;
		if (hasStalled(watch, Date.now())) onstall(current);
	}

	return {
		noteTime(time: number) {
			watch = noteTime(watch, time, Date.now());
		},
		restart() {
			watch = startWatch(Date.now());
		}
	};
}

// The song played to its end. A report lost to a dropout goes again once reconnected,
// or the party would sit on a finished song (and the stall watch would call it failed).
function createEndReport(party: Party) {
	let unsent = $state<string | null>(null);
	let hasEnded = false;
	const checkSnapshot = createReconnectGate<Party['state']>();

	$effect(() => {
		if (checkSnapshot(party.state, party.connected) === 'wait' || !unsent) return;
		const id = unsent;
		unsent = null;
		if (party.state.current?.id === id) report(id);
	});

	// The server refuses a stale id (another display, or the host already skipped).
	function report(id: string) {
		hasEnded = true;
		party.next(id).catch((error: PartyActionError) => {
			if (error.code === 'offline' || error.code === 'timeout') unsent = id;
		});
	}

	return {
		get hasEnded() {
			return hasEnded;
		},
		report,
		clear() {
			hasEnded = false;
			unsent = null;
		}
	};
}

interface StageFailure {
	item: QueueItem;
	/** Sung from a download instead of skipped: the card says so and the server queues it. */
	isEmbedBlocked: boolean;
}

// The couldn't-play card, and the report that moves the party on once it has been read.
function createFailureReport(party: Party) {
	let shown = $state<StageFailure | null>(null);
	let unsent = $state<StageFailure | null>(null);
	let reportTimer: ReturnType<typeof setTimeout> | undefined;
	const checkSnapshot = createReconnectGate<Party['state']>();

	// Judged on a fresh snapshot, not the one held from before an outage.
	$effect(() => {
		if (checkSnapshot(party.state, party.connected) === 'wait' || !unsent) return;
		const failure = unsent;
		unsent = null;
		if (party.state.current?.id === failure.item.id) report(failure);
	});

	$effect(() => () => clearTimeout(reportTimer));

	function fail(item: QueueItem, errorCode?: number) {
		if (shown || party.state.current?.id !== item.id) return;
		const failure = { item, isEmbedBlocked: isEmbedBlocked(item, errorCode) };
		shown = failure;
		reportTimer = setTimeout(() => report(failure), FAILURE_CARD_MS);
	}

	// Unsent, the card would stay up until the host acted, so it goes again once connected.
	// The server refuses a stale id (the host skipped meanwhile); nothing is left to do then.
	function report(failure: StageFailure) {
		const send = failure.isEmbedBlocked ? party.embedBlocked : party.failed;
		send(failure.item.id).catch((error: PartyActionError) => {
			if (error.code === 'offline' || error.code === 'timeout') unsent = failure;
		});
	}

	function clear() {
		clearTimeout(reportTimer);
		shown = null;
	}

	return {
		get shown() {
			return shown;
		},
		fail,
		clear
	};
}
