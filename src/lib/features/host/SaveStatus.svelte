<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import type { SaveState } from './saveStatus';

	let { saveState, onretry }: { saveState: SaveState | undefined; onretry: () => void } = $props();
</script>

<!-- Always rendered: screen readers only announce changes inside a live region that already exists. -->
<span class="save-status" role="status">
	{#if saveState === 'saving'}
		<span class="saving">Saving…</span>
	{:else if saveState === 'saved'}
		<span class="saved"><Icon name="check" size={13} />Saved</span>
	{:else if saveState === 'failed'}
		<span class="failed">Couldn’t save ·</span>
		<button type="button" class="retry" onclick={onretry}>Retry</button>
	{/if}
</span>

<style>
	.save-status {
		display: inline-flex;
		align-items: center;
		gap: var(--sp-1);
		font-size: var(--fs-xs);
		font-weight: 600;
	}
	.saving {
		color: var(--ink-low);
	}
	.saved {
		display: inline-flex;
		align-items: center;
		gap: var(--sp-1);
		color: var(--good);
	}
	.failed {
		color: var(--bad-soft);
	}
	.retry {
		min-height: var(--tap-sm);
		padding: 0 var(--sp-2);
		background: none;
		border: none;
		color: var(--accent);
		font-size: var(--fs-xs);
		font-weight: 700;
	}
	@media (hover: hover) {
		.retry:hover {
			text-decoration: underline;
		}
	}
</style>
