import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { searchLocal, fuzzySearch } from '$lib/server/search';
import { getSettings } from '$lib/server/settings';

export const GET: RequestHandler = ({ url }) => {
	const q = url.searchParams.get('q') ?? '';
	const db = getDb();
	const { brandPriority: priority, brandTiers: tiers, starredSongIds } = getSettings(db);
	const starred = new Set(starredSongIds);
	const results = searchLocal(db, q, { priority, tiers, starred, limit: 30 });
	const suggestions =
		results.length === 0 && q.trim().length >= 3
			? fuzzySearch(db, q, { priority, tiers, starred, limit: 5 })
			: [];
	return json({ query: q, results, suggestions });
};
