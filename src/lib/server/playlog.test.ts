import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { recordPlay, trending, coPlayed } from './playlog';

describe('playlog', () => {
	let db: Database.Database;
	beforeEach(() => {
		db = new Database(':memory:');
	});
	afterEach(() => db.close());

	const rec = (
		songId: number | null,
		artist: string,
		title: string,
		session: string,
		at: number
	) => recordPlay(db, { songId, artist, title, singer: 'X', session }, at);

	test('trending ranks most-added local songs', () => {
		rec(1, 'Queen', 'Bohemian Rhapsody', 's1', 1000);
		rec(1, 'Queen', 'Bohemian Rhapsody', 's1', 2000);
		rec(2, 'ABBA', 'Dancing Queen', 's1', 3000);
		const t = trending(db, { days: 3650, limit: 10 }, 4000);
		expect(t[0]).toMatchObject({ songId: 1, plays: 2 });
		expect(t.map((x) => x.songId)).toContain(2);
	});

	test('trending ignores null song_id (YouTube-only) and rows older than the window', () => {
		rec(null, 'Foo', 'Bar', 's1', 1000);
		rec(3, 'Baz', 'Qux', 's1', 1000);
		const t = trending(db, { days: 1, limit: 10 }, 1000 + 5 * 86_400_000);
		expect(t).toHaveLength(0);
	});

	test('coPlayed finds songs from the seed artist’s sessions, excluding that artist', () => {
		rec(1, 'Queen', 'Somebody to Love', 's1', 1000);
		rec(2, 'Bowie', 'Heroes', 's1', 2000); // same session as Queen
		rec(3, 'Adele', 'Hello', 's2', 3000); // different session
		const c = coPlayed(db, ['Queen'], { limit: 10 });
		expect(c.map((x) => x.songId)).toEqual([2]);
	});
});
