// Last.fm similarity lookups for the recommendation engine. Keyless-safe: with no
// LASTFM_API_KEY the calls return [] and the suggester falls back to library signals.
// Cached in-memory like youtube.ts. Never throws (returns [] on any error).

const BASE = 'https://ws.audioscrobbler.com/2.0/';
const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { at: number; value: unknown }>();

async function call(params: Record<string, string>): Promise<unknown> {
	const { env } = await import('$env/dynamic/private');
	const key = env.LASTFM_API_KEY;
	if (!key) return null;
	const url = BASE + '?' + new URLSearchParams({ ...params, api_key: key, format: 'json' }).toString();
	const hit = cache.get(url);
	if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
	const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
	if (!res.ok) return null;
	const json = await res.json();
	const now = Date.now();
	for (const [old, entry] of cache) if (now - entry.at >= TTL_MS) cache.delete(old);
	cache.set(url, { at: now, value: json });
	return json;
}

export interface SimilarTrack {
	artist: string;
	title: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function similarTracks(artist: string, title: string, limit = 15): Promise<SimilarTrack[]> {
	try {
		const j = (await call({
			method: 'track.getSimilar',
			artist,
			track: title,
			autocorrect: '1',
			limit: String(limit)
		})) as any;
		const arr = j?.similartracks?.track;
		if (!Array.isArray(arr)) return [];
		return arr
			.map((t: any) => ({ artist: String(t?.artist?.name ?? ''), title: String(t?.name ?? '') }))
			.filter((t: SimilarTrack) => t.artist && t.title);
	} catch {
		return [];
	}
}

export async function similarArtists(artist: string, limit = 10): Promise<string[]> {
	try {
		const j = (await call({
			method: 'artist.getSimilar',
			artist,
			autocorrect: '1',
			limit: String(limit)
		})) as any;
		const arr = j?.similarartists?.artist;
		if (!Array.isArray(arr)) return [];
		return arr.map((a: any) => String(a?.name ?? '')).filter(Boolean);
	} catch {
		return [];
	}
}
