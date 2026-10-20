import { describe, test, expect, beforeEach } from 'vitest';
import { PartyState } from './party';

const youtube = (singer: string, title: string) => ({
	source: 'youtube' as const,
	ytId: 'pi-Odu9CDmw',
	artist: 'KaraFun',
	title,
	singer,
	owner: '0123456789abcdef'
});

const local = (singer: string, title: string) => ({ source: 'local' as const, songId: 1, artist: 'Abba', title, singer });

describe('a YouTube song the TV cannot embed', () => {
	let party: PartyState;
	beforeEach(() => {
		party = new PartyState();
	});

	test('a skip before it can no longer be undone, so the waiting singers keep their order', () => {
		const skipped = party.addOrStart(local('Sam', 'Mamma Mia'));
		const blocked = party.add(youtube('Priya', 'Lose Yourself'));
		party.add(local('Dave', 'Waterloo'));
		party.nextFrom(skipped.id, 'skipped');
		party.moveToDownload(blocked.id);
		expect(party.unskip(skipped.id)).toBe(false);
		expect(party.snapshot().current?.title).toBe('Waterloo');
	});

	test('leaves the stage for a download at the front of the line, still its guest’s', () => {
		const blocked = party.addOrStart(youtube('Priya', 'Lose Yourself'));
		party.add(local('Dave', 'Waterloo'));
		const download = party.moveToDownload(blocked.id);
		const snap = party.snapshot();
		expect(snap.current?.title).toBe('Waterloo');
		expect(snap.queue[0]).toEqual({
			...youtube('Priya', 'Lose Yourself'),
			status: 'downloading',
			id: download?.id
		});
		expect(download?.id).not.toBe(blocked.id);
	});

	test('is neither counted as sung nor recorded as ended', () => {
		const blocked = party.addOrStart(youtube('Priya', 'Lose Yourself'));
		party.moveToDownload(blocked.id);
		const snap = party.snapshot();
		expect(snap.sungCount).toBe(0);
		expect(snap.ended).toEqual([]);
		expect(snap.history).toEqual([]);
		expect(snap.current).toBeNull();
	});

	test('holds before the next song, as any change of singer does', () => {
		party = new PartyState({ holdMs: () => 7000, now: () => 1000 });
		const blocked = party.addOrStart(youtube('Priya', 'Lose Yourself'));
		party.add(local('Dave', 'Waterloo'));
		party.moveToDownload(blocked.id);
		expect(party.snapshot().hold).toMatchObject({ until: 8000, next: { singer: 'Dave' } });
	});

	test('a stale id changes nothing', () => {
		const blocked = party.addOrStart(youtube('Priya', 'Lose Yourself'));
		expect(party.moveToDownload('q000000000000')).toBeNull();
		expect(party.snapshot().current?.id).toBe(blocked.id);
	});

	test('a song that is not from YouTube is not moved', () => {
		const song = party.addOrStart(local('Dave', 'Waterloo'));
		expect(party.moveToDownload(song.id)).toBeNull();
		expect(party.snapshot().current?.id).toBe(song.id);
	});
});

describe('a YouTube song the TV cannot embed, with downloads switched off', () => {
	let party: PartyState;
	beforeEach(() => {
		party = new PartyState();
	});

	test('fails and leaves the stage, like any song that cannot play', () => {
		const blocked = party.addOrStart(youtube('Priya', 'Lose Yourself'));
		party.add(local('Dave', 'Waterloo'));
		expect(party.failBlockedYoutube(blocked.id)).toBe(true);
		expect(party.snapshot().ended).toContainEqual(expect.objectContaining({ id: blocked.id, outcome: 'failed' }));
		expect(party.snapshot().queue).toHaveLength(0);
	});

	test('a song that is not from YouTube, or a stale id, is left alone', () => {
		const song = party.addOrStart(local('Dave', 'Waterloo'));
		expect(party.failBlockedYoutube(song.id)).toBe(false);
		expect(party.failBlockedYoutube('q000000000000')).toBe(false);
		expect(party.snapshot().current?.id).toBe(song.id);
	});
});
