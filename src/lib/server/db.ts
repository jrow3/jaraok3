import Database from 'better-sqlite3';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
	if (!db) {
		db = new Database(process.env.DB_PATH ?? 'data/index.db', { fileMustExist: true });
		db.pragma('journal_mode = WAL');
	}
	return db;
}
