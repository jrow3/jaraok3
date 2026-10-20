import { createSearch, type SearchState } from '$lib/features/search/createSearch';
import { fetchLibrary, NO_LIBRARY_RESULTS, type LibraryResults } from '$lib/features/search/api';
import { buildSuggestRequest, fetchSuggestions } from '$lib/features/search/suggestions';
import type { SearchResult, YtResult } from '$lib/features/search/types';
import type { PartySnapshot } from '$lib/types';

// Created by the host page, not the tab, so the search and suggestions survive a tab
// switch; and per page, not at module level, because module state on the server is
// shared by every request.
export function createControlsState() {
	let query = $state('');
	let singer = $state('Guest');
	let expandedId = $state<number | null>(null);
	let youtubeVideos = $state<YtResult[]>([]);
	let suggestions = $state<SearchResult[]>([]);
	const library = $state<SearchState<LibraryResults>>({
		results: NO_LIBRARY_RESULTS,
		isLoading: false,
		hasError: false
	});
	const search = createSearch(library, (text) => fetchLibrary(text), NO_LIBRARY_RESULTS);

	return {
		get query() {
			return query;
		},
		set query(text: string) {
			query = text;
		},
		get singer() {
			return singer;
		},
		set singer(name: string) {
			singer = name;
		},
		get singerName() {
			return singer.trim() || 'Guest';
		},
		get expandedId() {
			return expandedId;
		},
		set expandedId(id: number | null) {
			expandedId = id;
		},
		get youtubeVideos() {
			return youtubeVideos;
		},
		set youtubeVideos(videos: YtResult[]) {
			youtubeVideos = videos;
		},
		get library() {
			return library;
		},
		get suggestions() {
			return suggestions;
		},
		onQueryInput: () => {
			youtubeVideos = [];
			search.search(query);
		},
		refresh: () => search.refresh(query),
		clear: () => {
			query = '';
			youtubeVideos = [];
			search.clear();
		},
		loadSuggestions: async (party: PartySnapshot) => {
			suggestions = await fetchSuggestions(buildSuggestRequest(party));
		}
	};
}

export type ControlsState = ReturnType<typeof createControlsState>;
