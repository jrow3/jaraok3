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


describe('PartyState', () => {
	let party: PartyState;
	beforeEach(() => {
		party = new PartyState();
	});

	test('is full once 200 songs are waiting', () => {
		for (let i = 0; i < 199; i++) party.add(local('Priya', `Song ${i}`));
		expect(party.isFull).toBe(false);
		party.add(local('Priya', 'Song 199'));
		expect(party.isFull).toBe(true);
	});

	test('starts empty and not playing', () => {
		expect(party.snapshot()).toEqual({
			current: null,
			isPlaying: false,
			queue: [],
			history: [],
			playKey: 0,
			sungCount: 0,
			sung: [],
			ended: [],
			hold: null
		});
	});

	test('advance records finished songs in history, newest first, capped at 5', () => {
		for (let i = 1; i <= 7; i++) party.add(local(`S${i}`, `T${i}`));
		for (let i = 0; i < 7; i++) party.advance();
		const snap = party.snapshot();
		expect(snap.current?.singer).toBe('S7');
		expect(snap.history.map((h) => h.singer)).toEqual(['S6', 'S5', 'S4', 'S3', 'S2']);
	});

	test('add appends items with stable ids in order', () => {
		const a = party.add(local('Priya', 'Africa'));
		const b = party.add(local('Dave', 'Wonderwall'));
		expect(a.id).not.toBe(b.id);
		expect(party.snapshot().queue.map((i) => i.singer)).toEqual(['Priya', 'Dave']);
	});

	test('remove drops an item by id', () => {
		const a = party.add(local('Priya', 'Africa'));
		party.add(local('Dave', 'Wonderwall'));
		party.remove(a.id);
		expect(party.snapshot().queue.map((i) => i.singer)).toEqual(['Dave']);
	});

	test('reorder rearranges by id list and keeps any omitted items at the end', () => {
		const a = party.add(local('Priya', 'A'));
		const b = party.add(local('Dave', 'B'));
		const c = party.add(local('Sam', 'C'));
		party.reorder([c.id, a.id]);
		expect(party.snapshot().queue.map((i) => i.singer)).toEqual(['Sam', 'Priya', 'Dave']);
		expect(b.id).toBeDefined();
	});

	test('advance promotes the first waiting item to current and starts playing', () => {
		party.add(local('Priya', 'Africa'));
		party.add(local('Dave', 'Wonderwall'));
		const now = party.advance();
		expect(now?.singer).toBe('Priya');
		const snap = party.snapshot();
		expect(snap.current?.singer).toBe('Priya');
		expect(snap.isPlaying).toBe(true);
		expect(snap.queue.map((i) => i.singer)).toEqual(['Dave']);
	});

	test('advance past the last item clears current and stops', () => {
		party.add(local('Priya', 'Africa'));
		party.advance();
		const now = party.advance();
		expect(now).toBeNull();
		expect(party.snapshot()).toMatchObject({ current: null, isPlaying: false });
	});

	test('pause and play toggle playback intent (play only with a current)', () => {
		party.play();
		expect(party.snapshot().isPlaying).toBe(false); // nothing to play yet
		party.add(local('Priya', 'Africa'));
		party.advance();
		party.pause();
		expect(party.snapshot().isPlaying).toBe(false);
		party.play();
		expect(party.snapshot().isPlaying).toBe(true);
	});

	test('position reports a singer 1-based spot in the waiting line (0 if not waiting)', () => {
		party.add(local('Priya', 'A'));
		const mine = party.add(local('Sam', 'C'));
		expect(party.position(mine.id)).toBe(2);
		party.advance(); // Priya becomes current
		expect(party.position(mine.id)).toBe(1);
		expect(party.position('nope')).toBe(0);
	});

	test('addOrStart plays the song immediately when nothing is current', () => {
		const item = party.addOrStart(local('Priya', 'Africa'));
		const snap = party.snapshot();
		expect(snap.current?.id).toBe(item.id);
		expect(snap.isPlaying).toBe(true);
		expect(snap.queue).toHaveLength(0);
	});

	test('addOrStart just queues when a song is already playing', () => {
		party.addOrStart(local('Priya', 'Africa'));
		party.addOrStart(local('Dave', 'Wonderwall'));
		expect(party.snapshot().current?.singer).toBe('Priya');
		expect(party.snapshot().queue.map((i) => i.singer)).toEqual(['Dave']);
	});

	test('a pending (downloading) item does not auto-play on an idle party', () => {
		party.add(pending('Sam', 'DL'));
		expect(party.snapshot().current).toBeNull();
		expect(party.snapshot().queue).toHaveLength(1);
	});

	test('advance skips a still-downloading item and plays the next ready one', () => {
		party.add(pending('Sam', 'DL')); // downloading, at the front
		party.add(local('Priya', 'Africa')); // ready, behind it
		expect(party.advance()?.singer).toBe('Priya');
		expect(party.snapshot().queue.map((i) => i.singer)).toEqual(['Sam']); // left in place
	});

	test('advance leaves current null when only downloading items remain', () => {
		party.add(pending('Sam', 'DL'));
		expect(party.advance()).toBeNull();
		expect(party.snapshot().queue).toHaveLength(1);
	});

	test('advance skips a failed item too', () => {
		const f = party.add(pending('Sam', 'DL'));
		party.update(f.id, { status: 'failed' });
		party.add(local('Priya', 'Africa'));
		expect(party.advance()?.singer).toBe('Priya');
	});

	test('update patches a queued item in place, keeping its id', () => {
		const item = party.add(pending('Sam', 'DL'));
		const updated = party.update(item.id, { source: 'local-video', songId: 42, status: 'ready' });
		expect(updated?.id).toBe(item.id);
		expect(party.snapshot().queue[0]).toMatchObject({
			source: 'local-video',
			songId: 42,
			status: 'ready'
		});
	});

	test('update keeps the id of the current item and bumps playKey to remount the player', () => {
		const item = party.addOrStart(local('Priya', 'Africa'));
		const before = party.snapshot().playKey;
		const updated = party.update(item.id, { title: 'New' });
		expect(updated?.id).toBe(item.id);
		expect(party.snapshot().current).toMatchObject({ id: item.id, title: 'New' });
		expect(party.snapshot().playKey).toBe(before + 1);
	});

	test('startIfIdle promotes a ready item, and is a no-op while playing', () => {
		party.add(local('Priya', 'Africa'));
		party.startIfIdle();
		expect(party.snapshot().current?.singer).toBe('Priya');
		party.add(local('Dave', 'Wonderwall'));
		party.startIfIdle();
		expect(party.snapshot().current?.singer).toBe('Priya');
	});

	test('ids are not sequential and do not repeat across instances', () => {
		const a = party.add(local('Priya', 'A'));
		const other = new PartyState();
		const b = other.add(local('Dave', 'B'));
		expect(a.id).not.toBe(b.id);
		expect(a.id).not.toMatch(/^q\d+$/);
	});

	test('restart keeps the id and bumps playKey', () => {
		const item = party.addOrStart(local('Priya', 'Africa'));
		const before = party.snapshot().playKey;
		party.restartCurrent();
		expect(party.snapshot().current?.id).toBe(item.id);
		expect(party.snapshot().playKey).toBe(before + 1);
		expect(party.snapshot().isPlaying).toBe(true);
	});

	test('each new current song bumps playKey', () => {
		party.add(local('Priya', 'A'));
		party.add(local('Dave', 'B'));
		party.advance();
		const k1 = party.snapshot().playKey;
		party.advance();
		expect(party.snapshot().playKey).toBe(k1 + 1);
	});

	test('sungCount counts every finished song, beyond the 5-item history', () => {
		for (let i = 1; i <= 8; i++) party.add(local(`S${i}`, `T${i}`));
		for (let i = 0; i < 8; i++) party.advance();
		party.advance(); // finishes the 8th
		expect(party.snapshot().sungCount).toBe(8);
		expect(party.snapshot().history).toHaveLength(5);
	});

	test('sung lists the songKey of every song that has been current, once each', () => {
		party.add(local('Priya', 'Africa'));
		party.add(local('Dave', 'Africa')); // same song, another singer
		party.add(local('Sam', 'Wonderwall'));
		party.advance();
		party.advance();
		party.advance();
		expect(party.snapshot().sung).toEqual(['artist|africa', 'artist|wonderwall']);
	});

	test('nextFrom advances only when the given id is the current song', () => {
		const a = party.addOrStart(local('Priya', 'A'));
		party.add(local('Dave', 'B'));
		expect(party.nextFrom('not-current')).toBe(false);
		expect(party.snapshot().current?.id).toBe(a.id);
		expect(party.nextFrom(a.id)).toBe(true);
		expect(party.snapshot().current?.singer).toBe('Dave');
		expect(party.nextFrom(a.id)).toBe(false); // a replayed "next" for the old song is ignored
		expect(party.snapshot().current?.singer).toBe('Dave');
	});

	test('the song on stage is near its end only in its last 45 seconds', () => {
		const a = party.addOrStart(local('Priya', 'A'));
		expect(party.isNearEnd()).toBe(false);
		party.noteProgress(a.id, 100, 200);
		expect(party.isNearEnd()).toBe(false);
		party.noteProgress(a.id, 155, 200);
		expect(party.isNearEnd()).toBe(true);
	});

	test('progress for any song but the one on stage is ignored', () => {
		const a = party.addOrStart(local('Priya', 'A'));
		party.add(local('Dave', 'B'));
		party.noteProgress('not-current', 190, 200);
		expect(party.isNearEnd()).toBe(false);
		party.noteProgress(a.id, 190, 200);
		party.nextFrom(a.id);
		expect(party.isNearEnd()).toBe(false); // the next song starts from the top
	});

	test('a restarted song is back at the top, not near its end', () => {
		const a = party.addOrStart(local('Priya', 'A'));
		party.noteProgress(a.id, 190, 200);
		party.restartCurrent();
		expect(party.isNearEnd()).toBe(false);
	});

	test('a song of unknown length is never near its end', () => {
		const a = party.addOrStart(local('Priya', 'A'));
		party.noteProgress(a.id, 10, 0);
		expect(party.isNearEnd()).toBe(false);
	});

	test('queued finds only queue items, not the current song', () => {
		const a = party.addOrStart(local('Priya', 'A'));
		const b = party.add(local('Dave', 'B'));
		expect(party.queued(a.id)).toBeNull();
		expect(party.queued(b.id)?.singer).toBe('Dave');
		expect(party.queued('nope')).toBeNull();
	});

	test('each song that leaves the stage is recorded, newest first, as sung or skipped', () => {
		const a = party.addOrStart(local('Priya', 'A'));
		const b = party.add(local('Dave', 'B'));
		party.nextFrom(a.id, 'sung');
		party.nextFrom(b.id, 'skipped');
		expect(party.snapshot().ended.map((item) => [item.id, item.outcome])).toEqual([
			[b.id, 'skipped'],
			[a.id, 'sung']
		]);
	});

	test('a removal is recorded only when it comes with a reason', () => {
		const a = party.add(local('Priya', 'A'));
		const b = party.add(local('Dave', 'B'));
		party.remove(a.id);
		party.remove(b.id, 'removed');
		expect(party.snapshot().ended.map((item) => [item.singer, item.outcome])).toEqual([['Dave', 'removed']]);
	});

	test('a failed download is recorded as failed, whoever clears it', () => {
		const item = party.add(pending('Sam', 'DL'));
		party.update(item.id, { status: 'failed' });
		party.remove(item.id, 'removed');
		expect(party.snapshot().ended[0]).toMatchObject({ id: item.id, outcome: 'failed' });
	});

	test('keeps only the last 50 songs that left', () => {
		const items = Array.from({ length: 55 }, (_, index) => party.add(local('Sam', `T${index}`)));
		for (const item of items) party.remove(item.id, 'removed');
		const ended = party.snapshot().ended;
		expect(ended).toHaveLength(50);
		expect(ended[0].title).toBe('T54');
	});

	test('rename changes only the waiting songs the check allows, never the one on stage', () => {
		const onStage = party.addOrStart({ ...local('Sam', 'A'), owner: 'me' });
		party.add({ ...local('Sam', 'B'), owner: 'me' });
		party.add({ ...local('Dave', 'C'), owner: 'them' });
		expect(party.rename((item) => item.owner === 'me', 'Samantha')).toBe(1);
		const snap = party.snapshot();
		expect(snap.current).toMatchObject({ id: onStage.id, singer: 'Sam' });
		expect(snap.queue.map((item) => item.singer)).toEqual(['Samantha', 'Dave']);
	});

	test('a song the TV could not play is recorded as failed and not counted as sung', () => {
		const broken = party.addOrStart(local('Priya', 'A'));
		party.add(local('Dave', 'B'));
		expect(party.nextFrom(broken.id, 'failed')).toBe(true);
		const snap = party.snapshot();
		expect(snap.ended[0]).toMatchObject({ id: broken.id, outcome: 'failed' });
		expect(snap.sungCount).toBe(0);
		expect(snap.current?.title).toBe('B');
	});
});
