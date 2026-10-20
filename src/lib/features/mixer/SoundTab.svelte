<script lang="ts">
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import type { Party } from '$lib/party.svelte';
	import CompressorSection from './CompressorSection.svelte';
	import FaderSection from './FaderSection.svelte';
	import KnobSection from './KnobSection.svelte';
	import { createMixerClient } from './mixerClient.svelte';
	import PresetBar from './PresetBar.svelte';
	import SingerOnStage from './SingerOnStage.svelte';
	import { estimateSquashDb } from './squash';

	let { party }: { party: Party } = $props();

	// The host page's party connection lives as long as the page; it is never swapped.
	const mixer = createMixerClient(untrack(() => party));
	onMount(() => {
		mixer.open();
		return mixer.close;
	});

	const levels = $derived(mixer.levels);
	// deploy/audio/audio.env sets how many mics the chain takes; MIC_INPUTS in .env matches it.
	const isOneInput = $derived(page.data.features.micInputs === 1);
	const squash = $derived(mixer.state ? estimateSquashDb(mixer.state.live, levels.inL, levels.inR) : 0);
	const isMuted = $derived(mixer.state?.live.isVoiceMuted === 1);
</script>

<div class="tab">
	{#if mixer.isAgentConnected === false}
		<p class="warning" role="status">
			The mixer agent isn’t running on the server, so changes are saved but not heard yet, and the meters are still.
			See deploy/audio/README.md.
		</p>
	{/if}

	<section>
		<SectionHeader label="Presets" />
		<PresetBar {mixer} />
	</section>

	{#if mixer.state}
		<FaderSection
			{mixer}
			label="Mics"
			hint={isOneInput
				? 'Set the input so the loudest singing peaks in the yellow. Voice sets the mics in the room.'
				: 'Set each input so the loudest singing peaks in the yellow. Voice sets both mics in the room.'}
			strips={isOneInput
				? [{ id: 'trimLeft', label: 'Input', meterDb: levels.inL, meterLabel: 'Input level' }, { id: 'voiceLevel' }]
				: [
						{ id: 'trimLeft', meterDb: levels.inL, meterLabel: 'Input L level' },
						{ id: 'trimRight', meterDb: levels.inR, meterLabel: 'Input R level' },
						{ id: 'voiceLevel' }
					]}
		>
			{#snippet extra()}
				<div class="setting-row">
					<span class="setting-label">Mute mics</span>
					<Switch checked={isMuted} onchange={(isOn) => mixer.set('isVoiceMuted', isOn ? 1 : 0)} label="Mute mics" />
				</div>
			{/snippet}
		</FaderSection>

		<KnobSection
			{mixer}
			label="Tone"
			hint="Low cut removes stage rumble and mic handling thumps. Presence helps words cut through the music."
			ids={['lowCutHz', 'bassGain', 'midFreq', 'midGain', 'presenceGain', 'airGain']}
		/>

		<KnobSection
			{mixer}
			label="Gate"
			hint="Silences the mics between lines. Raise the threshold if you hear room noise when nobody sings."
			ids={['gateThreshold', 'gateRange', 'gateAttack', 'gateHold', 'gateDecay']}
		/>

		<CompressorSection {mixer} live={mixer.state.live} {squash} />

		<SingerOnStage {mixer} />

		<KnobSection {mixer} label="Echo" hint="One repeat of the voice. All the way down is off." ids={['echoTime', 'echoLevel']} />

		<KnobSection
			{mixer}
			label="Reverb"
			hint="Room is the size of the space, Decay how long it rings. Early and Tail set how much of it you hear."
			ids={['reverbSize', 'reverbTime', 'reverbDamping', 'reverbEarly', 'reverbTail']}
		/>

		<FaderSection
			{mixer}
			label="Output"
			hint="Music is the song’s volume on the TV. Master is the whole room; it never goes above unity, so it can’t clip."
			strips={[{ id: 'musicLevel' }, { id: 'masterLevel', meterDb: levels.room, meterLabel: 'Room level' }]}
		/>
	{/if}
</div>

<style>
	.tab {
		display: flex;
		flex-direction: column;
		gap: var(--sp-6);
	}
	.warning {
		margin: 0;
		padding: var(--sp-3);
		border-radius: var(--r-lg);
		border: 1px solid var(--warn);
		color: var(--ink-hi);
		font-size: var(--fs-sm);
	}
	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--sp-3);
	}
	.setting-label {
		font-size: var(--fs-md);
		font-weight: 600;
		color: var(--ink-hi);
	}
</style>
