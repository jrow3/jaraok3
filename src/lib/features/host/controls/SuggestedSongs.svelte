<script lang="ts">
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import SongRow from '$lib/features/search/SongRow.svelte';
	import type { SearchResult } from '$lib/features/search/types';

	let { songs, onadd }: { songs: SearchResult[]; onadd: (song: SearchResult) => void } = $props();
</script>

{#if songs.length > 0}
	<section>
		<SectionHeader label="Suggested songs" />
		<ul class="results">
			{#each songs as song (song.id)}
				<li>
					<SongRow title={song.title} detail={song.artist} isStarred={song.isStarred} size="sm" hasAddIcon onclick={() => onadd(song)}>
						{#snippet tags()}{#if song.discTag}<Tag kind="tier" value={song.tier} label={song.discTag} />{/if}{/snippet}
					</SongRow>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.results {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}
</style>
