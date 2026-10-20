<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import ReorderList from '$lib/components/ui/ReorderList.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import { moveBy } from '$lib/components/ui/reorder';
	import type { HostSettings } from '../hostSettings.svelte';
	import SaveStatus from '../SaveStatus.svelte';
	import { addUniqueName } from '../settingsModel';
	import PriorityRow from './PriorityRow.svelte';

	let { settings }: { settings: HostSettings } = $props();

	let channels = $derived(settings.data.ytChannelPriority);
	let newChannel = $state('');

	function save(next: string[] | null) {
		if (next) settings.update({ ytChannelPriority: next });
	}

	function add() {
		save(addUniqueName(channels, newChannel));
		newChannel = '';
	}
</script>

<section>
	<SectionHeader label="YouTube channel priority">
		{#snippet aside()}<SaveStatus saveState={settings.saveStates.channels} onretry={() => settings.retry('channels')} />{/snippet}
	</SectionHeader>
	<p class="hint">Preferred karaoke channels float to the top of YouTube results.</p>
	{#if channels.length === 0}
		<EmptyState icon="tv" title="No preferred channels yet" />
	{:else}
		<ReorderList items={channels} key={(name) => name} label="YouTube channel priority" onreorder={save}>
			{#snippet row(name, index)}
				<PriorityRow
					position={index + 1}
					count={channels.length}
					onmove={(offset) => save(moveBy(channels, index, offset))}
					onremove={() => save(channels.filter((channel) => channel !== name))}
					removeLabel="Remove {name}"
				>
					<span class="channel-name">{name}</span>
				</PriorityRow>
			{/snippet}
		</ReorderList>
	{/if}
	<div class="add-row">
		<input
			class="input"
			bind:value={newChannel}
			placeholder="Add a channel (e.g. Sing King)"
			onkeydown={(event) => event.key === 'Enter' && add()}
		/>
		<Button onclick={add}>Add</Button>
	</div>
</section>

<style>
	.hint {
		margin: 0 0 var(--sp-3);
		font-size: var(--fs-sm);
		color: var(--ink-mid);
	}
	.channel-name {
		display: block;
		font-size: var(--fs-sm);
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.add-row {
		display: flex;
		gap: var(--sp-2);
		margin-top: var(--sp-3);
	}
</style>
