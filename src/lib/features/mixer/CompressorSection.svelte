<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import Meter from '$lib/components/ui/Meter.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import Segmented from '$lib/components/ui/Segmented.svelte';
	import { COMPRESSOR_LEVELS, currentCompressorLevel, type CompressorLevel } from './compressorLevels';
	import type { ControlId, MixerParams } from './controls';
	import type { MixerClient } from './mixerClient.svelte';
	import MixerControl from './MixerControl.svelte';

	let { mixer, live, squash }: { mixer: MixerClient; live: MixerParams; squash: number } = $props();

	const FINE_TUNE_IDS: ControlId[] = ['compThreshold', 'compRatio', 'compMakeup', 'compAttack', 'compRelease', 'compKnee'];

	const level = $derived(currentCompressorLevel(live));

	function choose(next: CompressorLevel | 'custom') {
		if (next === 'custom') return;
		for (const [id, value] of Object.entries(COMPRESSOR_LEVELS[next])) mixer.set(id as ControlId, value);
	}
</script>

<section>
	<SectionHeader label="Compressor" />
	<p class="hint">Evens out quiet and loud singers. Heavier keeps a shy singer up with a loud one.</p>
	<div class="row">
		<div class="levels">
			<Segmented
				label="Compressor strength"
				value={level ?? 'custom'}
				onchange={choose}
				options={[
					{ value: 'off', label: 'Off' },
					{ value: 'light', label: 'Light' },
					{ value: 'medium', label: 'Medium' },
					{ value: 'heavy', label: 'Heavy' }
				]}
			/>
			{#if level === null}<p class="hint">Fine-tuned</p>{/if}
		</div>
		<div class="meter-slot">
			<Meter db={squash} label="Compressor gain reduction (estimate)" isReduction />
			<span>Squash</span>
		</div>
	</div>
	<details class="fine-tune">
		<summary>Fine-tune<span class="chevron"><Icon name="chev-down" size={14} /></span></summary>
		<div class="knobs">
			{#each FINE_TUNE_IDS as id (id)}<MixerControl {mixer} {id} />{/each}
		</div>
	</details>
</section>

<style>
	.hint {
		margin: 0 0 var(--sp-3);
		font-size: var(--fs-xs);
		color: var(--ink-low);
	}
	.row {
		display: flex;
		gap: var(--sp-4);
		align-items: flex-start;
	}
	.levels {
		flex: 1;
	}
	.levels .hint {
		margin: var(--sp-2) 0 0;
	}
	.meter-slot {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--sp-1);
		font-size: var(--fs-xs);
		color: var(--ink-low);
	}
	.meter-slot :global([role='meter']) {
		height: 96px;
	}
	.fine-tune summary {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-height: var(--tap);
		list-style: none;
		cursor: pointer;
		border-top: 1px solid var(--line-soft);
		margin-top: var(--sp-3);
		font-size: var(--fs-sm);
		font-weight: 700;
		color: var(--ink-mid);
	}
	.fine-tune summary::-webkit-details-marker {
		display: none;
	}
	.fine-tune[open] summary {
		margin-bottom: var(--sp-3);
	}
	.chevron {
		display: grid;
		transition: transform var(--t-base) var(--ease);
	}
	.fine-tune[open] .chevron {
		transform: rotate(180deg);
	}
	.knobs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-3) var(--sp-2);
	}
	@media (hover: hover) {
		.fine-tune summary:hover {
			color: var(--ink-hi);
		}
	}
</style>
