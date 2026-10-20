<script lang="ts">
	import { untrack } from 'svelte';
	import type { Party } from '$lib/party.svelte';
	import type { QueueItem } from '$lib/types';
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ReorderList from '$lib/components/ui/ReorderList.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import { moveBy } from '$lib/components/ui/reorder';
	import QueueRow from '$lib/features/lineup/QueueRow.svelte';
	import { newArrivals } from '$lib/features/lineup/newArrivals';
	import type { HostSettings } from '../hostSettings.svelte';
	import { toast } from '$lib/toast.svelte';
	import { showFailed, showUndoFailed } from '../showFailed';

	// Long enough to spot the new row after glancing back at the phone.
	const FRESH_MS = 2000;

	let { party, settings }: { party: Party; settings: HostSettings } = $props();

	let queue = $derived(party.state.queue);
	let previousIds: string[] | null = null;
	let freshIds = $state<string[]>([]);

	// Starts at the first real snapshot, so the songs already waiting don't all light up.
	$effect(() => {
		if (!party.received) return;
		const ids = queue.map((item) => item.id);
		const arrived = newArrivals(previousIds, ids);
		previousIds = ids;
		if (arrived.length === 0) return;
		untrack(() => (freshIds = [...freshIds, ...arrived]));
		setTimeout(() => (freshIds = freshIds.filter((id) => !arrived.includes(id))), FRESH_MS);
	});

	function reorder(next: QueueItem[] | null) {
		if (next) party.reorder(next.map((item) => item.id)).catch(showFailed);
	}

	function remove(item: QueueItem, index: number) {
		party
			.remove(item.id)
			.then(() => {
				// A failed download would only fail again, so it gets no Undo.
				if (item.status === 'failed') return;
				toast(`Removed ${item.title}`, {
					action: { label: 'Undo', run: () => party.unremove(item.id, index).catch(showUndoFailed) }
				});
			})
			.catch(showFailed);
	}
</script>

<section>
	<SectionHeader label="Up next" count="{queue.length} waiting" />
	{#if queue.length === 0}
		<EmptyState icon="mic" title="No one’s up yet" body="Songs people add show up here." />
	{:else}
		<ReorderList items={queue} key={(item) => item.id} label="Up next" onreorder={reorder}>
			{#snippet row(item, index)}
				<QueueRow
					{item}
					position={index + 1}
					isDraggable
					isFresh={freshIds.includes(item.id)}
					brandTier={item.discTag ? settings.tierOf(item.discTag) : undefined}
					hasSourceTag
				>
					{#snippet actions()}
						<Button iconOnly size="sm" icon="up" label="Move up" disabled={index === 0} onclick={() => reorder(moveBy(queue, index, -1))} />
						<Button iconOnly size="sm" icon="down" label="Move down" disabled={index === queue.length - 1} onclick={() => reorder(moveBy(queue, index, 1))} />
						<Button iconOnly size="sm" variant="danger" icon="x" label="Remove from the lineup" onclick={() => remove(item, index)} />
					{/snippet}
				</QueueRow>
			{/snippet}
		</ReorderList>
	{/if}
</section>
