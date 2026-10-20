<script lang="ts">
	import type { Party } from '$lib/party.svelte';
	import type { QueueItem } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import QueueRow from '$lib/features/lineup/QueueRow.svelte';
	import StarButton from '$lib/features/search/StarButton.svelte';
	import type { HostSettings } from '../hostSettings.svelte';
	import { toast } from '$lib/toast.svelte';
	import { showFailed, showUndoFailed } from '../showFailed';

	let {
		party,
		settings,
		ontogglestar
	}: { party: Party; settings: HostSettings; ontogglestar: (songId: number) => void } = $props();

	let history = $derived(party.state.history);

	function requeue(item: QueueItem) {
		party
			.requeue({
				source: item.source,
				songId: item.songId,
				ytId: item.ytId,
				discTag: item.discTag,
				artist: item.artist,
				title: item.title,
				singer: item.singer,
				owner: item.owner,
				theme: item.theme,
				isHouseSound: item.isHouseSound
			})
			.then((added) => {
				// An idle party starts the copy at once, and a song on stage can only be too late to undo.
				const isOnStage = added.id === party.state.current?.id;
				const undo = { label: 'Undo', run: () => party.unrequeue(added.id).catch(showUndoFailed) };
				toast(`Added ${item.title} again`, isOnStage ? undefined : { action: undo });
			})
			.catch(showFailed);
	}
</script>

{#if history.length > 0}
	<section>
		<SectionHeader label="Recently played" />
		<ul class="rows">
			{#each history as item (item.id)}
				<li>
					<QueueRow {item} isPast brandTier={item.discTag ? settings.tierOf(item.discTag) : undefined}>
						{#snippet actions()}
							{#if item.source === 'local' && item.songId != null}
								{@const songId = item.songId}
								<StarButton isOn={settings.isStarred(songId)} onclick={() => ontogglestar(songId)} />
							{/if}
							<Button variant="ghost" icon="top" title="Add again at the top" onclick={() => requeue(item)}>Again</Button>
						{/snippet}
					</QueueRow>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.rows {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}
</style>
