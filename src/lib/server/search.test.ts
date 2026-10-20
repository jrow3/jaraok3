import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import {
	brandKey,
	pickBestVersion,
	searchLocal,
	getSong,
	trigrams,
	fuzzyRank,
	type SongRow
} from './search';
import { buildIndex } from './library';

const row = (id: number, disc_tag: string | null, has_lyrics: number): SongRow => ({
	id,
	artist: 'Toto',
	title: 'Africa',
	disc_tag,
	has_lyrics,
	mp3_rel: `${id}.mp3`,
	cdg_rel: has_lyrics ? `${id}.cdg` : null,
	video_rel: null
});

describe('brandKey', () => {
	test('strips the word "karaoke" and non-alphanumerics, lowercased', () => {
		expect(brandKey('SF Karaoke')).toBe('sf');
		expect(brandKey('KaraFun')).toBe('karafun');
		expect(brandKey('#Z Karaoke')).toBe('z');
		expect(brandKey('Sound Choice')).toBe('soundchoice');
	});
	test('is empty for a bare tag or null', () => {
		expect(brandKey('Karaoke')).toBe('');
		expect(brandKey(null)).toBe('');
	});
});

describe('pickBestVersion', () => {
	test('prefers a green tier over a red one, even if red is higher in priority', () => {
		const chosen = pickBestVersion([row(1, 'Red Karaoke', 1), row(2, 'Green Karaoke', 1)], {
			priority: ['Red Karaoke'],
			tiers: { 'Green Karaoke': 'green', 'Red Karaoke': 'red' }
		});
		expect(chosen.id).toBe(2);
	});

	test('a starred version wins over tier and priority', () => {
		const chosen = pickBestVersion([row(1, 'Green Karaoke', 1), row(2, 'Red Karaoke', 1)], {
			priority: ['Green Karaoke'],
			tiers: { 'Green Karaoke': 'green', 'Red Karaoke': 'red' },
			starred: new Set([2])
		});
		expect(chosen.id).toBe(2);
	});

	test('a downloaded video outranks a CDG version, but a star still wins over the video', () => {
		const cdg = row(1, 'SC Karaoke', 1);
		const video = { ...row(2, 'KaraFun', 1), video_rel: 'downloads/x.mp4' };
		expect(pickBestVersion([cdg, video]).id).toBe(2);
		expect(pickBestVersion([cdg, video], { starred: new Set([1]) }).id).toBe(1);
	});

	test('prefers the brand earliest in the priority list (same tier)', () => {
		const chosen = pickBestVersion([row(1, 'SC Karaoke', 1), row(2, 'SF Karaoke', 1)], {
			priority: ['SF Karaoke', 'SC Karaoke']
		});
		expect(chosen.id).toBe(2);
	});

	test('matches priority brands regardless of spacing/case', () => {
		const chosen = pickBestVersion([row(1, 'SC Karaoke', 1), row(2, 'KaraFun', 1)], {
			priority: ['karafun']
		});
		expect(chosen.id).toBe(2);
	});

	test('falls back to a version with lyrics when no brand matches', () => {
		const chosen = pickBestVersion([row(1, 'ZZ Karaoke', 0), row(2, 'YY Karaoke', 1)], {});
		expect(chosen.id).toBe(2);
	});

	test('breaks remaining ties by lowest id (stable)', () => {
		const chosen = pickBestVersion([row(3, 'AA Karaoke', 1), row(1, 'BB Karaoke', 1)], {});
		expect(chosen.id).toBe(1);
	});
});

