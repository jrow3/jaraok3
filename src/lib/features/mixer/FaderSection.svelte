<script lang="ts" module>
	import type { ControlId } from './controls';

	// A fader with a meter beside it shows the level that fader is feeding.
	export interface Strip {
		id: ControlId;
		meterDb?: number;
		meterLabel?: string;
		/** Instead of the control's own name. */
		label?: string;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import Meter from '$lib/components/ui/Meter.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import type { MixerClient } from './mixerClient.svelte';
	import MixerControl from './MixerControl.svelte';

	let {
		mixer,
		label,
		hint,
		strips,
		extra
	}: { mixer: MixerClient; label: string; hint: string; strips: Strip[]; extra?: Snippet } = $props();
</script>

<section>
	<SectionHeader {label} />
	<p class="hint">{hint}</p>
	<div class="strips">
		{#each strips as strip (strip.id)}
			<div class="strip">
				<MixerControl {mixer} id={strip.id} label={strip.label} isFader />
				{#if strip.meterDb !== undefined}
					<Meter db={strip.meterDb} label={strip.meterLabel ?? ''} />
				{/if}
			</div>
		{/each}
	</div>
	{#if extra}<div class="extra">{@render extra()}</div>{/if}
</section>

<style>
	.hint {
		margin: 0 0 var(--sp-3);
		font-size: var(--fs-xs);
		color: var(--ink-low);
	}
	.strips {
		display: flex;
		gap: var(--sp-5);
		overflow-x: auto;
		padding-bottom: var(--sp-1);
	}
	.strip {
		display: flex;
		gap: var(--sp-2);
		align-items: flex-start;
	}
	.extra {
		margin-top: var(--sp-3);
	}
</style>
