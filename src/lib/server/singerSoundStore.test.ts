import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { loadSingerSound, saveSingerSound } from './singerSoundStore';

describe('singer sound store', () => {
	const owner = 'a'.repeat(16);
	let db: Database.Database;
	beforeEach(() => {
		db = new Database(':memory:');
	});
	afterEach(() => db.close());

	test('round-trips a singer sound', () => {
		saveSingerSound(db, owner, { echoLevel: -12 });
		expect(loadSingerSound(db, owner)).toEqual({ echoLevel: -12 });
	});

	test('an unknown owner loads empty', () => {
		expect(loadSingerSound(db, owner)).toEqual({});
	});

	test('saving an empty sound deletes the row', () => {
		saveSingerSound(db, owner, { echoLevel: -12 });
		saveSingerSound(db, owner, {});
		expect(loadSingerSound(db, owner)).toEqual({});
		expect(db.prepare('SELECT COUNT(*) AS count FROM singer_sound').get()).toEqual({ count: 0 });
	});

	test('a stored row goes back through toSingerSound', () => {
		saveSingerSound(db, owner, { echoLevel: -12 });
		db.prepare('UPDATE singer_sound SET sound = ? WHERE owner = ?').run('{"compRatio":8,"reverbTail":5}', owner);
		expect(loadSingerSound(db, owner)).toEqual({ reverbTail: 0 });
	});
});
