<script lang="ts">
	import Fader from '$lib/components/ui/Fader.svelte';
	import Knob from '$lib/components/ui/Knob.svelte';
	import { CONTROLS, type ControlId } from './controls';
	import type { MixerClient } from './mixerClient.svelte';

	let {
		mixer,
		id,
		isFader = false,
		label
	}: { mixer: MixerClient; id: ControlId; isFader?: boolean; label?: string } = $props();

	const spec = $derived(CONTROLS[id]);
	const value = $derived(mixer.state?.live[id] ?? spec.default);
</script>

{#if isFader}
	<Fader {value} range={spec} defaultValue={spec.default} label={label ?? spec.label} unit={spec.unit} onchange={(next) => mixer.set(id, next)} />
{:else}
	<Knob {value} range={spec} defaultValue={spec.default} label={label ?? spec.label} unit={spec.unit} onchange={(next) => mixer.set(id, next)} />
{/if}
