import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { PartyState } from './party';
import { holdTimer } from './holdTimer';

const local = (singer: string, title: string) => ({
	source: 'local' as const,
	songId: 1,
	artist: 'Artist',
	title,
	singer
});

describe('holdTimer', () => {
	let party: PartyState;
	let onEnd: ReturnType<typeof vi.fn<() => void>>;
	let endHoldLater: (until: number) => void;
	let ids: string[];
	// Schedules the end of whatever hold the party is in, as the socket's broadcast does.
	const scheduleCurrentHold = () => endHoldLater(party.snapshot().hold!.until);

	beforeEach(() => {
		vi.useFakeTimers();
		party = new PartyState({ holdMs: () => 5000 });
		onEnd = vi.fn<() => void>();
		endHoldLater = holdTimer(party, onEnd);
		ids = ['A', 'B', 'C'].map((title) => party.addOrStart(local('Priya', title)).id);
	});
	afterEach(() => vi.useRealTimers());

	test('the song starts once the pause is over', () => {
		party.nextFrom(ids[0]);
		scheduleCurrentHold();
		scheduleCurrentHold();
		vi.advanceTimersByTime(4999);
		expect(party.snapshot().isPlaying).toBe(false);
		vi.advanceTimersByTime(1);
		expect(party.snapshot()).toMatchObject({ isPlaying: true, hold: null });
		expect(onEnd).toHaveBeenCalledOnce();
	});

	test('a Pause during the pause leaves the song paused when its timer fires', () => {
		party.nextFrom(ids[0]);
		scheduleCurrentHold();
		party.pause();
		vi.advanceTimersByTime(5000);
		expect(party.snapshot().isPlaying).toBe(false);
		expect(onEnd).not.toHaveBeenCalled();
	});

	test('after Next then Next, only the newest pause’s timer starts the song', () => {
		party.nextFrom(ids[0]);
		scheduleCurrentHold();
		vi.advanceTimersByTime(2000);
		party.nextFrom(ids[1]);
		scheduleCurrentHold();
		vi.advanceTimersByTime(3000);
		expect(party.snapshot().isPlaying).toBe(false);
		expect(onEnd).not.toHaveBeenCalled();
		vi.advanceTimersByTime(2000);
		expect(party.snapshot()).toMatchObject({ current: { id: ids[2] }, isPlaying: true });
		expect(onEnd).toHaveBeenCalledOnce();
	});
});
