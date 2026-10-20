<script lang="ts">
	import Tambourine from './tokyo/Tambourine.svelte';
	import Lamp from './onair/Lamp.svelte';
	import Meters from './onair/Meters.svelte';
	import Record from './disco/Record.svelte';

	let { isPlaying, isInRail, hasBands }: { isPlaying: boolean; isInRail: boolean; hasBands: boolean } = $props();
</script>

<span class="flourish" data-flourish="stage" aria-hidden="true">
	{#if isInRail}
		<Tambourine spot="rail" {isPlaying} />
		<Lamp spot="rail" isLit={isPlaying} />
		<Meters spot="rail" {isPlaying} />
		<Record spot="rail" {isPlaying} />
	{:else}
		<Lamp spot={hasBands ? 'stage' : 'corner'} isLit={isPlaying} />
		{#if hasBands}<Meters spot="stage" {isPlaying} />{/if}
	{/if}
</span>

<style>
	.flourish {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	/* The rail gives its props only the room its cards leave; squeezed smaller than this they
	   read as stray dots, not props. */
	@container stage-rail (max-height: 8vh) {
		.flourish {
			display: none;
		}
	}
</style>
