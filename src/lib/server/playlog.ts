import type Database from 'better-sqlite3';

export interface PlayedSong {
	songId: number;
	artist: string;
	title: string;
	plays: number;
}

function ensure(db: Database.Database): void {
	db.exec(`CREATE TABLE IF NOT EXISTS plays (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		song_id INTEGER,
		artist TEXT NOT NULL,
		title TEXT NOT NULL,
		singer TEXT NOT NULL,
		session TEXT NOT NULL,
		added_at INTEGER NOT NULL
	)`);
}

// Logs one song added to the queue. `session` groups a party (see socket.ts); a
// null song_id is a YouTube-only pick (kept for the record but not recommendable).
export function recordPlay(
	db: Database.Database,
	entry: { songId?: number | null; artist: string; title: string; singer: string; session: string },
	at: number = Date.now()
): void {
	ensure(db);
	db.prepare(
		'INSERT INTO plays (song_id, artist, title, singer, session, added_at) VALUES (?, ?, ?, ?, ?, ?)'
	).run(entry.songId ?? null, entry.artist, entry.title, entry.singer, entry.session, at);
}

// Most-added local songs in the last `days` — the "trending at your parties" signal.
export function trending(
	db: Database.Database,
	{ days = 30, limit = 20 }: { days?: number; limit?: number } = {},
	now: number = Date.now()
): PlayedSong[] {
	ensure(db);
	const since = now - days * 86_400_000;
	return db
		.prepare(
			`SELECT song_id AS songId, artist, title, COUNT(*) AS plays
			 FROM plays WHERE song_id IS NOT NULL AND added_at > ?
			 GROUP BY song_id ORDER BY plays DESC, MAX(added_at) DESC LIMIT ?`
		)
		.all(since, limit) as PlayedSong[];
}

// Local songs added in the same sessions as any seed artist, excluding the seed
// artists themselves — the "people who sang X also sang Y" signal (grows with use).
export function coPlayed(
	db: Database.Database,
	seedArtists: string[],
	{ limit = 20 }: { limit?: number } = {}
): PlayedSong[] {
	ensure(db);
	if (seedArtists.length === 0) return [];
	const holes = seedArtists.map(() => '?').join(',');
	return db
		.prepare(
			`SELECT song_id AS songId, artist, title, COUNT(*) AS plays FROM plays
			 WHERE song_id IS NOT NULL
			   AND session IN (SELECT DISTINCT session FROM plays WHERE artist IN (${holes}))
			   AND artist NOT IN (${holes})
			 GROUP BY song_id ORDER BY plays DESC LIMIT ?`
		)
		.all(...seedArtists, ...seedArtists, limit) as PlayedSong[];
}

export function clearPlays(db: Database.Database): void {
	ensure(db);
	db.exec('DELETE FROM plays');
}
