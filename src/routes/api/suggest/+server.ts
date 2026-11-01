import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { getSettings } from '$lib/server/settings';
import { suggestSongs, type Seed } from '$lib/server/suggest';

// Recommends library songs to add, seeded by the party's picks (sent by the client
// since the personal seed differs per phone). Returns SearchResults the guest/admin
// pages render directly, so a tap is an instant local add.
export const POST: RequestHandler = async ({ request }) => {
	// A body of `null` or a bare number parses fine but has no fields to read.
	const parsed: unknown = await request.json().catch(() => null);
	const body = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};

	const seed: Seed[] = Array.isArray(body.seed)
		? body.seed
				.filter((s: unknown): s is Record<string, unknown> => !!s && typeof s === 'object')
				.map((s: Record<string, unknown>) => ({
					artist: String(s.artist ?? ''),
					title: String(s.title ?? ''),
					songId: typeof s.songId === 'number' ? s.songId : null
				}))
				.slice(0, 30)
		: [];
	const exclude: number[] = Array.isArray(body.exclude)
		? body.exclude.filter((n: unknown): n is number => typeof n === 'number')
		: [];
	const excludeKeys = new Set<string>(
		Array.isArray(body.excludeKeys)
			? body.excludeKeys.filter((k: unknown): k is string => typeof k === 'string').slice(0, 500)
			: []
	);

	const db = getDb();
	const { brandTiers: tiers, starredSongIds, recsEnabled } = getSettings(db);
	if (!recsEnabled) return json({ results: [] });

	const results = await suggestSongs(db, seed, {
		exclude,
		excludeKeys,
		tiers,
		starred: new Set(starredSongIds),
		limit: 12
	});
	return json({ results });
};
