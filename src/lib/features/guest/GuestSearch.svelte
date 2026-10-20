<script lang="ts">
	import { page } from '$app/state';
	import type { Party } from '$lib/party.svelte';
	import type { QueueItem } from '$lib/types';
	import { COULD_NOT_SEARCH } from '$lib/messages';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { ADDED_HOLD_MS, songAddKey, type AddPhase } from '$lib/features/search/addTracker';
	import { fetchLibrary, NO_LIBRARY_RESULTS, type LibraryResults } from '$lib/features/search/api';
	import { createSearch, type SearchState } from '$lib/features/search/createSearch';
	import LibraryResult from '$lib/features/search/LibraryResult.svelte';
	import SongRow from '$lib/features/search/SongRow.svelte';
	import YoutubeSearch from '$lib/features/search/YoutubeSearch.svelte';
	import type { SearchResult, YtResult } from '$lib/features/search/types';

	let {
		party,
		singer,
		phases,
		query = $bindable(''),
		hasHint,
		onadd,
		onvideoadded
	}: {
		party: Party;
		singer: string;
		phases: Record<string, AddPhase>;
		query?: string;
		hasHint: boolean;
		/** Resolves to the new lineup item, or null when the add failed or was a repeat tap. */
		onadd: (song: SearchResult) => Promise<QueueItem | null>;
		onvideoadded: (item: QueueItem) => void;
	} = $props();

	const library = $state<SearchState<LibraryResults>>({
		results: NO_LIBRARY_RESULTS,
		isLoading: false,
		hasError: false
	});
	const search = createSearch(library, (text) => fetchLibrary(text), NO_LIBRARY_RESULTS);
	let youtubeVideos = $state<YtResult[]>([]);
	let expandedId = $state<number | null>(null);
	let input = $state<HTMLInputElement>();

	let isActive = $derived(query.trim().length >= 2);
	let results = $derived(library.results.results);
	let didYouMean = $derived(library.results.suggestions);
	let isSearching = $derived(isActive && library.isLoading && results.length === 0);
	let isEmpty = $derived(
		isActive && !library.isLoading && !library.hasError && results.length === 0 && didYouMean.length === 0
	);

	// Which library songs are already in the lineup (position 0 = singing now).
	let queuedInfo = $derived.by(() => {
		const info = new Map<number, { position: number; singer: string }>();
		party.state.queue.forEach((item, index) => {
			if (item.songId != null && !info.has(item.songId)) info.set(item.songId, { position: index + 1, singer: item.singer });
		});
		const current = party.state.current;
		if (current?.songId != null) info.set(current.songId, { position: 0, singer: current.singer });
		return info;
	});

	function noteFor(songId: number): string | undefined {
		const queued = queuedInfo.get(songId);
		if (!queued) return undefined;
		return queued.position === 0 ? `Now singing · ${queued.singer}` : `#${queued.position} in line · ${queued.singer}`;
	}

	function onInput() {
		youtubeVideos = [];
		search.search(query);
	}

	// Blurring closes the phone keyboard, so the card at the top can be seen.
	function clear() {
		query = '';
		youtubeVideos = [];
		search.clear();
		input?.blur();
	}

	// The row's check shows for a moment before the search clears.
	async function add(song: SearchResult) {
		if (await onadd(song)) setTimeout(clear, ADDED_HOLD_MS);
	}

	function addedVideo(item: QueueItem) {
		onvideoadded(item);
		setTimeout(clear, ADDED_HOLD_MS);
	}
</script>

<div class="searchbox">
	<Icon name="search" size={18} />
	<input bind:this={input} class="query" bind:value={query} oninput={onInput} placeholder="Search songs…" autocomplete="off" />
</div>
{#if hasHint}<p class="hint">Tap a song to join the lineup. You can remove it later.</p>{/if}
{#if library.hasError}
	<p class="search-error" role="alert"><Icon name="x" size={14} />{COULD_NOT_SEARCH}</p>
{:else if isSearching}
	<ul class="shimmer" aria-label="Searching">
		{#each [1, 2, 3] as row (row)}<li></li>{/each}
	</ul>
{:else if isEmpty}
	<div class="empty"><EmptyState icon="search" title="Not in the library" /></div>
{/if}
{#if results.length > 0}
	{#if youtubeVideos.length > 0}<div class="group"><SectionHeader label="In your library" tone="accent" /></div>{/if}
	<ul class="results">
		{#each results as result (result.id)}
			<li>
				<LibraryResult
					{result}
					note={noteFor(result.id)}
					audience="guest"
					{phases}
					isExpanded={expandedId === result.id}
					ontoggle={() => (expandedId = expandedId === result.id ? null : result.id)}
					onadd={add}
				/>
			</li>
		{/each}
	</ul>
{/if}
{#if results.length === 0 && didYouMean.length > 0}
	<div class="group"><SectionHeader label="Did you mean…" tone="accent" /></div>
	<ul class="results">
		{#each didYouMean as song (song.id)}
			<li>
				<SongRow title={song.title} detail={song.artist} phase={phases[songAddKey(song.id)]} onclick={() => add(song)}>
					{#snippet tags()}{#if !song.hasLyrics}<Tag kind="note" value="no-lyrics" />{/if}{/snippet}
				</SongRow>
			</li>
		{/each}
	</ul>
{/if}
{#if isActive}
	{#key query}
		{#if page.data.features.isYoutubeOn}
			<YoutubeSearch {query} {singer} {party} tone="accent" isPrimary={isEmpty} bind:videos={youtubeVideos} onadded={addedVideo} />
		{/if}
	{/key}
{/if}

<style>
	.searchbox {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		background: var(--s2);
		border: 1px solid var(--line);
		border-radius: var(--r-lg);
		padding: 0 var(--sp-3);
		color: var(--ink-low);
		margin-bottom: var(--sp-3);
		transition: border-color var(--t-base) var(--ease), box-shadow var(--t-base) var(--ease);
	}
	.searchbox:focus-within {
		border-color: var(--accent-a55);
		box-shadow: var(--ring-focus);
		color: var(--accent);
	}
	.query {
		flex: 1;
		background: none;
		border: none;
		outline: none;
		padding: var(--sp-3) 0;
		color: var(--ink-hi);
		font-size: var(--fs-input);
		min-width: 0;
	}
	.query::placeholder {
		color: var(--ink-low);
	}
	.hint {
		margin: 0 0 var(--sp-3);
		font-size: var(--fs-sm);
		color: var(--ink-mid);
	}
	.search-error {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		margin: 0 0 var(--sp-3);
		padding: var(--sp-3);
		background: var(--bad-a14);
		border: 1px solid var(--bad-a30);
		border-radius: var(--r-lg);
		color: var(--bad-soft);
		font-size: var(--fs-sm);
		font-weight: 600;
	}
	.shimmer,
	.results {
		list-style: none;
		margin: 0 0 var(--sp-3);
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}
	/* The height of one result row, so results replace the placeholders without a jump. */
	.shimmer li {
		height: 64px;
		border-radius: var(--r-lg);
		background: linear-gradient(90deg, var(--s1) 30%, var(--s2) 50%, var(--s1) 70%);
		background-size: 300% 100%;
		animation: shimmer 1.2s linear infinite;
	}
	@keyframes shimmer {
		from {
			background-position: 100% 0;
		}
		to {
			background-position: 0 0;
		}
	}
	.empty {
		margin-bottom: var(--sp-3);
	}
	.group {
		margin-top: var(--sp-3);
	}
</style>
