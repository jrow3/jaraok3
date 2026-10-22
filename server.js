import { createServer } from 'node:http';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import Database from 'better-sqlite3';
import { handler } from './build/handler.js';
import { attachSocket } from './src/lib/server/socket.ts';
import { buildIndex } from './src/lib/server/library.ts';

// Production entry: the built SvelteKit handler serves HTTP, Socket.io shares
// the same server for the live queue, and the song index is built on first boot.
const dbPath = process.env.DB_PATH || 'data/index.db';
const libraryPath = process.env.LIBRARY_PATH;
const port = Number(process.env.PORT) || 3000;

function songCount() {
	if (!existsSync(dbPath)) return 0;
	try {
		const db = new Database(dbPath, { readonly: true });
		const { c } = db.prepare('SELECT COUNT(*) AS c FROM songs').get();
		db.close();
		return c;
	} catch {
		return 0;
	}
}

if (songCount() === 0) {
	if (!libraryPath) {
		console.error('No song index and LIBRARY_PATH is not set — cannot start.');
		process.exit(1);
	}
	console.log(`No index found. Scanning "${libraryPath}" …`);
	mkdirSync(dirname(dbPath), { recursive: true });
	const stats = buildIndex({ libraryPath, dbPath });
	console.log(`Indexed ${stats.songs} songs.`);
}

// Logged, not fatal: one failed download or lookup must not end the party for everyone.
process.on('unhandledRejection', (reason) => console.error('[karaoke] unhandled rejection:', reason));

const server = createServer(handler);
attachSocket(server);
server.listen(port, () => console.log(`Karaoke listening on :${port}`));
