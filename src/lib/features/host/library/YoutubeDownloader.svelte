<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import type { YtdlpUpdate } from './ytdlpUpdate.svelte';

	let { update }: { update: YtdlpUpdate } = $props();

	onMount(() => update.loadVersion());
</script>

<section>
	<SectionHeader label="YouTube downloader" />
	<div class="setting-row">
		<span>yt-dlp <span class="version">{update.status.version || '…'}</span></span>
		<Button variant="ghost" loading={update.status.isUpdating} onclick={update.run}>
			{update.status.isUpdating ? 'Checking…' : 'Check for update'}
		</Button>
	</div>
	{#if update.status.hasCookies !== null}
		<p class="hint">{update.status.hasCookies ? 'Using YouTube cookies' : 'No YouTube cookies'}</p>
	{/if}
	<p class={['status', update.status.hasFailed && 'is-error']} role="status">{update.status.message}</p>
	<p class="hint">
		Try this when YouTube picks stop playing or downloading. It also updates itself on every
		rebuild of the app.
	</p>
</section>

<style>
	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--sp-3);
		padding: var(--sp-3) 0;
		border-top: 1px solid var(--line-soft);
		font-size: var(--fs-sm);
		font-weight: 600;
	}
	.version {
		color: var(--ink-mid);
		font-variant-numeric: tabular-nums;
	}
	.status,
	.hint {
		margin: 0;
		font-size: var(--fs-sm);
		color: var(--ink-mid);
	}
	.status:empty {
		display: none;
	}
	.status {
		margin-bottom: var(--sp-2);
		font-weight: 600;
	}
	.is-error {
		color: var(--bad-soft);
	}
</style>
