<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import { isUnsaved } from './presets';
	import type { MixerClient } from './mixerClient.svelte';

	let { mixer }: { mixer: MixerClient } = $props();

	const mixerState = $derived(mixer.state);
	const active = $derived(mixerState?.presets.find((preset) => preset.id === mixerState.activePresetId) ?? null);
	const hasChanges = $derived(!!mixerState && isUnsaved(mixerState));

	// Deleting a tuned preset can't be undone, so it takes a second tap, like turning the system off.
	const CONFIRM_MS = 4000;
	let isDeleteArmed = $state(false);
	let disarm: ReturnType<typeof setTimeout> | undefined;

	function deleteActive() {
		if (!active) return;
		clearTimeout(disarm);
		if (!isDeleteArmed) {
			isDeleteArmed = true;
			disarm = setTimeout(() => (isDeleteArmed = false), CONFIRM_MS);
			return;
		}
		isDeleteArmed = false;
		void mixer.remove(active.id);
	}

	let draftName = $state('');
	let mode = $state<'idle' | 'save-as' | 'rename'>('idle');

	function startNaming(next: 'save-as' | 'rename') {
		mode = next;
		draftName = next === 'rename' ? (active?.name ?? '') : '';
	}

	function submit(event: SubmitEvent) {
		event.preventDefault();
		const name = draftName.trim();
		if (!name) return;
		if (mode === 'rename' && active) void mixer.rename(active.id, name);
		else void mixer.saveAs(name);
		mode = 'idle';
	}
</script>

{#if mixerState}
	<div class="presets" role="group" aria-label="Presets">
		{#each mixerState.presets as preset (preset.id)}
			<button
				type="button"
				class="preset"
				aria-pressed={preset.id === mixerState.activePresetId}
				onclick={() => mixer.load(preset.id)}
			>
				{preset.name}{#if preset.id === mixerState.activePresetId && hasChanges}<span class="dot" aria-label="(changed)"></span>{/if}
			</button>
		{/each}
	</div>

	{#if mode === 'idle'}
		<div class="actions">
			{#if active && hasChanges}
				<Button size="sm" onclick={() => mixer.save(active.id)}>Save to {active.name}</Button>
			{/if}
			<Button size="sm" variant="ghost" onclick={() => startNaming('save-as')}>Save as new</Button>
			{#if active}
				<Button size="sm" variant="ghost" onclick={() => startNaming('rename')}>Rename</Button>
				<Button size="sm" variant={isDeleteArmed ? 'danger' : 'ghost'} onclick={deleteActive}>
					{isDeleteArmed ? `Tap again to delete ${active.name}` : 'Delete'}
				</Button>
			{/if}
		</div>
		{#if hasChanges}
			<p class="hint">
				Every change plays and stays, even after a restart.
				{active ? `Save to ${active.name} to keep it in the preset too.` : 'Save as new to keep it as a preset.'}
			</p>
		{/if}
	{:else}
		<form class="name-row" onsubmit={submit}>
			<!-- svelte-ignore a11y_autofocus -->
			<input class="input" bind:value={draftName} maxlength="40" placeholder="Preset name" aria-label="Preset name" autofocus />
			<Button size="sm" type="submit">{mode === 'rename' ? 'Rename' : 'Save'}</Button>
			<Button size="sm" variant="ghost" onclick={() => (mode = 'idle')}>Cancel</Button>
		</form>
	{/if}
{/if}

<style>
	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: var(--sp-2);
	}
	.preset {
		display: inline-flex;
		align-items: center;
		gap: var(--sp-1);
		min-height: var(--tap-sm);
		padding: 0 var(--sp-3);
		border-radius: var(--r-pill);
		border: 1px solid var(--line);
		background: var(--s1);
		color: var(--ink-hi);
		font-size: var(--fs-sm);
		font-weight: 600;
	}
	.preset[aria-pressed='true'] {
		background: var(--accent);
		border-color: var(--accent);
		color: var(--accent-ink);
	}
	.dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: currentColor;
	}
	.actions,
	.name-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--sp-2);
		margin-top: var(--sp-3);
	}
	.name-row .input {
		flex: 1 1 160px;
	}
	.hint {
		margin: var(--sp-2) 0 0;
		font-size: var(--fs-xs);
		color: var(--ink-low);
	}
</style>
