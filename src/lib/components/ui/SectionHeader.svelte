<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		label,
		tone = 'muted',
		count,
		aside
	}: { label: string; tone?: 'muted' | 'accent'; count?: string; aside?: Snippet } = $props();
</script>

<div class="section-header">
	<h2 class="eyebrow" class:accent={tone === 'accent'}>{label}</h2>
	{#if count}<span class="count">{count}</span>{/if}
	{#if aside}<span class="aside">{@render aside()}</span>{/if}
</div>

<style>
	.section-header {
		display: flex;
		align-items: baseline;
		gap: var(--sp-2);
		margin-bottom: var(--sp-2);
	}
	.accent {
		color: var(--accent);
	}
	.count {
		font-size: var(--fs-xs);
		color: var(--ink-low);
	}
	.aside {
		margin-left: auto;
	}
</style>
