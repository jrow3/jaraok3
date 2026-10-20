import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildIndex, indexVideoFile } from './library';
import { getDb } from './db';
import { getSong, searchLocal } from './search';

describe('indexVideoFile', () => {
	let dir: string;

	beforeAll(() => {
		dir = mkdtempSync(join(tmpdir(), 'karaoke-idxvid-'));
		// A base library so the schema (+ FTS) exist and getDb can open the file.
		writeFileSync(join(dir, 'Toto - Africa [SC Karaoke].mp3'), '');
		const dbPath = join(dir, 'index.db');
		buildIndex({ libraryPath: dir, dbPath });
		process.env.DB_PATH = dbPath; // getDb() reads this
	});
	afterAll(() => {
		getDb().close(); // release the file lock before removing the temp dir (Windows)
		rmSync(dir, { recursive: true, force: true });
	});

	test('inserts a searchable local-video row and returns parsed metadata', () => {
		const rel = 'downloads/Aladdin - A Whole New World [KaraFun].mp4';
		const { songId, artist, title, discTag } = indexVideoFile(rel);
		expect({ artist, title, discTag }).toEqual({
			artist: 'Aladdin',
			title: 'A Whole New World',
			discTag: 'KaraFun'
		});

		const song = getSong(getDb(), songId);
		expect(song).toMatchObject({ video_rel: rel, mp3_rel: null, cdg_rel: null, has_lyrics: 1 });

		const hit = searchLocal(getDb(), 'whole new world').find((r) => r.id === songId);
		expect(hit).toMatchObject({ source: 'local-video' });
	});

	test('dedupes on video_rel: re-indexing the same file returns the same id', () => {
		const rel = 'downloads/Queen - Bohemian Rhapsody [KaraFun].mp4';
		const first = indexVideoFile(rel);
		const second = indexVideoFile(rel);
		expect(second.songId).toBe(first.songId);
		const count = (
			getDb().prepare('SELECT COUNT(*) AS c FROM songs WHERE video_rel = ?').get(rel) as {
				c: number;
			}
		).c;
		expect(count).toBe(1);
	});
});
