import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { youtubeCookieArgs } from './youtubeCookies';

const run = promisify(execFile);

export function buildYtQuery(query: string, n = 10): string {
	const q = query.trim();
	const withKaraoke = /\bkaraoke\b/i.test(q) ? q : `${q} karaoke`;
	return `ytsearch${n}:${withKaraoke}`;
}

export interface YtResult {
	ytId: string;
	title: string;
	channel: string;
	durationSec: number | null;
	playableInEmbed: boolean | null;
}

interface YtEntry {
	id?: string | null;
	title?: string;
	uploader?: string;
	channel?: string;
	duration?: number;
	playable_in_embed?: boolean;
}

export function parseYtResults(stdout: string): YtResult[] {
	let data: { entries?: YtEntry[] };
	try {
		data = JSON.parse(stdout);
	} catch {
		return [];
	}
	const entries = Array.isArray(data.entries) ? data.entries : [];
	return entries
		.filter((e): e is YtEntry & { id: string } => !!e && typeof e.id === 'string')
		.map((e) => ({
			ytId: e.id,
			title: e.title ?? '(untitled)',
			channel: e.uploader || e.channel || 'YouTube',
			durationSec: typeof e.duration === 'number' ? Math.round(e.duration) : null,
			playableInEmbed: typeof e.playable_in_embed === 'boolean' ? e.playable_in_embed : null
		}));
}

// Position of a result's channel in the host's preferred list (case-insensitive
// substring match); unlisted channels sort after all listed ones.
export function channelRank(channel: string, priority: string[]): number {
	const c = channel.toLowerCase();
	for (let i = 0; i < priority.length; i++) {
		const p = priority[i].trim().toLowerCase();
		if (p && c.includes(p)) return i;
	}
	return priority.length;
}

// Hides channels the host never wants to see and floats preferred channels to the top, keeping relevance
// order otherwise.
export function rankYtResults(
	results: YtResult[],
	{ priority = [], blocklist = [] }: { priority?: string[]; blocklist?: string[] } = {}
): YtResult[] {
	const isBlocked = (channel: string) => {
		const c = channel.toLowerCase();
		return blocklist.some((b) => {
			const t = b.trim().toLowerCase();
			return t.length > 0 && c.includes(t);
		});
	};
	return results
		.filter((r) => !isBlocked(r.channel))
		.map((r, i) => ({ r, i }))
		.sort(
			(a, b) => channelRank(a.r.channel, priority) - channelRank(b.r.channel, priority) || a.i - b.i
		)
		.map((x) => x.r);
}

const cache = new Map<string, { at: number; results: YtResult[] }>();
const TTL_MS = 5 * 60 * 1000;
// Guests typing the same search share one yt-dlp run.
const searching = new Map<string, Promise<YtResult[]>>();

async function fetchYtResults(query: string, n: number): Promise<YtResult[]> {
	const { env } = await import('$env/dynamic/private');
	const bin = env.YT_DLP || 'yt-dlp';
	const { stdout } = await run(
		bin,
		[buildYtQuery(query, n), '--dump-single-json', '--flat-playlist', '--no-warnings', ...youtubeCookieArgs()],
		{ timeout: 9000, maxBuffer: 16 * 1024 * 1024 }
	);
	return parseYtResults(stdout);
}

function remember(key: string, results: YtResult[]): void {
	const now = Date.now();
	for (const [old, entry] of cache) if (now - entry.at >= TTL_MS) cache.delete(old);
	// An empty answer is as likely a yt-dlp hiccup as a real miss, so it is asked again.
	if (results.length > 0) cache.set(key, { at: now, results });
}

// Keyless YouTube search via yt-dlp (silently karaoke-appended), cached by
// query. Uses --flat-playlist so it stays fast; embed status isn't known here
// (that's checked per-video at add time). Binary path from YT_DLP env,
// defaulting to `yt-dlp` on PATH.
export async function searchYouTube(
	query: string,
	{
		n = 10,
		channelPriority = [],
		channelBlocklist = []
	}: { n?: number; channelPriority?: string[]; channelBlocklist?: string[] } = {}
): Promise<YtResult[]> {
	const key = query.trim().toLowerCase();
	if (!key) return [];
	const cached = cache.get(key);
	let raw = cached && Date.now() - cached.at < TTL_MS ? cached.results : undefined;
	if (!raw) {
		let pending = searching.get(key);
		if (!pending) {
			pending = fetchYtResults(query, n).finally(() => searching.delete(key));
			searching.set(key, pending);
		}
		raw = await pending;
		remember(key, raw);
	}
	return rankYtResults(raw, { priority: channelPriority, blocklist: channelBlocklist });
}

// Single-video embed check, run when a guest actually picks a YouTube result.
// yt-dlp prints True / False / NA; only an explicit False means the owner
// blocked embedding (so the TV couldn't play it). Fails open on any error.
// --ignore-no-formats-error because only metadata is needed: when no player client
// returns formats, yt-dlp would otherwise exit with an error and the pick would
// fail open onto the TV, which would only find out when the video fails to play.
export async function checkEmbeddable(ytId: string): Promise<boolean> {
	const { env } = await import('$env/dynamic/private');
	const bin = env.YT_DLP || 'yt-dlp';
	const { stdout } = await run(
		bin,
		[
			`https://www.youtube.com/watch?v=${ytId}`,
			'--print',
			'%(playable_in_embed)s',
			'--ignore-no-formats-error',
			'--no-warnings',
			...youtubeCookieArgs()
		],
		{ timeout: 9000, maxBuffer: 1024 * 1024 }
	);
	return stdout.trim().toLowerCase() !== 'false';
}

// Asked when yt-dlp can't answer. oEmbed says 401 for a video whose owner turned embedding
// off; anything but 200 or 401 rejects, so the route can report it and fail open.
export async function oembedEmbeddable(ytId: string): Promise<boolean> {
	const watchUrl = `https://www.youtube.com/watch?v=${ytId}`;
	const response = await fetch(`https://www.youtube.com/oembed?url=${watchUrl}&format=json`, {
		signal: AbortSignal.timeout(4000)
	});
	if (response.status === 401) return false;
	if (response.status === 200) return true;
	throw new Error(`oEmbed answered ${response.status}`);
}
