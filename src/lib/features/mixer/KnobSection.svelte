<script lang="ts">
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import type { ControlId } from './controls';
	import type { MixerClient } from './mixerClient.svelte';
	import MixerControl from './MixerControl.svelte';

	let {
		mixer,
		label,
		hint,
		ids
	}: { mixer: MixerClient; label: string; hint: string; ids: ControlId[] } = $props();
</script>

<section>
	<SectionHeader {label} />
	<p class="hint">{hint}</p>
	<div class="knobs">
		{#each ids as id (id)}<MixerControl {mixer} {id} />{/each}
	</div>
</section>

<style>
	.hint {
		margin: 0 0 var(--sp-3);
		font-size: var(--fs-xs);
		color: var(--ink-low);
	}
	.knobs {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-3) var(--sp-2);
	}
</style>
