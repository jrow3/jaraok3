import type Database from 'better-sqlite3';
import type { SearchResult, BrandTiers } from './search';
import { fuzzySearch, listByArtist, resultsByIds } from './search';
import { trending, coPlayed } from './playlog';
import { similarTracks, similarArtists } from './lastfm';
import { songKey } from '../songKey';

export interface Seed {
	artist: string;
	title: string;
	songId?: number | null;
}

export interface SuggestOptions {
	exclude?: number[];
	limit?: number;
	tiers?: BrandTiers;
	starred?: Set<number>;
	excludeKeys?: Set<string>;
}

const W = {
	lfmTrack: 3,
	coPlay: 2.5,
	lfmArtist: 2,
	sameArtist: 1.5,
	trend: 1,
	curated: 0.5,
	starredBoost: 1
};

// Library-independent crowd-pleaser seed: fuzzy-matched to whatever the library has,
// used as filler so the panel is never empty (and as the whole list for an idle party).
const CROWD_PLEASERS: Array<[string, string]> = [
	['Journey', "Don't Stop Believin'"],
	['Neil Diamond', 'Sweet Caroline'],
	['Bon Jovi', "Livin' on a Prayer"],
	['Queen', 'Bohemian Rhapsody'],
	['ABBA', 'Dancing Queen'],
	['Whitney Houston', 'I Wanna Dance with Somebody'],
	['Backstreet Boys', 'I Want It That Way'],
	['Toto', 'Africa'],
	['John Denver', 'Take Me Home, Country Roads'],
	['Bill Withers', 'Lean on Me'],
	['Kelly Clarkson', 'Since U Been Gone'],
	['OutKast', 'Hey Ya!'],
	['Spice Girls', 'Wannabe'],
	['Oasis', 'Wonderwall'],
	['Elton John', 'Your Song'],
	['Billy Joel', 'Piano Man'],
	['Taylor Swift', 'Shake It Off'],
	['Adele', 'Someone Like You'],
	['Aretha Franklin', 'Respect'],
	['The Killers', 'Mr. Brightside'],
	['Village People', 'Y.M.C.A.'],
	['Michael Jackson', 'Billie Jean'],
	['Lady Gaga', 'Poker Face'],
	['Katy Perry', 'Firework'],
	['Cyndi Lauper', 'Girls Just Want to Have Fun']
];

// Blends Last.fm similarity + the play-log (trending / sung-together) + same-artist +
// a curated fallback, resolves everything to real library songs, drops excluded ids,
// and returns the top `limit` as SearchResults. Without Last.fm it falls back to the
// library's own signals.
export async function suggestSongs(
	db: Database.Database,
	seed: Seed[],
	opts: SuggestOptions = {}
): Promise<SearchResult[]> {
	const {
		exclude = [],
		limit = 12,
		tiers = {},
		starred = new Set<number>(),
		excludeKeys = new Set<string>()
	} = opts;

	const scores = new Map<number, number>();
	const excluded = new Set<number>(exclude);
	for (const s of seed) if (s.songId != null) excluded.add(s.songId);
	const bump = (id: number, w: number) => {
		if (!excluded.has(id)) scores.set(id, (scores.get(id) ?? 0) + w);
	};

	const seedArtists = [...new Set(seed.map((s) => s.artist).filter(Boolean))];
	const lfmSeeds = seed.filter((s) => s.artist && s.title).slice(0, 3);

	// Library signals (always available, no external calls).
	for (const artist of seedArtists.slice(0, 6)) {
		for (const row of listByArtist(db, artist, 12)) bump(row.id, W.sameArtist);
	}
	for (const t of trending(db, { limit: 20 })) bump(t.songId, W.trend);
	for (const c of coPlayed(db, seedArtists, { limit: 20 })) bump(c.songId, W.coPlay);

	// Last.fm signals (return [] with no key, so this is a no-op then).
	const [trackLists, artistLists] = await Promise.all([
		Promise.all(lfmSeeds.map((s) => similarTracks(s.artist, s.title))),
		Promise.all(seedArtists.slice(0, 2).map((a) => similarArtists(a)))
	]);
	for (const list of trackLists) {
		for (const t of list.slice(0, 10)) {
			const m = fuzzySearch(db, `${t.artist} ${t.title}`, { limit: 1 })[0];
			if (m) bump(m.id, W.lfmTrack);
		}
	}
	for (const list of artistLists) {
		for (const name of list.slice(0, 5)) {
			for (const m of fuzzySearch(db, name, { limit: 3 })) bump(m.id, W.lfmArtist);
		}
	}

	// Curated fallback only when we're short (idle party, no key, thin library match).
	if (scores.size < limit) {
		for (const [a, t] of CROWD_PLEASERS) {
			const m = fuzzySearch(db, `${a} ${t}`, { limit: 1 })[0];
			if (m) bump(m.id, W.curated);
		}
	}

	for (const id of scores.keys()) {
		if (starred.has(id)) scores.set(id, (scores.get(id) ?? 0) + W.starredBoost);
	}

	// Rank more than needed, then keep one row per song (the highest-scoring
	// version) and drop anything already queued or sung tonight.
	const ranked = [...scores.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, limit * 4)
		.map(([id]) => id);
	const seen = new Set<string>([...excludeKeys, ...seed.map((s) => songKey(s.artist, s.title))]);
	const out: SearchResult[] = [];
	for (const r of resultsByIds(db, ranked, { tiers, starred })) {
		const key = songKey(r.artist, r.title);
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(r);
		if (out.length >= limit) break;
	}
	return out;
}
