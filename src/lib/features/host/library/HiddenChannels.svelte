<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Chip from '$lib/components/ui/Chip.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import type { HostSettings } from '../hostSettings.svelte';
	import SaveStatus from '../SaveStatus.svelte';
	import { addUniqueName } from '../settingsModel';

	let { settings }: { settings: HostSettings } = $props();

	let hidden = $derived(settings.data.ytChannelBlocklist);
	let newHidden = $state('');

	function save(next: string[] | null) {
		if (next) settings.update({ ytChannelBlocklist: next });
	}

	function hide() {
		save(addUniqueName(hidden, newHidden));
		newHidden = '';
	}
</script>

<section>
	<SectionHeader label="Hidden channels">
		{#snippet aside()}<SaveStatus saveState={settings.saveStates.hidden} onretry={() => settings.retry('hidden')} />{/snippet}
	</SectionHeader>
	<p class="hint">
		Never shown in YouTube results. Videos that block embedding (like KaraFun's) don't need
		hiding; they're downloaded on the fly instead.
	</p>
	{#if hidden.length === 0}
		<EmptyState icon="tv" title="No hidden channels" />
	{:else}
		<ul class="chips">
			{#each hidden as name (name)}
				<li>
					<Chip
						label={name}
						tone="bad"
						onremove={() => save(hidden.filter((channel) => channel !== name))}
						removeLabel="Unhide {name}"
					/>
				</li>
			{/each}
		</ul>
	{/if}
	<div class="add-row">
		<input
			class="input"
			bind:value={newHidden}
			placeholder="Hide a channel"
			onkeydown={(event) => event.key === 'Enter' && hide()}
		/>
		<Button onclick={hide}>Hide</Button>
	</div>
</section>

<style>
	.hint {
		margin: 0 0 var(--sp-3);
		font-size: var(--fs-sm);
		color: var(--ink-mid);
	}
	.chips {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-4);
	}
	.add-row {
		display: flex;
		gap: var(--sp-2);
		margin-top: var(--sp-3);
	}
</style>
