<script lang="ts">
	import type { Party } from '$lib/party.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import QueueRow from '$lib/features/lineup/QueueRow.svelte';

	let { party, onremove }: { party: Party; onremove: (id: string) => void } = $props();

	let isEmpty = $derived(!party.state.current && party.state.queue.length === 0);
</script>

<!-- After the first real snapshot only: the empty placeholder would flash "No one's up yet". -->
{#if party.received}
	<section class="lineup">
		<SectionHeader label="The lineup" tone="accent" />
		{#if isEmpty}
			<EmptyState icon="mic" title="No one’s up yet" body="Be first!" />
		{:else}
			<div class="rows">
				{#if party.state.current}
					<QueueRow item={party.state.current} isNow isPlaying={party.state.isPlaying} />
				{/if}
				{#each party.state.queue as item, index (item.id)}
					{#if party.isMine(item)}
						<QueueRow {item} position={index + 1} isMine>
							{#snippet actions()}
								<Button iconOnly variant="danger" icon="x" label="Remove my song" onclick={() => onremove(item.id)} />
							{/snippet}
						</QueueRow>
					{:else}
						<QueueRow {item} position={index + 1} />
					{/if}
				{/each}
			</div>
		{/if}
	</section>
{/if}

<style>
	.lineup {
		margin-top: var(--sp-6);
		border-top: 1px solid var(--line-soft);
		padding-top: var(--sp-4);
	}
	.rows {
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}
</style>
