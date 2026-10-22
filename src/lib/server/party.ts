import { randomBytes } from 'node:crypto';
import type { QueueItem, AddInput, PartySnapshot, PartyHold, EndedItem, SongOutcome } from '../types';
import { songKey } from '../songKey';
import { isPlayable } from '../playable';
export type { QueueItem, AddInput, PartySnapshot };

// Unguessable and unique across restarts, so a phone that remembers an old id can
// never match someone else's new song.
const newId = () => 'q' + randomBytes(6).toString('hex');

// Every phone's recent songs from a long night, while the snapshot stays small.
const MAX_ENDED = 50;

// Enough for a host who removes several songs in a row and then undoes them.
const MAX_REMOVED = 20;
const MAX_QUEUE = 200;
// A host's Next this close to the end is the singer finishing, not a skip: karaoke tracks
// often run a long outro after the last line.
const NEAR_END_SECONDS = 45;

type StageOutcome = Extract<SongOutcome, 'sung' | 'skipped' | 'failed'>;
type RemovalOutcome = Extract<SongOutcome, 'removed' | 'failed'>;

export interface PartyTiming {
	/** The host's pause between songs, read at each song change. None when left out. */
	holdMs?: () => number;
	now?: () => number;
}

// Server-side source of truth for the running party: the waiting queue, the
// current song, and play/pause intent. All three views render from its
// snapshot; the socket layer mutates it and broadcasts.
export class PartyState {
	private queue: QueueItem[] = [];
	private current: QueueItem | null = null;
	private history: QueueItem[] = [];
	private playing = false;
	private playKey = 0;
	private sungCount = 0;
	private sung: string[] = [];
	private ended: EndedItem[] = [];
	private removed: QueueItem[] = [];
	private progress: { id: string; time: number; duration: number } | null = null;
	private hold: PartyHold | null = null;
	// A song sent off to download leaves the stage without entering history, so history
	// alone can't tell unskip that the stage has moved on since the skip.
	private isSkipUndoClosed = false;

	constructor(private readonly timing: PartyTiming = {}) {}

	// Far past any real party; it stops a script from queueing without end.
	get isFull(): boolean {
		return this.queue.length >= MAX_QUEUE;
	}

	add(input: AddInput & { owner?: string }): QueueItem {
		const item: QueueItem = { ...input, id: newId() };
		this.queue.push(item);
		return item;
	}

	// Adds a song; if nothing is playing, it starts right away (so an idle party
	// self-starts on the first request instead of waiting for the host).
	addOrStart(input: AddInput & { owner?: string }): QueueItem {
		const item = this.add(input);
		if (this.current === null) this.advance();
		return item;
	}

	// Puts a song at the front of the queue (recovering one that was skipped).
	requeueToFront(input: AddInput & { owner?: string }): QueueItem {
		const item: QueueItem = { ...input, id: newId() };
		this.queue.unshift(item);
		if (this.current === null) this.advance();
		return item;
	}

	// Replays the current song from the start; playKey tells the display to remount.
	restartCurrent(): void {
		if (!this.current) return;
		this.playKey++;
		this.playing = true;
		this.hold = null;
		this.progress = null;
	}

	// Without an outcome nothing is recorded: the owner took it back themselves.
	remove(id: string, outcome?: RemovalOutcome): void {
		const item = this.queued(id);
		this.queue = this.queue.filter((queued) => queued.id !== id);
		if (!item) return;
		// A download that already failed stays "failed" even if the host clears it first.
		const ending = outcome && (item.status === 'failed' ? 'failed' : outcome);
		// Kept whoever removed it: the host's own songs carry no outcome but can be undone too.
		// A failed download gets no Undo, so it must not push real removals out of memory.
		if (item.status !== 'failed') this.removed = [item, ...this.removed].slice(0, MAX_REMOVED);
		if (ending) this.recordEnd(item, ending);
	}

	// Undo for a removal: the song goes back where it stood, keeping its id and
	// owner, so its guest can still remove it and their card shows it waiting again.
	unremove(id: string, index: number): QueueItem | null {
		const item = this.removed.find((removed) => removed.id === id);
		// A download can fail after it was removed; bringing it back would leave a row
		// nothing ever clears.
		if (!item || item.status === 'failed') return null;
		this.removed = this.removed.filter((removed) => removed.id !== id);
		this.ended = this.ended.filter((ended) => ended.id !== id);
		this.queue.splice(Math.min(index, this.queue.length), 0, item);
		if (this.current === null) this.advance();
		return item;
	}

	// Undo for the host's Next: the skipped song comes back on stage from the
	// top and the song that replaced it goes back to the front of the line. Only
	// while nothing else has left the stage since.
	unskip(id: string): boolean {
		const skipped = this.history[0];
		const wasSkipped = this.ended.some((ended) => ended.id === id && ended.outcome === 'skipped');
		if (skipped?.id !== id || !wasSkipped || this.isSkipUndoClosed) return false;
		if (this.current) this.queue.unshift(this.current);
		this.current = skipped;
		this.history = this.history.slice(1);
		this.ended = this.ended.filter((ended) => ended.id !== id);
		this.sungCount--;
		this.playKey++;
		this.playing = true;
		this.hold = null;
		return true;
	}

	// Renames waiting songs only: the one on stage keeps the name the TV is showing.
	rename(mayRename: (item: QueueItem) => boolean, singer: string): number {
		const count = this.queue.filter(mayRename).length;
		this.queue = this.queue.map((item) => (mayRename(item) ? { ...item, singer } : item));
		return count;
	}

	reorder(ids: string[]): void {
		const byId = new Map(this.queue.map((item) => [item.id, item]));
		const ordered = ids.map((id) => byId.get(id)).filter((item): item is QueueItem => !!item);
		const seen = new Set(ids);
		const remaining = this.queue.filter((item) => !seen.has(item.id));
		this.queue = [...ordered, ...remaining];
	}

