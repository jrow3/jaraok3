import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { buildIndex } from './library';
import { suggestSongs } from './suggest';
import { songKey } from '../songKey';

// No LASTFM_API_KEY in the test env, so the Last.fm calls return [] and this
// exercises the library-only signals (same-artist, trending, curated fallback).
describe('suggestSongs', () => {
	let dir: string;
	let db: Database.Database;

	beforeAll(() => {
		dir = mkdtempSync(join(tmpdir(), 'karaoke-suggest-'));
		const touch = (n: string) => writeFileSync(join(dir, n), '');
		touch('Queen - Bohemian Rhapsody [SC Karaoke].mp3');
		touch('Queen - Somebody to Love [SC Karaoke].mp3');
		touch('Queen - Under Pressure [SC Karaoke].mp3');
		touch('ABBA - Dancing Queen [SF Karaoke].mp3');
		touch('Journey - Dont Stop Believin [SC Karaoke].mp3');
		touch('Queen - Somebody to Love [SF Karaoke].mp3');
		const dbPath = join(dir, 'index.db');
		buildIndex({ libraryPath: dir, dbPath });
		db = new Database(dbPath);
	});
	afterAll(() => {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	});

	const idOf = (title: string) =>
		(db.prepare('SELECT id FROM songs WHERE title = ?').get(title) as { id: number }).id;

	test('recommends more from the seed artist and excludes the seed song', async () => {
		const seedId = idOf('Bohemian Rhapsody');
		const recs = await suggestSongs(
			db,
			[{ artist: 'Queen', title: 'Bohemian Rhapsody', songId: seedId }],
			{ exclude: [seedId], limit: 10 }
		);
		const titles = recs.map((r) => r.title);
		expect(titles).toContain('Somebody to Love');
		expect(titles).toContain('Under Pressure');
		expect(titles).not.toContain('Bohemian Rhapsody');
		expect(recs.every((r) => typeof r.id === 'number' && r.source === 'local')).toBe(true);
	});

	test('falls back to crowd-pleasers for an empty seed', async () => {
		const recs = await suggestSongs(db, [], { limit: 10 });
		expect(recs.length).toBeGreaterThan(0); // Dancing Queen / Don't Stop Believin' are curated + present
	});

	test('shows each song once even when several versions exist', async () => {
		const recs = await suggestSongs(db, [{ artist: 'Queen', title: 'Bohemian Rhapsody', songId: null }], { limit: 10 });
		expect(recs.filter((r) => r.title === 'Somebody to Love')).toHaveLength(1);
	});

	test('skips songs by key (already queued or sung tonight)', async () => {
		const recs = await suggestSongs(db, [{ artist: 'Queen', title: 'Bohemian Rhapsody', songId: null }], {
			limit: 10,
			excludeKeys: new Set([songKey('Queen', 'Under Pressure')])
		});
		expect(recs.map((r) => r.title)).not.toContain('Under Pressure');
	});
});