describe('searchLocal', () => {
	let dir: string;
	let db: Database.Database;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'karaoke-search-'));
		const touch = (name: string) => writeFileSync(join(dir, name), '');
		touch('Toto - Africa [SC Karaoke].cdg');
		touch('Toto - Africa [SC Karaoke].mp3');
		touch('Toto - Africa [SF Karaoke].cdg');
		touch('Toto - Africa [SF Karaoke].mp3');
		touch('Toto - Africa [XX Karaoke].mp3'); // audio-only dup
		touch('2Baba - African Queen [ME Karaoke].cdg');
		touch('2Baba - African Queen [ME Karaoke].mp3');
		const dbPath = join(dir, 'index.db');
		buildIndex({ libraryPath: dir, dbPath });
		db = new Database(dbPath, { readonly: true });
	});
	afterEach(() => {
		db.close();
		rmSync(dir, { recursive: true, force: true });
	});

	test('returns one row per song (deduped by artist + title)', () => {
		const results = searchLocal(db, 'africa', { priority: [] });
		const titles = results.map((r) => `${r.artist} - ${r.title}`);
		expect(titles).toContain('Toto - Africa');
		expect(titles).toContain('2Baba - African Queen');
		expect(titles.filter((t) => t === 'Toto - Africa')).toHaveLength(1);
	});

	test('honors the brand-priority list when choosing the surviving version', () => {
		const withSf = searchLocal(db, 'africa', { priority: ['SF Karaoke'] }).find(
			(r) => r.title === 'Africa'
		);
		const withSc = searchLocal(db, 'africa', { priority: ['SC Karaoke'] }).find(
			(r) => r.title === 'Africa'
		);
		expect(withSf!.discTag).toBe('SF Karaoke');
		expect(withSc!.discTag).toBe('SC Karaoke');
	});

	test('tags each result with its brand tier (green wins, untiered = yellow)', () => {
		const results = searchLocal(db, 'africa', { tiers: { 'SF Karaoke': 'green' } });
		expect(results.find((r) => r.title === 'Africa')!.tier).toBe('green');
		expect(results.find((r) => r.title === 'African Queen')!.tier).toBe('yellow');
	});

	test('a starred version surfaces as the shown row, is flagged, and lists its alternates', () => {
		const idOf = (disc: string) =>
			(db.prepare("SELECT id FROM songs WHERE title = 'Africa' AND disc_tag = ?").get(disc) as { id: number }).id;
		const scId = idOf('SC Karaoke');
		const sfId = idOf('SF Karaoke');
		// Priority would pick SF, but starring SC overrides.
		const africa = searchLocal(db, 'africa', { priority: ['SF Karaoke'], starred: new Set([scId]) }).find(
			(r) => r.title === 'Africa'
		)!;
		expect(africa.id).toBe(scId);
		expect(africa.isStarred).toBe(true);
		expect(africa.versions![0].id).toBe(scId);
		expect(africa.versions!.map((v) => v.id)).toContain(sfId);
	});

	test('returns [] for a query below two characters', () => {
		expect(searchLocal(db, 'a', { priority: [] })).toEqual([]);
	});

	test('getSong returns the full row with a default offset of 0', () => {
		const id = (db.prepare("SELECT id FROM songs WHERE title = 'Africa' LIMIT 1").get() as { id: number }).id;
		const song = getSong(db, id);
		expect(song).toMatchObject({ title: 'Africa', artist: 'Toto', offset_ms: 0 });
		expect(getSong(db, 999999)).toBeUndefined();
	});
});

describe('trigrams', () => {
	test('splits into 3-character windows', () => {
		expect(trigrams('lose')).toEqual(['los', 'ose']);
	});
	test('lowercases and treats punctuation as spaces', () => {
		expect(trigrams("Lose!")).toEqual(['los', 'ose']);
	});
});

describe('fuzzyRank', () => {
	let n = 0;
	const song = (artist: string, title: string): SongRow => ({
		id: ++n,
		artist,
		title,
		disc_tag: 'SF Karaoke',
		has_lyrics: 1,
		mp3_rel: `${n}.mp3`,
		cdg_rel: `${n}.cdg`,
		video_rel: null
	});

	test('a misspelling ranks the closest real song first', () => {
		const rows = [
			song('Oasis', 'Wonderwall'),
			song('Chartbusters', 'Loose Change'),
			song('Eminem', 'Lose Yourself')
		];
		const ranked = fuzzyRank('loose yourself', rows, { limit: 3 });
		expect(ranked[0].title).toBe('Lose Yourself');
	});

	test('drops candidates that barely overlap', () => {
		const rows = [song('Eminem', 'Lose Yourself'), song('Toto', 'Africa')];
		const ranked = fuzzyRank('loose yourself', rows, { limit: 5 });
		expect(ranked.map((r) => r.title)).not.toContain('Africa');
	});

	test('dedupes to one row per song', () => {
		const rows = [
			{ ...song('Eminem', 'Lose Yourself'), disc_tag: 'SC Karaoke' },
			{ ...song('Eminem', 'Lose Yourself'), disc_tag: 'SF Karaoke' }
		];
		const ranked = fuzzyRank('lose yourself', rows, { priority: ['SF Karaoke'], limit: 5 });
		expect(ranked).toHaveLength(1);
		expect(ranked[0].discTag).toBe('SF Karaoke');
	});
});
