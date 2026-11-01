import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { parseTrack } from './filename';
import { getDb } from './db';

export interface SongRecord {
	artist: string;
	title: string;
	discTag: string | null;
	hasLyrics: boolean;
	mp3File: string | null;
	cdgFile: string | null;
	videoFile: string | null;
}

export interface IndexStats {
	songs: number;
	withLyrics: number;
	audioOnly: number;
	videos: number;
	orphanCdg: number;
	skippedMp2: number;
}

function extensionOf(name: string): string {
	const dot = name.lastIndexOf('.');
	return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

function stemOf(name: string): string {
	const dot = name.lastIndexOf('.');
	return dot === -1 ? name : name.slice(0, dot);
}

function baseOf(pathish: string): string {
	const slash = Math.max(pathish.lastIndexOf('/'), pathish.lastIndexOf('\\'));
	return slash === -1 ? pathish : pathish.slice(slash + 1);
}

interface FileGroup {
	mp3?: string;
	cdg?: string;
	mp2?: string;
	mp4?: string;
}

// Groups media by their path-without-extension. A `.mp3` (with optional `.cdg`
// lyrics) is an audio song; a lone `.mp4` is a downloaded video song. Paths are
// stored relative to the library root, so callers pass relative paths.
export function buildSongRecords(paths: string[]): { records: SongRecord[]; stats: IndexStats } {
	const groups = new Map<string, FileGroup>();
	for (const rel of paths) {
		const ext = extensionOf(rel);
		if (ext !== 'mp3' && ext !== 'cdg' && ext !== 'mp2' && ext !== 'mp4') continue;
		const key = stemOf(rel);
		let group = groups.get(key);
		if (!group) {
			group = {};
			groups.set(key, group);
		}
		group[ext as keyof FileGroup] = rel;
	}

	const records: SongRecord[] = [];
	const stats: IndexStats = {
		songs: 0,
		withLyrics: 0,
		audioOnly: 0,
		videos: 0,
		orphanCdg: 0,
		skippedMp2: 0
	};

	for (const [key, group] of groups) {
		if (group.mp2) stats.skippedMp2++;
		const { artist, title, discTag } = parseTrack(baseOf(key));
		if (group.mp3) {
			const hasLyrics = Boolean(group.cdg);
			records.push({
				artist,
				title,
				discTag,
				hasLyrics,
				mp3File: group.mp3,
				cdgFile: group.cdg ?? null,
				videoFile: null
			});
			stats.songs++;
			if (hasLyrics) stats.withLyrics++;
			else stats.audioOnly++;
		} else if (group.mp4) {
			records.push({
				artist,
				title,
				discTag,
				hasLyrics: true,
				mp3File: null,
				cdgFile: null,
				videoFile: group.mp4
			});
			stats.songs++;
			stats.videos++;
		} else if (group.cdg) {
			stats.orphanCdg++;
		}
	}

	records.sort((a, b) => (a.mp3File ?? a.videoFile ?? '').localeCompare(b.mp3File ?? b.videoFile ?? ''));
	return { records, stats };
}

// AUTOINCREMENT so a deleted song's id is never handed to a new file: plays, stars and
// queued songs still name the old id.
const SONGS_COLUMNS = `
	id INTEGER PRIMARY KEY AUTOINCREMENT,
	artist TEXT NOT NULL,
	title TEXT NOT NULL,
	disc_tag TEXT,
	mp3_rel TEXT,
	cdg_rel TEXT,
	video_rel TEXT,
	has_lyrics INTEGER NOT NULL,
	offset_ms INTEGER NOT NULL DEFAULT 0
`;

const SCHEMA = `
	CREATE TABLE IF NOT EXISTS songs (${SONGS_COLUMNS});
	CREATE VIRTUAL TABLE IF NOT EXISTS songs_fts USING fts5(
		artist, title, content='songs', content_rowid='id', tokenize='trigram'
	);
`;

// An index built before AUTOINCREMENT is copied into a table that has it, keeping every id.
function migrateToAutoincrement(db: Database.Database): void {
	const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'songs'").get() as
		| { sql: string }
		| undefined;
	if (!table || table.sql.includes('AUTOINCREMENT')) return;
	db.exec(`
		CREATE TABLE songs_next (${SONGS_COLUMNS});
		INSERT INTO songs_next (id, artist, title, disc_tag, mp3_rel, cdg_rel, video_rel, has_lyrics, offset_ms)
			SELECT id, artist, title, disc_tag, mp3_rel, cdg_rel, video_rel, has_lyrics, offset_ms FROM songs;
		DROP TABLE songs;
		ALTER TABLE songs_next RENAME TO songs;
	`);
}

export interface BuildIndexOptions {
	libraryPath: string;
	dbPath: string;
}

// By default every subfolder is scanned, for libraries kept in Artist/Album folders.
// LIBRARY_RECURSIVE=off scans only the root and downloads/: a recursive walk of ~90k
// files on an exFAT USB drive is slow enough that a rescan appears to stall.
function listMediaPaths(root: string): string[] {
	if (process.env.LIBRARY_RECURSIVE?.trim().toLowerCase() !== 'off') {
		// Stored and served with '/', whatever the OS separator.
		return (readdirSync(root, { recursive: true }) as string[]).map((path) => path.replaceAll('\\', '/'));
	}
	const paths = readdirSync(root) as string[];
	try {
		for (const name of readdirSync(join(root, 'downloads')) as string[]) {
			paths.push(`downloads/${name}`);
		}
	} catch {
		// no downloads folder yet
	}
	return paths;
}

// Rows are matched by file, so a song keeps its id across rescans: the queue, stars and
// play log all refer to songs by id.
function syncSongs(db: Database.Database, rows: SongRecord[]): void {
	migrateToAutoincrement(db);
	db.exec(SCHEMA);
	const known = db.prepare('SELECT id, COALESCE(mp3_rel, video_rel) AS rel FROM songs').all() as {
		id: number;
		rel: string;
	}[];
	const idByFile = new Map(known.map((row) => [row.rel, row.id]));
	const insert = db.prepare(
		`INSERT INTO songs (artist, title, disc_tag, mp3_rel, cdg_rel, video_rel, has_lyrics)
		 VALUES (@artist, @title, @discTag, @mp3File, @cdgFile, @videoFile, @hasLyrics)`
	);
	const update = db.prepare(
		`UPDATE songs SET artist = @artist, title = @title, disc_tag = @discTag, mp3_rel = @mp3File,
		 cdg_rel = @cdgFile, video_rel = @videoFile, has_lyrics = @hasLyrics WHERE id = @id`
	);
	for (const row of rows) {
		const values = {
			artist: row.artist,
			title: row.title,
			discTag: row.discTag,
			mp3File: row.mp3File,
			cdgFile: row.cdgFile,
			videoFile: row.videoFile,
			hasLyrics: row.hasLyrics ? 1 : 0
		};
		const file = row.mp3File ?? row.videoFile ?? '';
		const id = idByFile.get(file);
		if (id === undefined) insert.run(values);
		else update.run({ ...values, id });
		idByFile.delete(file);
	}
	const remove = db.prepare('DELETE FROM songs WHERE id = ?');
	for (const id of idByFile.values()) remove.run(id);
	db.exec("INSERT INTO songs_fts(songs_fts) VALUES('rebuild')");
}

export function buildIndex({ libraryPath, dbPath }: BuildIndexOptions): IndexStats {
	const { records, stats } = buildSongRecords(listMediaPaths(libraryPath));

	const db = new Database(dbPath);
	try {
		db.pragma('journal_mode = WAL');
		// One transaction, now that the app keeps running during a rescan: its searches
		// read the old index until the new one is complete, never empty tables. Immediate,
		// because it reads before it writes: a deferred one would fail with SQLITE_BUSY if the
		// app wrote in between, where taking the write lock first waits out the busy timeout.
		const rebuild = db.transaction((rows: SongRecord[]) => syncSongs(db, rows));
		rebuild.immediate(records);
	} finally {
		db.close();
	}

	return stats;
}

export interface IndexedVideo {
	songId: number;
	artist: string;
	title: string;
	discTag: string | null;
}

// Adds one already-downloaded video (relative path under the library root) to the
// live index without a full rebuild: one row into `songs`, one matching row into
// the external-content FTS (which has no triggers). Returns the new song id and
// the parsed metadata (so callers can show clean artist/title).
export function indexVideoFile(rel: string): IndexedVideo {
	const { records } = buildSongRecords([rel]);
	const rec = records[0];
	if (!rec || !rec.videoFile) throw new Error(`not a video file: ${rel}`);

	const db = getDb();
	const existing = db
		.prepare('SELECT id, artist, title, disc_tag FROM songs WHERE video_rel = ?')
		.get(rec.videoFile) as
		| { id: number; artist: string; title: string; disc_tag: string | null }
		| undefined;
	if (existing) {
		return { songId: existing.id, artist: existing.artist, title: existing.title, discTag: existing.disc_tag };
	}

	const info = db
		.prepare(
			`INSERT INTO songs (artist, title, disc_tag, mp3_rel, cdg_rel, video_rel, has_lyrics)
			 VALUES (@artist, @title, @discTag, NULL, NULL, @videoFile, 1)`
		)
		.run({ artist: rec.artist, title: rec.title, discTag: rec.discTag, videoFile: rec.videoFile });
	const songId = Number(info.lastInsertRowid);
	db.prepare('INSERT INTO songs_fts (rowid, artist, title) VALUES (?, ?, ?)').run(
		songId,
		rec.artist,
		rec.title
	);
	return { songId, artist: rec.artist, title: rec.title, discTag: rec.discTag };
}
