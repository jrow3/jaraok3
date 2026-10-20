import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createReadStream, statSync } from 'node:fs';
import { Readable } from 'node:stream';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';
import { getDb } from '$lib/server/db';
import { getSong } from '$lib/server/search';

// Resolves a song id to its file in the library and streams the bytes with HTTP
// Range support (media elements stall on a fully buffered response).
export const GET: RequestHandler = ({ params, request }) => {
	const match = /^(\d+)\.(mp3|cdg|mp4)$/.exec(params.file);
	if (!match) throw error(400, 'Bad media request');

	const song = getSong(getDb(), Number(match[1]));
	if (!song) throw error(404, 'Song not found');

	const rel = match[2] === 'mp3' ? song.mp3_rel : match[2] === 'cdg' ? song.cdg_rel : song.video_rel;
	if (!rel) throw error(404, 'No such track for this song');

	const path = join(env.LIBRARY_PATH ?? '', rel);
	let size: number;
	try {
		size = statSync(path).size;
	} catch {
		throw error(404, 'File missing on disk');
	}

	const type =
		match[2] === 'mp3' ? 'audio/mpeg' : match[2] === 'mp4' ? 'video/mp4' : 'application/octet-stream';
	const base: Record<string, string> = {
		'content-type': type,
		'accept-ranges': 'bytes',
		'cache-control': 'public, max-age=3600'
	};
	const toWeb = (start?: number, end?: number) =>
		Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream<Uint8Array>;

	const range = request.headers.get('range');
	if (range) {
		const parts = /bytes=(\d*)-(\d*)/.exec(range);
		let start = parts && parts[1] ? parseInt(parts[1], 10) : 0;
		let end = parts && parts[2] ? parseInt(parts[2], 10) : size - 1;
		if (Number.isNaN(start)) start = 0;
		if (Number.isNaN(end) || end >= size) end = size - 1;
		if (start > end || start >= size) {
			return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
		}
		return new Response(toWeb(start, end), {
			status: 206,
			headers: {
				...base,
				'content-range': `bytes ${start}-${end}/${size}`,
				'content-length': String(end - start + 1)
			}
		});
	}

	return new Response(toWeb(), { status: 200, headers: { ...base, 'content-length': String(size) } });
};
