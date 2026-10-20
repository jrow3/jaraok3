<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { QueueItem, Tier } from '$lib/types';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { tileGradient, initial } from '$lib/ui';

	let {
		item,
		position = 0,
		isNow = false,
		isPlaying = false,
		isFresh = false,
		isMine = false,
		isPast = false,
		isDraggable = false,
		brandTier,
		hasSourceTag = false,
		actions
	}: {
		item: QueueItem;
		position?: number;
		isNow?: boolean;
		/** Animates the now-singing bars; paused songs show a still row. */
		isPlaying?: boolean;
		/** Just added: lights up for a moment so the host spots it (F2). */
		isFresh?: boolean;
		isMine?: boolean;
		isPast?: boolean;
		isDraggable?: boolean;
		brandTier?: Tier;
		hasSourceTag?: boolean;
		actions?: Snippet;
	} = $props();

	let isDownloading = $derived(item.status === 'downloading');
	let isFailed = $derived(item.status === 'failed');
	let hasBrand = $derived(!!brandTier && item.source === 'local' && !!item.discTag);
</script>

<div
	class={[
		'queue-row',
		isNow && 'is-now',
		isMine && 'is-mine',
		isPast && 'is-past',
		isDownloading && 'is-downloading',
		isFresh && 'is-fresh',
		isFailed && 'is-failed'
	]}
>
	{#if isDraggable}<span class="grip" aria-hidden="true"><Icon name="grip" size={15} /></span>{/if}
	<span class="lead">
		{#if isNow}
			{#if isPlaying}<span class="eq"><i></i><i></i><i></i></span>{/if}
		{:else if isPast}
			<Icon name="clock" size={13} />
		{:else if position > 0}
			{position}
		{/if}
	</span>
	<span class="ava" style:background={tileGradient(item.singer)}>{initial(item.singer)}</span>
	<span class="meta">
		<span class="singer"><span class="name">{item.singer}</span>{#if isMine}<span class="you">· you</span>{/if}</span>
		<span class="song">{item.title} · {item.artist}</span>
		{#if hasBrand || hasSourceTag}
			<span class="tags">
				{#if hasBrand && brandTier && item.discTag}<Tag kind="tier" value={brandTier} label={item.discTag} />{/if}
				{#if hasSourceTag && !hasBrand}<span class="source-tag"><Tag kind="source" value={item.source} /></span>{/if}
			</span>
		{/if}
		<!-- No progress bar: yt-dlp reports no progress we pass on, so a moving bar would be made up (F6). -->
		{#if isDownloading}
			<span class="status downloading"><span class="spin" aria-hidden="true"></span>Downloading, plays when ready</span>
		{:else if isFailed}
			<span class="status failed"><Icon name="x" size={12} />Download failed</span>
		{/if}
	</span>
	{#if isNow}<span class="now-label">Now singing</span>{/if}
	{#if actions}<span class="actions">{@render actions()}</span>{/if}
</div>

<style>
	.queue-row {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		padding: var(--sp-2) var(--sp-3);
		background: var(--s1);
		border: var(--card-edge);
		border-radius: var(--r-lg);
		box-shadow: var(--shadow-card);
		transition: background var(--t-slow) var(--ease), border-color var(--t-slow) var(--ease);
	}
	.is-now {
		background: var(--surface-now), var(--s1);
		border-color: var(--accent-a28);
	}
	.is-mine {
		border-color: var(--accent-a55);
		box-shadow: var(--ring-selected);
	}
	.is-past {
		opacity: 0.72;
	}
	.is-downloading {
		border-style: dashed;
		border-color: var(--warn-a35);
	}
	.is-fresh {
		background: var(--accent-a10);
		border-color: var(--accent-a55);
	}
	.is-failed {
		border-style: dashed;
		border-color: var(--bad-a40);
	}
	.lead {
		flex: none;
		display: grid;
		place-items: center;
		width: 18px;
		font-size: var(--fs-xs);
		color: var(--ink-low);
		font-variant-numeric: tabular-nums;
	}
	.meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.singer {
		display: flex;
		gap: var(--sp-1);
		min-width: 0;
		font-size: var(--fs-sm);
		font-weight: 700;
	}
	.name,
	.song {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.you {
		flex: none;
	}
	.song {
		font-size: var(--fs-xs);
		color: var(--ink-mid);
	}
	/* One line at any width: the brand tag shrinks with an ellipsis, the short source tag stays whole (L1).
	   A brand is only ever on a CDG disc, so a branded row leaves out CDG and the brand gets the room. */
	.tags {
		display: flex;
		gap: var(--sp-1);
		margin-top: var(--sp-1);
		min-width: 0;
	}
	.source-tag {
		flex: none;
		display: flex;
	}
	.status {
		display: flex;
		align-items: center;
		gap: var(--sp-1);
		margin-top: var(--sp-1);
		font-size: var(--fs-xs);
		font-weight: 600;
	}
	.status.downloading {
		color: var(--warn);
	}
	.status.failed {
		color: var(--bad);
	}
	.status .spin {
		width: 11px;
		height: 11px;
		border-width: 1.5px;
		border-color: var(--warn-a35);
		border-top-color: var(--warn);
	}
	.tags :global(.tag) {
		display: block;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.now-label {
		flex: none;
		font-size: var(--fs-xs);
		font-weight: 600;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.actions {
		flex: none;
		display: flex;
		align-items: center;
		gap: var(--sp-1);
	}
</style>
