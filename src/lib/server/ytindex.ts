import type Database from 'better-sqlite3';

export interface DownloadedVideo {
	songId: number;
	artist: string;
	title: string;
	discTag: string | null;
}

function ensure(db: Database.Database): void {
	db.exec(`CREATE TABLE IF NOT EXISTS yt_downloads (
		yt_id TEXT PRIMARY KEY,
		video_rel TEXT NOT NULL,
		at INTEGER NOT NULL
	)`);
}

// Remembers that a YouTube id was downloaded to `video_rel`. Keyed on the file's
// stable relative path rather than the song id, which is reassigned on a full
// rescan, so the mapping keeps working after re-indexing.
export function recordDownload(
	db: Database.Database,
	ytId: string,
	videoRel: string,
	at: number = Date.now()
): void {
	ensure(db);
	db.prepare('INSERT OR REPLACE INTO yt_downloads (yt_id, video_rel, at) VALUES (?, ?, ?)').run(
		ytId,
		videoRel,
		at
	);
}

// If this YouTube id was already downloaded and its file is still in the index,
// returns the local song so the caller can queue it instead of downloading again.
export function findDownloaded(db: Database.Database, ytId: string): DownloadedVideo | null {
	ensure(db);
	const row = db
		.prepare(
			`SELECT s.id AS songId, s.artist, s.title, s.disc_tag AS discTag
			 FROM yt_downloads d JOIN songs s ON s.video_rel = d.video_rel
			 WHERE d.yt_id = ?`
		)
		.get(ytId) as DownloadedVideo | undefined;
	return row ?? null;
}
