import { describe, test, expect, beforeEach } from 'vitest';
import { PartyState } from './party';

const local = (singer: string, title: string) => ({
	source: 'local' as const,
	songId: 1,
	artist: 'Artist',
	title,
	singer,
	theme: 'onair' as const
});

const youtube = (singer: string, title: string) => ({
	source: 'youtube' as const,
	ytId: 'pi-Odu9CDmw',
	artist: 'KaraFun',
	title,
	singer,
	theme: 'disco' as const
});

describe('PartyState: the theme a song was added with', () => {
	let party: PartyState;
	beforeEach(() => {
		party = new PartyState();
	});

	test('stays on the song in line and on stage', () => {
		party.addOrStart(local('Priya', 'A'));
		party.add(local('Dave', 'B'));
		const { current, queue } = party.snapshot();
		expect(current?.theme).toBe('onair');
		expect(queue[0].theme).toBe('onair');
	});

	test('survives a download finishing', () => {
		const item = party.add({ ...youtube('Priya', 'A'), status: 'downloading' });
		party.update(item.id, { source: 'local-video', songId: 9, status: 'ready' });
		expect(party.queued(item.id)?.theme).toBe('disco');
	});

	test('survives a move to a download when the TV cannot embed the song', () => {
		const blocked = party.addOrStart(youtube('Priya', 'A'));
		expect(party.moveToDownload(blocked.id)?.theme).toBe('disco');
	});

	test('survives a removal and its undo', () => {
		party.addOrStart(local('Priya', 'A'));
		const waiting = party.add(local('Dave', 'B'));
		party.remove(waiting.id, 'removed');
		expect(party.unremove(waiting.id, 0)?.theme).toBe('onair');
	});

	test('survives a skip and its undo', () => {
		const skipped = party.addOrStart(local('Priya', 'A'));
		party.add(youtube('Dave', 'B'));
		party.nextFrom(skipped.id, 'skipped');
		party.unskip(skipped.id);
		const { current, queue } = party.snapshot();
		expect(current?.theme).toBe('onair');
		expect(queue[0].theme).toBe('disco');
	});

	test('survives a requeue', () => {
		expect(party.requeueToFront(youtube('Priya', 'A')).theme).toBe('disco');
	});

	test('rides along in the hold before the song', () => {
		const held = new PartyState({ holdMs: () => 5000, now: () => 10_000 });
		const first = held.addOrStart(local('Priya', 'A'));
		held.add(youtube('Dave', 'B'));
		held.nextFrom(first.id, 'sung');
		expect(held.snapshot().hold?.next).toEqual({ singer: 'Dave', title: 'B', artist: 'KaraFun', theme: 'disco' });
	});
});
