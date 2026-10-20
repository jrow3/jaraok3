import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildIndex } from '../src/lib/server/library';

const libraryPath = process.argv[2] ?? process.env.LIBRARY_PATH;
const dbPath = resolve(process.argv[3] ?? process.env.DB_PATH ?? 'data/index.db');

if (!libraryPath) {
	console.error('usage: tsx scripts/reindex.ts <libraryPath> [dbPath]');
	process.exit(1);
}

mkdirSync(dirname(dbPath), { recursive: true });

const start = Date.now();
const stats = buildIndex({ libraryPath, dbPath });
const seconds = ((Date.now() - start) / 1000).toFixed(1);

console.log(`Indexed "${libraryPath}" in ${seconds}s -> ${dbPath}`);
console.table(stats);
