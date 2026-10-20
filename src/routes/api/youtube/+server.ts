import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { searchYouTube } from '$lib/server/youtube';
import { getDb } from '$lib/server/db';
import { getSettings } from '$lib/server/settings';

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q')?.trim() ?? '';
	if (q.length < 2) return json({ results: [] });
	const { ytChannelPriority, ytChannelBlocklist } = getSettings(getDb());
	try {
		return json({
			results: await searchYouTube(q, {
				n: 10,
				channelPriority: ytChannelPriority,
				channelBlocklist: ytChannelBlocklist
			})
		});
	} catch {
		throw error(502, 'YouTube search is unavailable right now.');
	}
};
