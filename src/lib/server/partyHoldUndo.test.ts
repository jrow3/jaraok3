import { describe, test, expect, beforeEach } from 'vitest';
import { PartyState } from './party';

const local = (singer: string, title: string) => ({
	source: 'local' as const,
	songId: 1,
	artist: 'Artist',
	title,
	singer
});

const pending = (singer: string, title: string) => ({
	source: 'youtube' as const,
	ytId: 'abc123',
	artist: 'Ch',
	title,
	singer,
	status: 'downloading' as const
});

// A party whose pause between songs is 5 s, on a clock stopped at 10 s.
const holding = () => new PartyState({ holdMs: () => 5000, now: () => 10_000 });

describe('PartyState: pause between songs and undo', () => {
	let party: PartyState;
	beforeEach(() => {
		party = new PartyState();
	});
	test('a song that follows another waits for the host’s pause and says who’s up; an idle start doesn’t', () => {
		const held = holding();
		const a = held.addOrStart(local('Priya', 'A'));
		expect(held.snapshot()).toMatchObject({ hold: null, isPlaying: true });
		held.add(local('Dave', 'B'));
		held.nextFrom(a.id, 'sung');
		expect(held.snapshot()).toMatchObject({
			current: { singer: 'Dave' },
			hold: { until: 15_000, next: { singer: 'Dave', title: 'B', artist: 'Artist' } },
			isPlaying: false
		});
	});

	test('nothing holds with the pause off, or when the line has run dry', () => {
		const a = party.addOrStart(local('Priya', 'A'));
		party.add(local('Dave', 'B'));
		party.nextFrom(a.id, 'sung');
		expect(party.snapshot()).toMatchObject({ hold: null, isPlaying: true });
		const held = holding();
		const c = held.addOrStart(local('Sam', 'C'));
		held.nextFrom(c.id, 'sung');
		expect(held.snapshot()).toMatchObject({ current: null, hold: null });
	});

	test('a hold ends only at its own time, and then the song plays', () => {
		const held = holding();
		const a = held.addOrStart(local('Priya', 'A'));
		held.add(local('Dave', 'B'));
		held.nextFrom(a.id, 'sung');
		expect(held.endHold(9_000)).toBe(false);
		expect(held.endHold(15_000)).toBe(true);
		expect(held.snapshot()).toMatchObject({ hold: null, isPlaying: true });
	});

	test('the host cuts a hold short: Play plays, Pause stays paused, Next holds the next, Restart plays', () => {
		const held = holding();
		const ids = ['A', 'B', 'C', 'D'].map((title) => held.add(local('Sam', title)).id);
		held.startIfIdle();
		held.nextFrom(ids[0], 'sung');
		held.play();
		expect(held.snapshot()).toMatchObject({ hold: null, isPlaying: true });
		held.nextFrom(ids[1], 'skipped');
		held.pause();
		expect(held.snapshot()).toMatchObject({ hold: null, isPlaying: false });
		expect(held.endHold(15_000)).toBe(false);
		held.nextFrom(ids[2], 'skipped');
		expect(held.snapshot().hold?.next.title).toBe('D');
		held.restartCurrent();
		expect(held.snapshot()).toMatchObject({ hold: null, isPlaying: true });
	});

	test('undoing a removal puts the song back in its place, with its id and owner', () => {
		party.addOrStart(local('Zoe', 'On stage'));
		party.add(local('Priya', 'A'));
		const b = party.add({ ...local('Dave', 'B'), owner: 'dave' });
		party.add(local('Sam', 'C'));
		party.remove(b.id, 'removed');
		expect(party.unremove(b.id, 1)).toMatchObject({ id: b.id, owner: 'dave' });
		const snap = party.snapshot();
		expect(snap.queue.map((item) => item.singer)).toEqual(['Priya', 'Dave', 'Sam']);
		expect(snap.ended).toEqual([]);
	});

	test('a removal the owner made can be undone too, but only once', () => {
		party.addOrStart(local('Zoe', 'On stage'));
		const a = party.add(local('Priya', 'A'));
		party.remove(a.id);
		expect(party.unremove(a.id, 5)).toMatchObject({ id: a.id });
		expect(party.snapshot().queue.map((item) => item.id)).toEqual([a.id]);
		expect(party.unremove(a.id, 0)).toBeNull();
	});

	test('undoing a skip brings the song back from the top and the next one back to the front', () => {
		const held = holding();
		const a = held.addOrStart(local('Priya', 'A'));
		const b = held.add(local('Dave', 'B'));
		const keyBefore = held.snapshot().playKey;
		held.nextFrom(a.id, 'skipped');
		expect(held.unskip(a.id)).toBe(true);
		const snap = held.snapshot();
		expect(snap.current?.id).toBe(a.id);
		expect(snap.queue.map((item) => item.id)).toEqual([b.id]);
		expect(snap).toMatchObject({ isPlaying: true, hold: null, sungCount: 0, history: [], ended: [] });
		expect(snap.playKey).toBe(keyBefore + 2);
	});

	test('a skip can’t be undone once another song has left the stage, and a sung song never', () => {
		const a = party.addOrStart(local('Priya', 'A'));
		const b = party.add(local('Dave', 'B'));
		party.add(local('Sam', 'C'));
		party.nextFrom(a.id, 'skipped');
		party.nextFrom(b.id, 'sung');
		expect(party.unskip(a.id)).toBe(false);
		expect(party.unskip(b.id)).toBe(false);
	});

	test('undoing a removal into an idle party starts the song at once, with no hold', () => {
		const held = holding();
		const a = held.addOrStart(local('Priya', 'A'));
		const b = held.add(local('Dave', 'B'));
		held.remove(b.id, 'removed');
		held.nextFrom(a.id);
		held.unremove(b.id, 0);
		expect(held.snapshot()).toMatchObject({ current: { id: b.id }, isPlaying: true, hold: null, queue: [] });
	});

	test('a download that finishes while removed comes back ready on undo', () => {
		const item = party.add(pending('Dave', 'B'));
		party.remove(item.id, 'removed');
		party.update(item.id, { status: 'ready' });
		party.unremove(item.id, 0);
		expect(party.snapshot()).toMatchObject({ current: { id: item.id, status: 'ready' }, isPlaying: true });
	});

	test('a failed download that is cleared away can’t be undone', () => {
		const item = party.add(pending('Dave', 'B'));
		party.update(item.id, { status: 'failed' });
		party.remove(item.id, 'failed');
		expect(party.unremove(item.id, 0)).toBeNull();
	});

	test('a download that fails while removed can’t be undone', () => {
		const item = party.add(pending('Dave', 'B'));
		party.remove(item.id, 'removed');
		party.update(item.id, { status: 'failed' });
		expect(party.unremove(item.id, 0)).toBeNull();
	});

	test('cleared failed downloads don’t push the host’s removals out of the undo memory', () => {
		party.addOrStart(local('Zoe', 'On stage'));
		const kept = party.add(local('Priya', 'A'));
		party.remove(kept.id, 'removed');
		for (let i = 0; i < 20; i++) {
			const item = party.add(pending('Dave', `B${i}`));
			party.update(item.id, { status: 'failed' });
			party.remove(item.id, 'failed');
		}
		expect(party.unremove(kept.id, 0)).toMatchObject({ id: kept.id });
	});

	test('guests taking back their own failed downloads don’t push the host’s removals out either', () => {
		party.addOrStart(local('Zoe', 'On stage'));
		const kept = party.add(local('Priya', 'A'));
		party.remove(kept.id, 'removed');
		for (let i = 0; i < 20; i++) {
			const item = party.add(pending('Dave', `B${i}`));
			party.update(item.id, { status: 'failed' });
			party.remove(item.id);
		}
		expect(party.unremove(kept.id, 0)).toMatchObject({ id: kept.id });
	});

	test('a skip can be undone only once', () => {
		const a = party.addOrStart(local('Priya', 'A'));
		party.add(local('Dave', 'B'));
		party.nextFrom(a.id, 'skipped');
		expect(party.unskip(a.id)).toBe(true);
		expect(party.unskip(a.id)).toBe(false);
	});

	test('only the last 20 removals can be undone', () => {
		party.addOrStart(local('Zoe', 'On stage'));
		const ids = Array.from({ length: 21 }, (_, i) => party.add(local('Priya', `T${i}`)).id);
		for (const id of ids) party.remove(id, 'removed');
		expect(party.unremove(ids[0], 0)).toBeNull();
		expect(party.unremove(ids[1], 0)).toMatchObject({ id: ids[1] });
	});

	test('a song that could not play leads into the hold like a finished one, and Undo cannot bring it back', () => {
		const held = holding();
		const broken = held.addOrStart(local('Priya', 'A'));
		held.add(local('Dave', 'B'));
		held.nextFrom(broken.id, 'failed');
		expect(held.snapshot()).toMatchObject({ current: { singer: 'Dave' }, hold: { next: { singer: 'Dave' } }, sungCount: 0 });
		expect(held.unskip(broken.id)).toBe(false);
		expect(held.snapshot()).toMatchObject({ current: { singer: 'Dave' }, sungCount: 0 });
	});
});
