<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		isRow = false,
		isCompact = false,
		children
	}: { isRow?: boolean; isCompact?: boolean; children: Snippet } = $props();
</script>

<div class={['glass-card', isRow && 'is-row', isCompact && 'is-compact']}>
	{@render children()}
</div>

<style>
	.glass-card {
		display: flex;
		flex-direction: column;
		gap: calc(var(--tv-gap) / 2);
		min-width: 0;
		padding: var(--tv-gap) calc(var(--tv-gap) * 1.25);
		border: 1px solid var(--tv-glass-line);
		border-radius: var(--tv-radius);
		background: var(--tv-glass);
		backdrop-filter: blur(8px);
	}
	.is-row {
		flex-direction: row;
		align-items: center;
		gap: var(--tv-gap);
	}
	.is-compact {
		padding: calc(var(--tv-gap) / 2) var(--tv-gap);
	}
</style>
