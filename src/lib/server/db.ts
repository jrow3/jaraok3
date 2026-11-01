import Database from 'better-sqlite3';
import { dbPath } from './env';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (!db) {
		db = new Database(dbPath(), { fileMustExist: true });
		db.pragma('journal_mode = WAL');
	}
	return db;
}
