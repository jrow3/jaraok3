<script lang="ts">
	import type { Tier } from '$lib/types';
	import ReorderList from '$lib/components/ui/ReorderList.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import Segmented from '$lib/components/ui/Segmented.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { moveBy } from '$lib/components/ui/reorder';
	import type { HostSettings } from '../hostSettings.svelte';
	import SaveStatus from '../SaveStatus.svelte';
	import PriorityRow from './PriorityRow.svelte';

	let { settings }: { settings: HostSettings } = $props();

	const TIER_OPTIONS: { value: Tier; label: string; tone: 'good' | 'warn' | 'bad' }[] = [
		{ value: 'green', label: 'Good', tone: 'good' },
		{ value: 'yellow', label: 'OK', tone: 'warn' },
		{ value: 'red', label: 'Poor', tone: 'bad' }
	];

	let brands = $derived(settings.data.brandPriority);

	function reorder(next: string[] | null) {
		if (next) settings.update({ brandPriority: next });
	}

	function setTier(tag: string, tier: Tier) {
		settings.update({ brandTiers: { ...settings.data.brandTiers, [tag]: tier } });
	}
</script>

<section>
	<SectionHeader label="Brand priority and quality">
		{#snippet aside()}<SaveStatus saveState={settings.saveStates.brands} onretry={() => settings.retry('brands')} />{/snippet}
	</SectionHeader>
	<p class="hint">
		Drag or use the arrows to order which brand wins for a duplicate song (top = preferred).
		Rate each Good (accurate), OK (mixed) or Poor (covers or poor timing). Good wins in search.
	</p>
	<ReorderList items={brands} key={(tag) => tag} label="Brand priority" onreorder={reorder}>
		{#snippet row(tag, index)}
			<PriorityRow position={index + 1} count={brands.length} onmove={(offset) => reorder(moveBy(brands, index, offset))}>
				<div class="brand">
					<span class="brand-name">
						<Tag kind="tier" value={settings.tierOf(tag)} label={tag} />
						<span class="song-count">{(settings.data.brandCounts[tag] ?? 0).toLocaleString()}</span>
					</span>
					<div class="tier-picker">
						<Segmented
							label="Quality of {tag}"
							options={TIER_OPTIONS}
							value={settings.tierOf(tag)}
							onchange={(tier) => setTier(tag, tier)}
						/>
					</div>
				</div>
			</PriorityRow>
		{/snippet}
	</ReorderList>
</section>

<style>
	.hint {
		margin: 0 0 var(--sp-3);
		font-size: var(--fs-sm);
		color: var(--ink-mid);
	}
	.brand {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: var(--sp-1);
	}
	.brand-name {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		max-width: 100%;
		overflow: hidden;
	}
	.song-count {
		font-size: var(--fs-xs);
		color: var(--ink-low);
	}
	.tier-picker {
		width: 100%;
		max-width: 220px;
	}
</style>
