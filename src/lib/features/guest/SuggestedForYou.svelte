<script lang="ts">
	import { onMount } from 'svelte';
	import type { Party } from '$lib/party.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { songAddKey, type AddPhase } from '$lib/features/search/addTracker';
	import SongRow from '$lib/features/search/SongRow.svelte';
	import { buildSuggestRequest, fetchSuggestions, type Seed } from '$lib/features/search/suggestions';
	import type { SearchResult } from '$lib/features/search/types';
	import { createScrollHold } from './scrollHold';

	// Lets a burst of adds settle before asking again.
	const REFRESH_DELAY_MS = 1500;

	let {
		party,
		seeds,
		phases,
		isHidden,
		onadd
	}: {
		party: Party;
		seeds: Seed[];
		phases: Record<string, AddPhase>;
		/** Hidden while searching; kept mounted so the list survives a search. */
		isHidden: boolean;
		onadd: (song: SearchResult) => void;
	} = $props();

	let suggestions = $state<SearchResult[]>([]);
	const hold = createScrollHold();
	let ticket = 0;
	let isFirstLoad = true;

	// Only the latest request lands: a slow earlier answer must not replace a newer one.
	async function load() {
		const mine = ++ticket;
		const results = await fetchSuggestions(buildSuggestRequest(party.state, seeds));
		if (mine === ticket) hold.runWhenStill(() => (suggestions = results));
	}

	onMount(() => hold.cancel);

	$effect(() => {
		void (party.state.queue.length + '|' + (party.state.current?.id ?? ''));
		const timer = setTimeout(load, isFirstLoad ? 0 : REFRESH_DELAY_MS);
		isFirstLoad = false;
		return () => clearTimeout(timer);
	});
</script>

<svelte:window onscroll={hold.noteScroll} />

{#if !isHidden && suggestions.length > 0}
	<section class="suggested">
		<SectionHeader label="Suggested for you" tone="accent" />
		<ul class="results">
			{#each suggestions as song (song.id)}
				<li>
					<SongRow
						title={song.title}
						detail={song.artist}
						isStarred={song.isStarred}
						phase={phases[songAddKey(song.id)]}
						onclick={() => onadd(song)}
					>
						{#snippet tags()}{#if !song.hasLyrics}<Tag kind="note" value="no-lyrics" />{/if}{/snippet}
					</SongRow>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.suggested {
		margin-top: var(--sp-6);
	}
	.results {
		list-style: none;
		margin: 0 0 var(--sp-3);
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}
</style>
