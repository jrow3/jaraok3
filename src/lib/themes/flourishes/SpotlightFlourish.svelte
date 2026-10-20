<script lang="ts">
	import Tambourine from './tokyo/Tambourine.svelte';
	import Meters from './onair/Meters.svelte';
	import Record from './disco/Record.svelte';
	import Screws from './chrome/Screws.svelte';

	let { isPlaying }: { isPlaying: boolean } = $props();
</script>

<!-- No box of its own, so an empty spot adds no gap to the card's row. -->
<span class="flourish" data-flourish="spotlight" aria-hidden="true">
	<Tambourine spot="spotlight" {isPlaying} />
	<Meters spot="spotlight" {isPlaying} />
	<Record spot="spotlight" {isPlaying} />
	<Screws spot="spotlight" />
</span>

<style>
	.flourish {
		display: contents;
	}
</style>
