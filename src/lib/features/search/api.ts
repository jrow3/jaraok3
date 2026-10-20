import type { AddInput } from '../../types';
import type { SearchResult, YtResult } from './types';
import { parseYoutubeTitle } from './youtubeTitle';

export interface LibraryResults {
	results: SearchResult[];
	suggestions: SearchResult[];
}

export const NO_LIBRARY_RESULTS: LibraryResults = { results: [], suggestions: [] };

export async function fetchLibrary(query: string, fetcher: typeof fetch = fetch): Promise<LibraryResults> {
	const response = await fetcher(`/api/search?q=${encodeURIComponent(query)}`);
	if (!response.ok) throw new Error(`Library search failed: ${response.status}`);
	const data = await response.json();
	return { results: data.results, suggestions: data.suggestions ?? [] };
}

export async function fetchYoutube(query: string, fetcher: typeof fetch = fetch): Promise<YtResult[]> {
	const response = await fetcher(`/api/youtube?q=${encodeURIComponent(query)}`);
	if (!response.ok) throw new Error(`YouTube search failed: ${response.status}`);
	return (await response.json()).results;
}

export async function isEmbeddable(ytId: string, fetcher: typeof fetch = fetch): Promise<boolean> {
	try {
		const response = await fetcher(`/api/youtube/check?id=${encodeURIComponent(ytId)}`);
		return (await response.json()).embeddable;
	} catch {
		// The check being down shouldn't block a good pick.
		return true;
	}
}

export function libraryInput(song: SearchResult, singer: string): AddInput {
	return {
		source: song.source,
		songId: song.id,
		discTag: song.discTag,
		artist: song.artist,
		title: song.title,
		singer
	};
}

export function youtubeInput(video: YtResult, singer: string): AddInput {
	const parsed = parseYoutubeTitle(video.title);
	return {
		source: 'youtube',
		ytId: video.ytId,
		artist: parsed?.artist ?? video.channel,
		title: parsed?.title ?? video.title,
		singer
	};
}
