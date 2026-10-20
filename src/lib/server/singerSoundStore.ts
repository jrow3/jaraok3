import type Database from 'better-sqlite3';
import { toSingerSound, type SingerSound } from '../features/mixer/singerSound';

function ensure(db: Database.Database): void {
	db.exec('CREATE TABLE IF NOT EXISTS singer_sound (owner TEXT PRIMARY KEY, sound TEXT NOT NULL)');
}

export function loadSingerSound(db: Database.Database, owner: string): SingerSound {
	ensure(db);
	const row = db.prepare('SELECT sound FROM singer_sound WHERE owner = ?').get(owner) as { sound: string } | undefined;
	return row ? toSingerSound(JSON.parse(row.sound)) : {};
}

export function saveSingerSound(db: Database.Database, owner: string, sound: SingerSound): void {
	ensure(db);
	if (Object.keys(sound).length === 0) {
		db.prepare('DELETE FROM singer_sound WHERE owner = ?').run(owner);
		return;
	}
	db.prepare(
		'INSERT INTO singer_sound (owner, sound) VALUES (?, ?) ON CONFLICT(owner) DO UPDATE SET sound = excluded.sound'
	).run(owner, JSON.stringify(sound));
}
