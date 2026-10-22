import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { rescan } from '$lib/server/rescan';
import { dbPath } from '$lib/server/env';

// Rebuilds the song index from the library folder in a child process, so the party
// keeps playing. buildIndex only touches the song tables, so the settings table survives.
export const POST: RequestHandler = async () => {
	const libraryPath = env.LIBRARY_PATH;
	// SvelteKit doesn't log an error() it is handed, and the host's phone only hears that
	// the rescan failed, so the server log is the one place the reason shows.
	if (!libraryPath) {
		console.error('[karaoke] Rescan: LIBRARY_PATH is not configured');
		throw error(500, 'LIBRARY_PATH is not configured');
	}
	const stats = await rescan(libraryPath, dbPath()).catch((failure) => {
		console.error('[karaoke] Rescan failed:', failure);
		throw error(500, 'Rescan failed');
	});
	return json({ stats });
};
