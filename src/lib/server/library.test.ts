import { describe, test, expect } from 'vitest';
import { buildSongRecords } from './library';

describe('buildSongRecords', () => {
	test('pairs a .cdg and .mp3 with the same stem into one song with lyrics', () => {
		const { records } = buildSongRecords([
			'10 Years - Beautiful [CB Karaoke].cdg',
			'10 Years - Beautiful [CB Karaoke].mp3'
		]);
		expect(records).toEqual([
			{
				artist: '10 Years',
				title: 'Beautiful',
				discTag: 'CB Karaoke',
				hasLyrics: true,
				mp3File: '10 Years - Beautiful [CB Karaoke].mp3',
				cdgFile: '10 Years - Beautiful [CB Karaoke].cdg',
				videoFile: null
			}
		]);
	});

	test('indexes a lone .mp4 (in a subfolder) as a video song with lyrics', () => {
		const { records, stats } = buildSongRecords([
			'downloads/Aladdin - A Whole New World [KaraFun].mp4'
		]);
		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({
			artist: 'Aladdin',
			title: 'A Whole New World',
			discTag: 'KaraFun',
			hasLyrics: true,
			mp3File: null,
			cdgFile: null,
			videoFile: 'downloads/Aladdin - A Whole New World [KaraFun].mp4'
		});
		expect(stats).toMatchObject({ songs: 1, videos: 1, withLyrics: 0 });
	});

	test('treats a lone .mp3 as an audio-only song (no lyrics)', () => {
		const { records } = buildSongRecords(['10 Years - Shoot It Out [SGK Karaoke].mp3']);
		expect(records).toHaveLength(1);
		expect(records[0]).toMatchObject({ hasLyrics: false, cdgFile: null, title: 'Shoot It Out' });
	});

	test('excludes a lone .cdg with no audio partner', () => {
		const { records, stats } = buildSongRecords(['Some Artist - Orphan [X Karaoke].cdg']);
		expect(records).toHaveLength(0);
		expect(stats.orphanCdg).toBe(1);
	});

	test('excludes .mp2 files entirely (browsers cannot decode them)', () => {
		const { records, stats } = buildSongRecords([
			'Weird - Old Track [Y Karaoke].mp2',
			'Weird - Old Track [Y Karaoke].cdg'
		]);
		expect(records).toHaveLength(0);
		expect(stats.skippedMp2).toBe(1);
		expect(stats.orphanCdg).toBe(1);
	});

	test('matches extensions case-insensitively', () => {
		const { records } = buildSongRecords(['Artist - Song.MP3', 'Artist - Song.CDG']);
		expect(records).toHaveLength(1);
		expect(records[0].hasLyrics).toBe(true);
	});

	test('reports accurate stats across a mixed batch', () => {
		const { stats } = buildSongRecords([
			'A - Paired [T].cdg',
			'A - Paired [T].mp3',
			'B - AudioOnly [T].mp3',
			'C - Orphan [T].cdg',
			'D - Legacy [T].mp2'
		]);
		expect(stats).toEqual({
			songs: 2,
			withLyrics: 1,
			audioOnly: 1,
			videos: 0,
			orphanCdg: 1,
			skippedMp2: 1
		});
	});
});
