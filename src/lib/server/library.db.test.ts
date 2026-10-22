import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildIndex } from './library';

describe('buildIndex', () => {
	let dir: string;
	let dbPath: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'karaoke-idx-'));
		dbPath = join(dir, 'index.db');
	});
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	const touch = (name: string) => writeFileSync(join(dir, name), '');

	test('scans the folder into SQLite and makes songs FTS-searchable', () => {
		touch('10 Years - Beautiful [CB Karaoke].cdg');
		touch('10 Years - Beautiful [CB Karaoke].mp3');
		touch('B - AudioOnly [T].mp3');
		touch('C - Orphan [T].cdg');
		touch('D - Legacy [T].mp2');

		const stats = buildIndex({ libraryPath: dir, dbPath });
		expect(stats).toEqual({ songs: 2, withLyrics: 1, audioOnly: 1, videos: 0, orphanCdg: 1, skippedMp2: 1 });

		const db = new Database(dbPath, { readonly: true });
		try {
			const count = (db.prepare('SELECT COUNT(*) AS c FROM songs').get() as { c: number }).c;
			expect(count).toBe(2);

			const row = db.prepare("SELECT * FROM songs WHERE title = 'Beautiful'").get() as Record<
				string,
				unknown
			>;
			expect(row).toMatchObject({
				artist: '10 Years',
				title: 'Beautiful',
				disc_tag: 'CB Karaoke',
				has_lyrics: 1,
				mp3_rel: '10 Years - Beautiful [CB Karaoke].mp3',
				cdg_rel: '10 Years - Beautiful [CB Karaoke].cdg'
			});

			const hits = db
				.prepare(
					"SELECT s.title AS title FROM songs_fts f JOIN songs s ON s.id = f.rowid WHERE songs_fts MATCH 'beaut'"
				)
				.all() as { title: string }[];
			expect(hits.map((h) => h.title)).toContain('Beautiful');
		} finally {
			db.close();
		}
	});

	test('indexes a .mp4 from the downloads subfolder into video_rel with no mp3/cdg', () => {
		mkdirSync(join(dir, 'downloads'));
		writeFileSync(join(dir, 'downloads', 'Aladdin - A Whole New World [KaraFun].mp4'), '');
		const stats = buildIndex({ libraryPath: dir, dbPath });
		expect(stats).toMatchObject({ songs: 1, videos: 1 });

		const db = new Database(dbPath, { readonly: true });
		try {
			const row = db.prepare("SELECT * FROM songs WHERE title = 'A Whole New World'").get() as Record<
				string,
				unknown
			>;
			expect(row).toMatchObject({
				artist: 'Aladdin',
				disc_tag: 'KaraFun',
				has_lyrics: 1,
				mp3_rel: null,
				cdg_rel: null,
				video_rel: 'downloads/Aladdin - A Whole New World [KaraFun].mp4'
			});
		} finally {
			db.close();
		}
	});

	test('is idempotent — a second run replaces the index rather than duplicating', () => {
		touch('A - One [T].mp3');
		buildIndex({ libraryPath: dir, dbPath });
		const stats = buildIndex({ libraryPath: dir, dbPath });
		expect(stats.songs).toBe(1);

		const db = new Database(dbPath, { readonly: true });
		try {
			const count = (db.prepare('SELECT COUNT(*) AS c FROM songs').get() as { c: number }).c;
			expect(count).toBe(1);
		} finally {
			db.close();
		}
	});

	test('keeps every song id across a rescan, so queued songs, stars and plays still point at the same file', () => {
		touch('M - Middle [T].mp3');
		touch('Z - Last [T].mp3');
		buildIndex({ libraryPath: dir, dbPath });
		const idsByPath = () => {
			const db = new Database(dbPath, { readonly: true });
			try {
				const rows = db.prepare('SELECT id, mp3_rel AS rel FROM songs').all() as { id: number; rel: string }[];
				return Object.fromEntries(rows.map((row) => [row.rel, row.id]));
			} finally {
				db.close();
			}
		};
		const before = idsByPath();

		touch('A - First [T].mp3');
		rmSync(join(dir, 'Z - Last [T].mp3'));
		buildIndex({ libraryPath: dir, dbPath });
		const after = idsByPath();

		expect(after['M - Middle [T].mp3']).toBe(before['M - Middle [T].mp3']);
		expect(after['Z - Last [T].mp3']).toBeUndefined();
		expect(Object.keys(after).sort()).toEqual(['A - First [T].mp3', 'M - Middle [T].mp3']);
	});

	test('picks up lyrics added beside an indexed mp3 without changing its id', () => {
		touch('A - One [T].mp3');
		buildIndex({ libraryPath: dir, dbPath });
		touch('A - One [T].cdg');
		buildIndex({ libraryPath: dir, dbPath });

		const db = new Database(dbPath, { readonly: true });
		try {
			const rows = db.prepare('SELECT id, has_lyrics, cdg_rel FROM songs').all();
			expect(rows).toEqual([{ id: 1, has_lyrics: 1, cdg_rel: 'A - One [T].cdg' }]);
		} finally {
			db.close();
		}
	});

	describe('songs kept in folders', () => {
		beforeEach(() => {
			mkdirSync(join(dir, 'Pop', 'ABBA'), { recursive: true });
			writeFileSync(join(dir, 'Pop', 'ABBA', 'ABBA - Waterloo [SF Karaoke].mp3'), '');
			writeFileSync(join(dir, 'Pop', 'ABBA', 'ABBA - Waterloo [SF Karaoke].cdg'), '');
			touch('Queen - Bohemian Rhapsody [SC Karaoke].mp3');
		});
		afterEach(() => {
			delete process.env.LIBRARY_RECURSIVE;
		});

		const songPaths = () => {
			const db = new Database(dbPath, { readonly: true });
			try {
				return (db.prepare('SELECT mp3_rel AS rel FROM songs ORDER BY rel').all() as { rel: string }[]).map((row) => row.rel);
			} finally {
				db.close();
			}
		};

		test('are found in every subfolder by default, with paths the media route can serve', () => {
			const stats = buildIndex({ libraryPath: dir, dbPath });
			expect(stats).toMatchObject({ songs: 2, withLyrics: 1 });
			expect(songPaths()).toEqual(['Pop/ABBA/ABBA - Waterloo [SF Karaoke].mp3', 'Queen - Bohemian Rhapsody [SC Karaoke].mp3']);
		});

		test('are skipped with LIBRARY_RECURSIVE=off, which scans only the top folder and downloads/', () => {
			process.env.LIBRARY_RECURSIVE = 'off';
			expect(buildIndex({ libraryPath: dir, dbPath }).songs).toBe(1);
			expect(songPaths()).toEqual(['Queen - Bohemian Rhapsody [SC Karaoke].mp3']);
		});
	});
});
