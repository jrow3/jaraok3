<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { tileGradient, initial } from '$lib/ui';
	import type { AddPhase } from './addTracker';

	let {
		title,
		detail = '',
		caption,
		thumbnailUrl,
		hasArt = true,
		isStarred = false,
		isSelected = false,
		note,
		size = 'md',
		hasAddIcon = false,
		phase,
		onclick,
		tags
	}: {
		title: string;
		detail?: string;
		/** A small third line: the YouTube channel once the real artist is on the second. */
		caption?: string;
		thumbnailUrl?: string;
		hasArt?: boolean;
		isStarred?: boolean;
		isSelected?: boolean;
		note?: string;
		size?: 'md' | 'sm';
		hasAddIcon?: boolean;
		/** 'adding' while this row's add is in flight, 'added' briefly once it lands (F2). */
		phase?: AddPhase;
		onclick: () => void;
		tags?: Snippet;
	} = $props();
</script>

<button
	type="button"
	class={['song-row', size, isSelected && 'is-selected']}
	aria-busy={phase === 'adding' || undefined}
	{onclick}
>
	{#if thumbnailUrl}
		<img class="thumbnail" src={thumbnailUrl} alt="" loading="lazy" />
	{:else if hasArt}
		<span class="art" style:background={tileGradient(detail + title)}>{initial(title)}</span>
	{/if}
	<span class="meta">
		<span class="title">{#if isStarred}<span class="star-mark"><Icon name="star-fill" size={size === 'sm' ? 12 : 13} /></span>{/if}{title}</span>
		{#if note}
			<span class="note"><Icon name="check" size={13} /><span class="text">{note}</span></span>
		{:else}
			<span class="detail">{#if detail}<span class="text">{detail}</span>{/if}{@render tags?.()}</span>
		{/if}
		{#if caption}<span class="caption">{caption}</span>{/if}
	</span>
	{#if phase === 'adding'}
		<span class="spin" aria-hidden="true"></span>
	{:else if phase === 'added'}
		<span class="added" role="img" aria-label="Added"><Icon name="check" size={18} /></span>
	{:else if hasAddIcon}
		<span class="add-icon"><Icon name="plus" size={16} /></span>
	{/if}
</button>

<style>
	.song-row {
		width: 100%;
		display: flex;
		align-items: center;
		gap: var(--sp-3);
		text-align: left;
		color: var(--ink-hi);
		background: var(--s1);
		border: var(--card-edge);
		border-radius: var(--r-lg);
		box-shadow: var(--shadow-card);
		padding: var(--sp-2) var(--sp-3);
		transition: background var(--t-base) var(--ease), border-color var(--t-base) var(--ease),
			transform var(--t-fast) var(--ease);
	}
	.sm {
		gap: var(--sp-2);
	}
	@media (hover: hover) {
		.song-row:hover {
			background: var(--s2);
			border-color: var(--line);
		}
	}
	.is-selected {
		border-color: var(--accent-a55);
		box-shadow: var(--ring-selected);
	}
	.art {
		flex: none;
		display: grid;
		place-items: center;
		width: 46px;
		height: 46px;
		border-radius: var(--r-md);
		font-size: var(--fs-lg);
		font-weight: 800;
		color: var(--on-tile);
		text-shadow: var(--shadow-tile-text);
	}
	.sm .art {
		width: 38px;
		height: 38px;
		font-size: var(--fs-md);
	}
	.thumbnail {
		flex: none;
		width: 74px;
		height: 46px;
		border-radius: var(--r-md);
		object-fit: cover;
		background: var(--s2);
	}
	.sm .thumbnail {
		height: 44px;
	}
	.meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: var(--sp-1);
	}
	.title {
		font-size: var(--fs-md);
		font-weight: 700;
		letter-spacing: -0.01em;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.sm .title {
		font-size: var(--fs-sm);
		letter-spacing: 0;
	}
	.star-mark {
		color: var(--star);
		margin-right: var(--sp-1);
	}
	.detail,
	.note {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		min-width: 0;
		font-size: var(--fs-sm);
	}
	.detail {
		color: var(--ink-mid);
	}
	.sm .detail {
		font-size: var(--fs-xs);
	}
	.note {
		color: var(--accent);
		font-weight: 600;
	}
	.text,
	.caption {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.caption {
		font-size: var(--fs-xs);
		color: var(--ink-low);
	}
	.add-icon,
	.added {
		flex: none;
		display: grid;
		place-items: center;
	}
	.add-icon {
		color: var(--accent);
	}
	.added {
		color: var(--good);
	}
</style>
