import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { relative } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileSafe } from './downloadRename';
import { youtubeCookieArgs } from './youtubeCookies';

const run = promisify(execFile);

const FORMAT = 'bv*[vcodec^=avc1][height<=1080]+ba[acodec^=mp4a]/b[height<=1080][ext=mp4]/b';

export interface SongName {
	artist: string;
	title: string;
}

// Named from the artist and title the search already worked out for the queue item, so
// every channel's video lands as "Artist - Title [Channel]", which the indexer reads back.
// % is yt-dlp's template marker, so a literal one is doubled.
export function outputTemplate(name: SongName): string {
	const part = (text: string, fallback: string) => (fileSafe(text) || fallback).replace(/%/g, '%%');
	return `${part(name.artist, 'Unknown')} - ${part(name.title, 'Untitled')} [%(channel|YouTube)s].%(ext)s`;
}

// Downloads one YouTube video as a web-safe H.264+AAC mp4 into the library's
// downloads folder and returns its path relative to LIBRARY_PATH (for `video_rel`).
// Merged with faststart on fast disk (TEMP_DIR), then moved to DOWNLOADS_DIR.
// Throws on any yt-dlp failure (unavailable/geo-blocked/etc). No shell (execFile).
export async function downloadVideo(ytId: string, name: SongName): Promise<string> {
	if (!/^[\w-]{6,20}$/.test(ytId)) throw new Error(`bad video id: ${ytId}`);
	const env = process.env;
	const bin = env.YT_DLP || 'yt-dlp';
	const downloadsDir = env.DOWNLOADS_DIR || '/library/downloads';
	const tempDir = env.TEMP_DIR || '/data/tmp';
	const libraryPath = env.LIBRARY_PATH || '/library';
	mkdirSync(tempDir, { recursive: true });

	const { stdout } = await run(
		bin,
		[
			'-f', FORMAT,
			'--merge-output-format', 'mp4',
			'--postprocessor-args', 'ffmpeg:-movflags +faststart',
			'-P', `home:${downloadsDir}`,
			'-P', `temp:${tempDir}`,
			// The [tag] is what the library shows as a version's source, so it names the channel.
			'-o', outputTemplate(name),
			'--no-warnings',
			'--print', 'after_move:filepath',
			...youtubeCookieArgs(),
			`https://www.youtube.com/watch?v=${ytId}`
		],
		{ timeout: 180000, maxBuffer: 8 * 1024 * 1024 }
	);

	const filepath = stdout.trim().split('\n').filter(Boolean).pop()?.trim();
	if (!filepath) throw new Error('download produced no file');
	return relative(libraryPath, filepath);
}
