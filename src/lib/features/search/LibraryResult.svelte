<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import SongRow from './SongRow.svelte';
	import StarButton from './StarButton.svelte';
	import { brandName } from './brandName';
	import { songAddKey, type AddPhase } from './addTracker';
	import type { SearchResult } from './types';

	let {
		result,
		note,
		size = 'md',
		hasAddIcon = false,
		audience = 'host',
		phases = {},
		isExpanded,
		ontoggle,
		onadd,
		onstar
	}: {
		result: SearchResult;
		note?: string;
		size?: 'md' | 'sm';
		hasAddIcon?: boolean;
		/** Guests see each version's company and plain quality notes; the host also sees brand tiers (H2). */
		audience?: 'host' | 'guest';
		phases?: Record<string, AddPhase>;
		isExpanded: boolean;
		ontoggle: () => void;
		onadd: (song: SearchResult) => void;
		onstar?: (songId: number) => void;
	} = $props();

	let versions = $derived(result.versions ?? []);
	let isGuest = $derived(audience === 'guest');
</script>

<div class="result">
	<div class="slot">
		<SongRow
			title={result.title}
			detail={result.artist}
			isStarred={result.isStarred}
			isSelected={!!note}
			{note}
			{size}
			{hasAddIcon}
			phase={phases[songAddKey(result.id)]}
			onclick={() => onadd(result)}
		>
			{#snippet tags()}
				{#if isGuest}
					{#if !result.hasLyrics}<Tag kind="note" value="no-lyrics" />{/if}
				{:else if result.discTag}
					<Tag kind="tier" value={result.tier} label={brandName(result.discTag)} />
				{/if}
			{/snippet}
		</SongRow>
	</div>
	{#if versions.length > 1}
		<button type="button" class={['expand', isExpanded && 'is-open']} onclick={ontoggle} aria-expanded={isExpanded}>
			{versions.length} versions
			<span class="chevron"><Icon name="chev-down" size={14} /></span>
		</button>
	{/if}
</div>
{#if isExpanded && versions.length > 0}
	<ul class="versions">
		{#each versions as version, index (version.id)}
			<li>
				{#if onstar}<StarButton isOn={version.isStarred} onclick={() => onstar?.(version.id)} />{/if}
				<div class="slot">
					<SongRow
						title={isGuest ? (version.discTag ? brandName(version.discTag) : `Version ${index + 1}`) : version.hasLyrics ? 'Lyrics' : 'Audio only'}
						hasArt={false}
						isStarred={!onstar && version.isStarred}
						{size}
						{hasAddIcon}
						phase={phases[songAddKey(version.id)]}
						onclick={() => onadd(version)}
					>
						{#snippet tags()}
							{#if !isGuest}
								<Tag kind="tier" value={version.tier} label={version.discTag ? brandName(version.discTag) : 'Unknown'} />
							{:else}
								{#if index === 0}<Tag kind="note" value="best" />{/if}
								{#if !version.hasLyrics}<Tag kind="note" value="no-lyrics" />{/if}
							{/if}
						{/snippet}
					</SongRow>
				</div>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.result {
		display: flex;
		gap: var(--sp-2);
		align-items: stretch;
	}
	.slot {
		flex: 1;
		min-width: 0;
		display: flex;
	}
	.expand {
		flex: none;
		display: inline-flex;
		align-items: center;
		gap: var(--sp-1);
		min-width: var(--tap);
		min-height: var(--tap);
		padding: 0 var(--sp-3);
		background: var(--s1);
		border: 1px solid var(--line-soft);
		border-radius: var(--r-lg);
		color: var(--ink-mid);
		font-size: var(--fs-sm);
		font-weight: 600;
		transition: color var(--t-base) var(--ease), border-color var(--t-base) var(--ease),
			background var(--t-base) var(--ease);
	}
	.chevron {
		display: grid;
		transition: transform var(--t-base) var(--ease);
	}
	.is-open {
		color: var(--accent);
		background: var(--accent-a10);
		border-color: var(--accent-a40);
	}
	.is-open .chevron {
		transform: rotate(180deg);
	}
	@media (hover: hover) {
		.expand:hover {
			color: var(--accent);
			border-color: var(--accent-a40);
		}
	}
	.versions {
		list-style: none;
		margin: var(--sp-2) 0 0 var(--sp-4);
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}
	.versions li {
		display: flex;
		gap: var(--sp-2);
		align-items: stretch;
	}
</style>
