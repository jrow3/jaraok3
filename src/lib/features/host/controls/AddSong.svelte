<script lang="ts">
	import { page } from '$app/state';
	import type { Party } from '$lib/party.svelte';
	import { COULD_NOT_SEARCH } from '$lib/messages';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import LibraryResult from '$lib/features/search/LibraryResult.svelte';
	import YoutubeSearch from '$lib/features/search/YoutubeSearch.svelte';
	import type { SearchResult } from '$lib/features/search/types';
	import type { ControlsState } from './controlsState.svelte';

	let {
		party,
		controls,
		onadd,
		ontogglestar
	}: {
		party: Party;
		controls: ControlsState;
		onadd: (song: SearchResult) => void;
		ontogglestar: (songId: number) => void;
	} = $props();

	function toggle(id: number) {
		controls.expandedId = controls.expandedId === id ? null : id;
	}
</script>

<section>
	<SectionHeader label="Add a song" />
	<div class="add-row">
		<input class="input singer" bind:value={controls.singer} placeholder="Singer" maxlength="60" />
		<input
			class="input query"
			bind:value={controls.query}
			oninput={controls.onQueryInput}
			placeholder="Search songs…"
		/>
	</div>
	{#if controls.library.hasError}<p class="message">{COULD_NOT_SEARCH}</p>{/if}
	<ul class="results">
		{#each controls.library.results.results as result (result.id)}
			<li>
				<LibraryResult
					{result}
					size="sm"
					hasAddIcon
					isExpanded={controls.expandedId === result.id}
					ontoggle={() => toggle(result.id)}
					{onadd}
					onstar={ontogglestar}
				/>
			</li>
		{/each}
	</ul>
	{#if page.data.features.isYoutubeOn && controls.query.trim().length >= 2}
		<div class="youtube">
			{#key controls.query}
				<YoutubeSearch
					query={controls.query}
					singer={controls.singerName}
					{party}
					size="sm"
					hasAddIcon
					bind:videos={controls.youtubeVideos}
					onadded={controls.clear}
				/>
			{/key}
		</div>
	{/if}
</section>

<style>
	.add-row {
		display: flex;
		gap: var(--sp-2);
	}
	.singer {
		flex: none;
		width: 110px;
	}
	.query {
		flex: 1;
		min-width: 0;
	}
	.message {
		margin: var(--sp-3) 0 0;
		font-size: var(--fs-sm);
		color: var(--ink-mid);
	}
	/* Space above, not below: an empty list must not leave a gap before the next section. */
	.results:not(:empty) {
		margin-top: var(--sp-3);
	}
	.youtube {
		margin-top: var(--sp-3);
	}
	.results {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}
</style>
