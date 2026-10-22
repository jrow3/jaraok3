import type Database from 'better-sqlite3';
import type { Tier } from '../types';
import { tierOf } from '../features/host/settingsModel';

export interface SongRow {
	id: number;
	artist: string;
	title: string;
	disc_tag: string | null;
	has_lyrics: number;
	mp3_rel: string | null;
	cdg_rel: string | null;
	video_rel: string | null;
}

export interface Song extends SongRow {
	offset_ms: number;
}

export function getSong(db: Database.Database, id: number): Song | undefined {
	return db
		.prepare(
			'SELECT id, artist, title, disc_tag, has_lyrics, mp3_rel, cdg_rel, video_rel, offset_ms FROM songs WHERE id = ?'
		)
		.get(id) as Song | undefined;
}

export type BrandTiers = Record<string, Tier>;

export interface SearchResult {
	id: number;
	artist: string;
	title: string;
	discTag: string | null;
	hasLyrics: boolean;
	tier: Tier;
	isStarred: boolean;
	source: 'local' | 'local-video';
	versions?: SearchResult[];
}

export interface SearchOptions {
	priority?: string[];
	tiers?: BrandTiers;
	starred?: Set<number>;
	limit?: number;
}

interface RankOptions {
	priority?: string[];
	tiers?: BrandTiers;
	starred?: Set<number>;
}

