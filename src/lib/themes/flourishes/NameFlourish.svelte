<script lang="ts">
	import Tambourine from './tokyo/Tambourine.svelte';
	import Record from './disco/Record.svelte';

	let { isPlaying }: { isPlaying: boolean } = $props();
</script>

<!-- No box of its own, so an empty spot adds no gap to the "Now singing" row. -->
<span class="flourish" data-flourish="name" aria-hidden="true">
	<Tambourine spot="name" {isPlaying} />
	<Record spot="name" {isPlaying} />
</span>

<style>
	.flourish {
		display: contents;
	}
</style>
