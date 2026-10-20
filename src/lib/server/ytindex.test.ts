import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { recordDownload, findDownloaded } from './ytindex';

const REL = 'downloads/Queen - Bohemian Rhapsody [YouTube].mp4';

describe('ytindex', () => {
	let db: Database.Database;
	beforeEach(() => {
		db = new Database(':memory:');
		db.exec(
			'CREATE TABLE songs (id INTEGER PRIMARY KEY, artist TEXT, title TEXT, disc_tag TEXT, video_rel TEXT)'
		);
		db.prepare(
			'INSERT INTO songs (id, artist, title, disc_tag, video_rel) VALUES (?, ?, ?, ?, ?)'
		).run(7, 'Queen', 'Bohemian Rhapsody', 'YouTube', REL);
	});
	afterEach(() => db.close());

	test('finds a previously downloaded video by its youtube id', () => {
		recordDownload(db, 'abc123', REL, 1000);
		expect(findDownloaded(db, 'abc123')).toEqual({
			songId: 7,
			artist: 'Queen',
			title: 'Bohemian Rhapsody',
			discTag: 'YouTube'
		});
	});

	test('returns null for an id we have not downloaded', () => {
		expect(findDownloaded(db, 'nope')).toBeNull();
	});

	test('resolves the current song id even after a rescan reassigns ids', () => {
		recordDownload(db, 'abc123', REL, 1000);
		db.exec('DELETE FROM songs');
		db.prepare(
			'INSERT INTO songs (id, artist, title, disc_tag, video_rel) VALUES (?, ?, ?, ?, ?)'
		).run(42, 'Queen', 'Bohemian Rhapsody', 'YouTube', REL);
		expect(findDownloaded(db, 'abc123')?.songId).toBe(42);
	});

	test('returns null when the recorded file is no longer in the index', () => {
		recordDownload(db, 'abc123', 'downloads/gone.mp4', 1000);
		expect(findDownloaded(db, 'abc123')).toBeNull();
	});
});
