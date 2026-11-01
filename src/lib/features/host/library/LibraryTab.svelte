<script lang="ts">
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import type { HostSettings } from '../hostSettings.svelte';
	import BrandList from './BrandList.svelte';
	import ChannelList from './ChannelList.svelte';
	import HiddenChannels from './HiddenChannels.svelte';
	import type { Rescan } from './rescan.svelte';
	import YoutubeDownloader from './YoutubeDownloader.svelte';
	import type { YtdlpUpdate } from './ytdlpUpdate.svelte';

	let { settings, rescan, ytdlp }: { settings: HostSettings; rescan: Rescan; ytdlp: YtdlpUpdate } = $props();
</script>

<div class="tab">
	<section>
		<SectionHeader label="Library index" />
		<div class="setting-row">
			<Button variant="ghost" loading={rescan.status.isRescanning} onclick={rescan.run}>
				{rescan.status.isRescanning ? 'Rescanning…' : 'Rescan library'}
			</Button>
			<span class={['status', rescan.status.hasFailed && 'is-error']} role="status">{rescan.status.message}</span>
		</div>
		<p class="hint">Run this after adding songs to the drive. It takes a minute or so, and the party keeps playing.</p>
	</section>
	<BrandList {settings} />
	{#if page.data.features.isYoutubeOn}
	<ChannelList {settings} />
	<!-- Rarely needed now that unembeddable videos download on their own. -->
	<details class="advanced">
		<summary>Advanced<span class="chevron"><Icon name="chev-down" size={14} /></span></summary>
		<div class="advanced-body">
			<HiddenChannels {settings} />
			<YoutubeDownloader update={ytdlp} />
		</div>
	</details>
	{/if}
</div>

<style>
	.tab {
		display: flex;
		flex-direction: column;
		gap: var(--sp-6);
	}
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
	.status {
		color: var(--ink-mid);
	}
	.is-error {
		color: var(--bad-soft);
	}
	.hint {
		margin: 0;
		font-size: var(--fs-sm);
		color: var(--ink-mid);
	}
	.advanced summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: var(--tap);
		list-style: none;
		cursor: pointer;
		border-top: 1px solid var(--line-soft);
		font-size: var(--fs-sm);
		font-weight: 700;
		color: var(--ink-mid);
	}
	.advanced summary::-webkit-details-marker {
		display: none;
	}
	.advanced[open] summary {
		margin-bottom: var(--sp-3);
	}
	.advanced-body {
		display: flex;
		flex-direction: column;
		gap: var(--sp-6);
	}
	.chevron {
		display: grid;
		transition: transform var(--t-base) var(--ease);
	}
	.advanced[open] .chevron {
		transform: rotate(180deg);
	}
	@media (hover: hover) {
		.advanced summary:hover {
			color: var(--ink-hi);
		}
	}
</style>
