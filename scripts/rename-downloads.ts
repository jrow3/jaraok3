import { execFileSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { renamedRel } from '../src/lib/server/downloadRename';
import { youtubeCookieArgs } from '../src/lib/server/youtubeCookies';

// One-off: renames on-demand downloads saved as "... [YouTube].mp4" to name their
// channel, and updates the index so the songs keep their ids and play history.
// Runs inside the app container, which has yt-dlp, the database and a writable
// downloads folder (see deploy/downloads/README.md). Lists changes unless --apply.
const isApply = process.argv.includes('--apply');
const libraryPath = process.env.LIBRARY_PATH ?? '/library';
const ytDlp = process.env.YT_DLP ?? 'yt-dlp';
// Paced so YouTube doesn't flag the server for a burst of requests.
const PAUSE_MS = 2000;

const db = new Database(process.env.DB_PATH ?? 'data/index.db', { fileMustExist: true });
const rows = db
	.prepare(`SELECT yt_id AS ytId, video_rel AS rel FROM yt_downloads WHERE video_rel LIKE '%[YouTube].%'`)
	.all() as { ytId: string; rel: string }[];

const move = db.transaction((ytId: string, from: string, to: string, tag: string) => {
	db.prepare('UPDATE songs SET video_rel = ?, disc_tag = ? WHERE video_rel = ?').run(to, tag, from);
	db.prepare('UPDATE yt_downloads SET video_rel = ? WHERE yt_id = ?').run(to, ytId);
});

function channelOf(ytId: string): string {
	const args = ['--skip-download', '--no-warnings', '--print', 'channel', ...youtubeCookieArgs()];
	return execFileSync(ytDlp, [...args, `https://www.youtube.com/watch?v=${ytId}`], { encoding: 'utf8', timeout: 60000 }).trim();
}

console.log(`${rows.length} downloads tagged [YouTube]${isApply ? '' : ' (dry run: add --apply to rename)'}`);
for (const { ytId, rel } of rows) {
	let channel: string;
	try {
		channel = channelOf(ytId);
	} catch {
		console.log(`skip  ${rel}: YouTube didn't answer for ${ytId}`);
		continue;
	}
	const next = renamedRel(rel, channel);
	if (!next || existsSync(join(libraryPath, next))) {
		console.log(`skip  ${rel}: ${next ? 'target already exists' : `no usable channel name "${channel}"`}`);
		continue;
	}
	console.log(`${isApply ? 'move' : 'would'}  ${rel} -> ${next}`);
	if (isApply) {
		renameSync(join(libraryPath, rel), join(libraryPath, next));
		move(ytId, rel, next, next.match(/\[([^\]]*)\]\.\w+$/)![1]);
	}
	await new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
}
