import { songKey } from '../../songKey';
import type { PartySnapshot, QueueItem } from '../../types';
import type { SearchResult } from './types';

export interface Seed {
	artist: string;
	title: string;
	songId: number | null;
}

export interface SuggestRequest {
	seed: Seed[];
	exclude: number[];
	excludeKeys: string[];
}

export const MAX_SEEDS = 20;

const seedKey = (song: { artist: string; title: string }) => `${song.artist}\n${song.title}`.toLowerCase();
const isItem = (item: QueueItem | null): item is QueueItem => item !== null;

// Tonight's songs replace this phone's remembered pick of the same song, and
// anything playing, queued or already sung is excluded so suggestions stay new.
export function buildSuggestRequest(
	party: Pick<PartySnapshot, 'current' | 'queue' | 'history' | 'sung'>,
	seeds: Seed[] = []
): SuggestRequest {
	const bySong = new Map<string, Seed>();
	for (const seed of seeds) bySong.set(seedKey(seed), seed);
	for (const item of [party.current, ...party.queue, ...party.history].filter(isItem)) {
		bySong.set(seedKey(item), { artist: item.artist, title: item.title, songId: item.songId ?? null });
	}
	const upcoming = [party.current, ...party.queue].filter(isItem);
	return {
		seed: [...bySong.values()].slice(0, MAX_SEEDS),
		exclude: upcoming.map((item) => item.songId).filter((id): id is number => typeof id === 'number'),
		excludeKeys: [...party.sung, ...upcoming.map((item) => songKey(item.artist, item.title))]
	};
}

export async function fetchSuggestions(request: SuggestRequest, fetcher: typeof fetch = fetch): Promise<SearchResult[]> {
	try {
		const response = await fetcher('/api/suggest', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(request)
		});
		return (await response.json()).results ?? [];
	} catch {
		// Suggestions are a nice-to-have; when they fail the panel just stays hidden.
		return [];
	}
}
