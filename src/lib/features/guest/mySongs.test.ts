import { describe, test, expect } from 'vitest';
import { listMySongs, statusLabel, type MySong, type MySongStatus } from './mySongs';
import type { EndedItem, PartySnapshot, QueueItem, SongOutcome } from '../../types';

const ME = 'tag-me';
const item = (id: string, owner: string, status?: QueueItem['status']): QueueItem => ({
	id,
	source: 'local',
	artist: 'ABBA',
	title: `Song ${id}`,
	singer: 'Sam',
	owner,
	status
});
const ended = (id: string, owner: string, outcome: SongOutcome): EndedItem => ({ ...item(id, owner), outcome });
type Lineup = Pick<PartySnapshot, 'current' | 'queue' | 'ended'>;
const party = (overrides: Partial<Lineup>): Lineup => ({
	current: null,
	queue: [],
	ended: [],
	...overrides
});
const statuses = (songs: MySong[]) => songs.map((song) => [song.id, song.status]);

describe('listMySongs', () => {
	test('lists the song on stage, then the waiting ones in line order, then finished ones', () => {
		const songs = listMySongs(
			party({
				current: item('a', ME),
				queue: [item('b', 'them'), item('c', ME), item('d', ME)],
				ended: [ended('e', ME, 'sung')]
			}),
			ME
		);
		expect(statuses(songs)).toEqual([
			['a', 'singing'],
			['c', 'waiting'],
			['d', 'waiting'],
			['e', 'sung']
		]);
		expect(songs.map((song) => song.position)).toEqual([0, 2, 3, 0]);
	});

	test('your song is next when it is the first one ready to play', () => {
		const songs = listMySongs(party({ current: item('a', 'them'), queue: [item('b', ME), item('c', ME)] }), ME);
		expect(statuses(songs)).toEqual([
			['b', 'next'],
			['c', 'waiting']
		]);
	});

	test('a download ahead of you is passed over, so you are next', () => {
		const songs = listMySongs(
			party({ queue: [item('a', 'them', 'downloading'), item('b', ME), item('c', ME, 'downloading')] }),
			ME
		);
		expect(statuses(songs)).toEqual([
			['b', 'next'],
			['c', 'downloading']
		]);
	});

	test('a failed download says so while it is still in the line', () => {
		expect(statuses(listMySongs(party({ queue: [item('a', ME, 'failed')] }), ME))).toEqual([['a', 'failed']]);
	});

	test('keeps your last three finished songs and what happened to each', () => {
		const songs = listMySongs(
			party({
				ended: [
					ended('a', ME, 'removed'),
					ended('b', 'them', 'sung'),
					ended('c', ME, 'skipped'),
					ended('d', ME, 'failed'),
					ended('e', ME, 'sung')
				]
			}),
			ME
		);
		expect(statuses(songs)).toEqual([
			['a', 'removed'],
			['c', 'skipped'],
			['d', 'failed']
		]);
	});

	test('drops a finished song once the same song is back in line or on stage', () => {
		const again = (id: string) => ({ ...item(id, ME), title: 'Waterloo' });
		const songs = listMySongs(
			party({
				current: again('a'),
				queue: [{ ...again('b'), artist: 'abba', title: 'waterloo!' }],
				ended: [
					{ ...ended('c', ME, 'skipped'), title: 'Waterloo' },
					ended('d', ME, 'sung'),
					{ ...ended('e', 'them', 'sung'), title: 'Waterloo' }
				]
			}),
			ME
		);
		expect(statuses(songs)).toEqual([
			['a', 'singing'],
			['b', 'next'],
			['d', 'sung']
		]);
	});

	test('never lists another phone’s songs', () => {
		expect(listMySongs(party({ current: item('a', 'them'), queue: [item('b', 'them')] }), ME)).toEqual([]);
	});
});

describe('statusLabel', () => {
	test('gives the spot in line for a waiting song and plain words for the rest', () => {
		const label = (status: MySongStatus, position = 0) =>
			statusLabel({ id: 'a', title: 'T', artist: 'A', status, position });
		expect(label('waiting', 4)).toBe('#4 in line');
		expect(label('next')).toBe('Up next');
		expect(label('singing')).toBe('Singing now');
		expect(label('downloading')).toBe('Downloading');
		expect(label('sung')).toBe('Sung');
		expect(label('skipped')).toBe('Skipped');
		expect(label('removed')).toBe('Removed by the host');
		expect(label('failed')).toBe('Couldn\u2019t play');
	});
});
