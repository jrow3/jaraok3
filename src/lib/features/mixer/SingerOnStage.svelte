<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import type { MixerClient } from './mixerClient.svelte';

	let { mixer }: { mixer: MixerClient } = $props();

	const stage = $derived(mixer.stage);
</script>

{#if stage}
	<div class="banner" role="status">
		{#if stage.isReset}
			<p>House sound for the rest of {stage.singer}’s song</p>
		{:else}
			<p>{stage.singer}’s echo and reverb are on</p>
			<Button size="sm" onclick={() => mixer.resetSinger()}>Reset to house sound</Button>
		{/if}
	</div>
{/if}

<style>
	.banner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--sp-3);
		padding: var(--sp-3);
		border-radius: var(--r-lg);
		border: 1px solid var(--line-soft);
	}
	p {
		margin: 0;
		font-size: var(--fs-sm);
		color: var(--ink-hi);
	}
</style>