	// Promotes the first playable item; a still-downloading (or failed) item is left
	// in place and skipped (it plays once it resolves, or the next ready song first).
	advance(outcome: StageOutcome = 'sung'): QueueItem | null {
		const hadSong = this.current !== null;
		if (this.current) {
			this.isSkipUndoClosed = false;
			this.history = [this.current, ...this.history].slice(0, 5);
			// A song that never played isn't one sung tonight; a skip still had a singer.
			if (outcome !== 'failed') this.sungCount++;
			this.recordEnd(this.current, outcome);
		}
		return this.promoteNext(hadSong);
	}

	// A YouTube song whose owner turned off embedding can still be sung from a download, so
	// it waits at the front of the line as one instead of ending: nothing is recorded, and
	// its guest's card keeps showing it as theirs.
	moveToDownload(id: string): QueueItem | null {
		const blocked = this.current;
		if (!blocked || !this.isBlockedYoutube(id)) return null;
		const download: QueueItem = { ...blocked, status: 'downloading', id: newId() };
		this.queue.unshift(download);
		this.isSkipUndoClosed = true;
		this.promoteNext(true);
		return download;
	}

	// With downloads switched off, a song the TV can't embed simply fails, like any song
	// that can't play. Only the YouTube song on stage can be reported as blocked.
	failBlockedYoutube(id: string): boolean {
		if (!this.isBlockedYoutube(id)) return false;
		this.advance('failed');
		return true;
	}

	private isBlockedYoutube(id: string): boolean {
		const blocked = this.current;
		return blocked?.id === id && blocked.source === 'youtube' && !!blocked.ytId;
	}

	// Advances only if `id` is still the current song. A display that reports the
	// end of a song, or a host tap that was delayed, can't skip the song after it.
	nextFrom(id: string, outcome: StageOutcome = 'sung'): boolean {
		if (!this.current || this.current.id !== id) return false;
		this.advance(outcome);
		return true;
	}

	// The TV's latest place in the song on stage; a report for any other song is stale.
	noteProgress(id: string, time: number, duration: number): void {
		if (this.current?.id === id) this.progress = { id, time, duration };
	}

	isNearEnd(): boolean {
		const progress = this.progress;
		if (!progress || progress.id !== this.current?.id || progress.duration <= 0) return false;
		return progress.duration - progress.time <= NEAR_END_SECONDS;
	}

	// Ends only the hold it was set for: the timer of a hold the host already cut
	// short, or one replaced by a newer song's hold, does nothing.
	endHold(until: number): boolean {
		if (this.hold?.until !== until) return false;
		this.hold = null;
		this.playing = true;
		return true;
	}

	// Never matches the current song: removing "your song" should not silently
	// no-op on the one that's actually playing.
	queued(id: string): QueueItem | null {
		return this.queue.find((item) => item.id === id) ?? null;
	}

	// Applies a patch to a queue item (or current) in place: flips an on-demand
	// download from a pending placeholder to a playable local video, or marks it
	// failed. If it's current, playKey tells the display to remount the player.
	update(id: string, patch: Partial<QueueItem>): QueueItem | null {
		if (this.current?.id === id) {
			this.current = { ...this.current, ...patch, id };
			this.playKey++;
			return this.current;
		}
		// A download that finishes while its song is removed must come back ready on Undo.
		this.removed = this.removed.map((item) => (item.id === id ? { ...item, ...patch, id } : item));
		const i = this.queue.findIndex((item) => item.id === id);
		if (i === -1) return null;
		this.queue[i] = { ...this.queue[i], ...patch, id };
		return this.queue[i];
	}

	// Starts playback if idle (e.g. after an on-demand download resolves to ready).
	startIfIdle(): void {
		if (this.current === null) this.advance();
	}

	// Pressing Play during a hold starts the song now.
	play(): void {
		if (!this.current) return;
		this.playing = true;
		this.hold = null;
	}

	// Pausing during a hold cancels it, so the song doesn't start by itself later.
	pause(): void {
		this.playing = false;
		this.hold = null;
	}

	position(id: string): number {
		return this.queue.findIndex((item) => item.id === id) + 1;
	}

	snapshot(): PartySnapshot {
		return {
			current: this.current,
			isPlaying: this.playing,
			queue: [...this.queue],
			history: [...this.history],
			playKey: this.playKey,
			sungCount: this.sungCount,
			sung: [...this.sung],
			ended: [...this.ended],
			hold: this.hold
		};
	}

	private promoteNext(isAfterSong: boolean): QueueItem | null {
		this.hold = null;
		const i = this.queue.findIndex(isPlayable);
		this.current = i === -1 ? null : this.queue.splice(i, 1)[0];
		this.playing = this.current !== null;
		if (this.current) {
			this.playKey++;
			const key = songKey(this.current.artist, this.current.title);
			if (!this.sung.includes(key)) this.sung.push(key);
			if (isAfterSong) this.startHold(this.current);
		}
		return this.current;
	}

	// B5: a song that follows another waits, paused, while the TV shows who's up, so
	// the next singer can get to the mic. An idle party's first song starts at once.
	private startHold(next: QueueItem): void {
		const delayMs = this.timing.holdMs?.() ?? 0;
		if (delayMs <= 0) return;
		const now = this.timing.now ?? Date.now;
		const { singer, title, artist, theme } = next;
		this.hold = { until: now() + delayMs, next: { singer, title, artist, theme } };
		this.playing = false;
	}

	private recordEnd(item: QueueItem, outcome: SongOutcome): void {
		this.ended = [{ ...item, outcome }, ...this.ended].slice(0, MAX_ENDED);
	}
}
