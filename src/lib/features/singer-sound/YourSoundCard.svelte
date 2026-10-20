<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Knob from '$lib/components/ui/Knob.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import Segmented from '$lib/components/ui/Segmented.svelte';
	import type { Party } from '$lib/party.svelte';
	import { CONTROLS } from '../mixer/controls';
	import { SINGER_HELP, STARTING_POINTS, currentStartingPoint, type SingerControlId, type StartingPointId } from '../mixer/singerSound';
	import { createSingerSoundClient } from './singerSoundClient.svelte';
	import { soundStatus, type SoundStatus } from './soundStatus';

	let { party }: { party: Party } = $props();

	const GROUPS: { label: string; ids: SingerControlId[] }[] = [
		{ label: 'Echo', ids: ['echoTime', 'echoLevel'] },
		{ label: 'Reverb', ids: ['reverbSize', 'reverbTime', 'reverbDamping', 'reverbEarly', 'reverbTail'] }
	];
	const STATUS_TEXT: Record<SoundStatus, string> = {
		live: 'You’re on, changes play live',
		saved: 'Used for your songs',
		reset: 'The host reset your sound for this song'
	};

	// The guest page's party connection lives as long as the page; it is never swapped.
	const client = createSingerSoundClient(untrack(() => party));
	onMount(() => {
		client.open();
		return client.close;
	});

	const status = $derived(soundStatus(party.state, party.ownerTag, client.stage));
	const isLocked = $derived(status === 'reset');

	function choose(next: StartingPointId | 'custom') {
		if (next !== 'custom') client.choose(next);
	}
</script>

<details class="your-sound fine-tune">
	<summary>Your sound<span class="chevron"><Icon name="chev-down" size={14} /></span></summary>
	<p class="status" role="status">{STATUS_TEXT[status]}</p>
	{#if client.house && client.values}
		{@const house = client.house}
		{@const values = client.values}
		<div class={['controls', isLocked && 'locked']} inert={isLocked}>
			<Segmented
				label="Starting point"
				value={currentStartingPoint(values) ?? 'custom'}
				onchange={choose}
				options={STARTING_POINTS.map((point) => ({ value: point.id, label: point.name }))}
			/>
			{#each GROUPS as group (group.label)}
				<section>
					<SectionHeader label={group.label} />
					<ul>
						{#each group.ids as id (id)}
							<li>
								<Knob
									value={values[id]}
									range={CONTROLS[id]}
									defaultValue={house[id]}
									label={CONTROLS[id].label}
									unit={CONTROLS[id].unit}
									onchange={(next) => client.set(id, next)}
								/>
								<p class="help">{SINGER_HELP[id]}</p>
							</li>
						{/each}
					</ul>
				</section>
			{/each}
		</div>
		<div class="reset">
			<Button variant="ghost" size="sm" onclick={client.reset}>Reset</Button>
		</div>
	{/if}
</details>

<style>
	.your-sound {
		margin-bottom: var(--sp-4);
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
	.status {
		margin: 0 0 var(--sp-3);
		font-size: var(--fs-sm);
		color: var(--ink-hi);
	}
	.controls {
		display: flex;
		flex-direction: column;
		gap: var(--sp-4);
		transition: opacity var(--t-base) var(--ease);
	}
	.locked {
		opacity: 0.4;
	}
	ul {
		display: flex;
		flex-direction: column;
		gap: var(--sp-3);
		margin: 0;
		padding: 0;
		list-style: none;
	}
	li {
		display: flex;
		align-items: center;
		gap: var(--sp-3);
	}
	.help {
		margin: 0;
		font-size: var(--fs-xs);
		color: var(--ink-low);
	}
	.reset {
		display: flex;
		justify-content: flex-end;
		margin-top: var(--sp-3);
	}
	@media (hover: hover) {
		.fine-tune summary:hover {
			color: var(--ink-hi);
		}
	}
</style>