export function brandKey(discTag: string | null): string {
	if (!discTag) return '';
	return discTag.replace(/karaoke/gi, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
}

const TIER_RANK: Record<Tier, number> = { green: 0, yellow: 1, red: 2 };

function toResult(row: SongRow, tiers: BrandTiers, starred: Set<number>): SearchResult {
	return {
		id: row.id,
		artist: row.artist,
		title: row.title,
		discTag: row.disc_tag,
		hasLyrics: row.has_lyrics === 1,
		tier: tierOf(tiers, row.disc_tag ?? ''),
		isStarred: starred.has(row.id),
		source: row.video_rel ? 'local-video' : 'local'
	};
}

// One search row per song title, with its alternate renditions attached under
// `versions` (best first) so the client can expand to show them.
function groupResult(sorted: SongRow[], tiers: BrandTiers, starred: Set<number>): SearchResult {
	const top = toResult(sorted[0], tiers, starred);
	if (sorted.length > 1) top.versions = sorted.map((r) => toResult(r, tiers, starred));
	return top;
}

// Orders the renditions of one song, best first: a starred version always wins,
// then a downloaded video, then quality tier, brand priority, lyrics, stable id.
function sortVersions(rows: SongRow[], { priority = [], tiers = {}, starred = new Set<number>() }: RankOptions = {}): SongRow[] {
	const pri = priority.map(brandKey);
	const starRank = (r: SongRow) => (starred.has(r.id) ? 0 : 1);
	const videoRank = (r: SongRow) => (r.video_rel ? 0 : 1);
	const priorityRank = (r: SongRow) => {
		const i = pri.indexOf(brandKey(r.disc_tag));
		return i === -1 ? pri.length : i;
	};
	const tierRank = (r: SongRow) => TIER_RANK[tierOf(tiers, r.disc_tag ?? '')];
	return [...rows].sort(
		(a, b) =>
			starRank(a) - starRank(b) ||
			videoRank(a) - videoRank(b) ||
			tierRank(a) - tierRank(b) ||
			priorityRank(a) - priorityRank(b) ||
			b.has_lyrics - a.has_lyrics ||
			a.id - b.id
	);
}

export function pickBestVersion(rows: SongRow[], opts: RankOptions = {}): SongRow {
	return sortVersions(rows, opts)[0];
}

const COLUMNS = 'id, artist, title, disc_tag, has_lyrics, mp3_rel, cdg_rel, video_rel';

// The versions of one song share artist and title; the separator can't occur in either.
const versionKey = (row: Pick<SongRow, 'artist' | 'title'>) => `${row.artist.toLowerCase()}\u0000${row.title.toLowerCase()}`;

export function searchLocal(
	db: Database.Database,
	query: string,
	{ priority = [], tiers = {}, starred = new Set<number>(), limit = 30 }: SearchOptions = {}
): SearchResult[] {
	const q = query.trim();
	if (q.length < 2) return [];

	const candidateLimit = limit * 12;
	let rows: SongRow[];
	if (q.length >= 3) {
		const match = '"' + q.replace(/"/g, '""') + '"';
		rows = db
			.prepare(
				`SELECT ${COLUMNS.split(', ')
					.map((c) => `s.${c}`)
					.join(', ')}
				 FROM songs_fts f JOIN songs s ON s.id = f.rowid
				 WHERE songs_fts MATCH ? ORDER BY rank LIMIT ?`
			)
			.all(match, candidateLimit) as SongRow[];
	} else {
		const like = '%' + q.replace(/[%_]/g, '') + '%';
		rows = db
			.prepare(
				`SELECT ${COLUMNS} FROM songs WHERE artist LIKE ? OR title LIKE ? LIMIT ?`
			)
			.all(like, like, candidateLimit) as SongRow[];
	}

	const groups = new Map<string, SongRow[]>();
	for (const r of rows) {
		const key = versionKey(r);
		const g = groups.get(key);
		if (g) g.push(r);
		else groups.set(key, [r]);
	}

	const results: SearchResult[] = [];
	for (const group of groups.values()) {
		if (results.length >= limit) break;
		results.push(groupResult(sortVersions(group, { priority, tiers, starred }), tiers, starred));
	}
	return results;
}

function normalize(text: string): string {
	return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function trigrams(text: string): string[] {
	const norm = normalize(text);
	const out: string[] = [];
	for (let i = 0; i + 3 <= norm.length; i++) out.push(norm.slice(i, i + 3));
	return out;
}

interface FuzzyOptions {
	priority?: string[];
	tiers?: BrandTiers;
	starred?: Set<number>;
	limit?: number;
	minCoverage?: number;
}

// Ranks candidate rows by how many of the query's trigrams they contain, so a
// misspelling ("loose yourself") still finds the real song ("lose yourself").
export function fuzzyRank(
	query: string,
	rows: SongRow[],
	{ priority = [], tiers = {}, starred = new Set<number>(), limit = 5, minCoverage = 0.5 }: FuzzyOptions = {}
): SearchResult[] {
	const wanted = new Set(trigrams(query));
	if (wanted.size === 0) return [];

	const scored = rows
		.map((row) => {
			const have = new Set(trigrams(`${row.artist} ${row.title}`));
			let shared = 0;
			for (const t of wanted) if (have.has(t)) shared++;
			return { row, coverage: shared / wanted.size };
		})
		.filter((s) => s.coverage >= minCoverage)
		.sort((a, b) => b.coverage - a.coverage);

	const groups = new Map<string, SongRow[]>();
	const order: string[] = [];
	for (const { row } of scored) {
		const key = versionKey(row);
		if (!groups.has(key)) {
			groups.set(key, []);
			order.push(key);
		}
		groups.get(key)!.push(row);
	}

	const results: SearchResult[] = [];
	for (const key of order) {
		if (results.length >= limit) break;
		results.push(groupResult(sortVersions(groups.get(key)!, { priority, tiers, starred }), tiers, starred));
	}
	return results;
}

// "Did you mean" fallback: gather candidates cheaply from the FTS index (rows
// sharing any trigram with the query), then rerank in JS by coverage.
export function fuzzySearch(
	db: Database.Database,
	query: string,
	{ priority = [], tiers = {}, starred = new Set<number>(), limit = 5 }: SearchOptions = {}
): SearchResult[] {
	const grams = [...new Set(trigrams(query))].filter((t) => /^[a-z0-9]{3}$/.test(t));
	if (grams.length === 0) return [];
	const match = grams.map((t) => `"${t}"`).join(' OR ');
	const rows = db
		.prepare(
			`SELECT ${COLUMNS.split(', ')
				.map((c) => `s.${c}`)
				.join(', ')}
			 FROM songs_fts f JOIN songs s ON s.id = f.rowid
			 WHERE songs_fts MATCH ? ORDER BY rank LIMIT 300`
		)
		.all(match) as SongRow[];
	return fuzzyRank(query, rows, { priority, tiers, starred, limit });
}

// An artist's catalog (exact artist match). Used by the recommender to pull "more
// from this artist" for a seed artist stored verbatim in the library.
export function listByArtist(db: Database.Database, artist: string, limit = 20): SongRow[] {
	return db
		.prepare(`SELECT ${COLUMNS} FROM songs WHERE artist = ? LIMIT ?`)
		.all(artist, limit) as SongRow[];
}

// Resolves a list of song ids to SearchResults, preserving the given order (used by
// the recommender after it has scored/ranked candidate ids). One result per id, no
// version grouping — suggestions don't need the expand list.
export function resultsByIds(
	db: Database.Database,
	ids: number[],
	{ tiers = {}, starred = new Set<number>() }: { tiers?: BrandTiers; starred?: Set<number> } = {}
): SearchResult[] {
	if (ids.length === 0) return [];
	const holes = ids.map(() => '?').join(',');
	const rows = db
		.prepare(`SELECT ${COLUMNS} FROM songs WHERE id IN (${holes})`)
		.all(...ids) as SongRow[];
	const byId = new Map(rows.map((r) => [r.id, r]));
	return ids
		.map((id) => byId.get(id))
		.filter((r): r is SongRow => !!r)
		.map((r) => toResult(r, tiers, starred));
}
