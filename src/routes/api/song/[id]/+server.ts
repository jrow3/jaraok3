import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { getSong } from '$lib/server/search';

export const GET: RequestHandler = ({ params }) => {
	const song = getSong(getDb(), Number(params.id));
	if (!song) throw error(404, 'Song not found');
	return json({
		id: song.id,
		artist: song.artist,
		title: song.title,
		discTag: song.disc_tag,
		hasLyrics: song.has_lyrics === 1,
		offsetMs: song.offset_ms
	});
};
