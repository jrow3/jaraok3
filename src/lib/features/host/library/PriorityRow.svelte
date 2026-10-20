<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';

	let {
		position,
		count,
		onmove,
		onremove,
		removeLabel = 'Remove',
		children
	}: {
		position: number;
		count: number;
		onmove: (offset: -1 | 1) => void;
		onremove?: () => void;
		removeLabel?: string;
		children: Snippet;
	} = $props();
</script>

<div class="priority-row">
	<span class="grip" aria-hidden="true"><Icon name="grip" size={15} /></span>
	<span class="position">{position}</span>
	<div class="content">{@render children()}</div>
	<span class="actions">
		<Button iconOnly size="sm" icon="up" label="Move up" disabled={position === 1} onclick={() => onmove(-1)} />
		<Button iconOnly size="sm" icon="down" label="Move down" disabled={position === count} onclick={() => onmove(1)} />
		{#if onremove}
			<Button iconOnly size="sm" variant="danger" icon="x" label={removeLabel} onclick={onremove} />
		{/if}
	</span>
</div>

<style>
	.priority-row {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		padding: var(--sp-2) var(--sp-3);
		background: var(--s1);
		border: var(--card-edge);
		border-radius: var(--r-lg);
		box-shadow: var(--shadow-card);
	}
	.position {
		flex: none;
		width: 18px;
		text-align: center;
		font-size: var(--fs-xs);
		color: var(--ink-low);
		font-variant-numeric: tabular-nums;
	}
	.content {
		flex: 1;
		min-width: 0;
	}
	.actions {
		flex: none;
		display: flex;
		gap: var(--sp-1);
	}
</style>
