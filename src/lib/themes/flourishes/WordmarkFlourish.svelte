<script lang="ts">
	import Sticker from './tokyo/Sticker.svelte';
	import Dial from './onair/Dial.svelte';
	import Stripes from './disco/Stripes.svelte';
	import Sheen from './chrome/Sheen.svelte';

	let { size }: { size: 'sm' | 'tv' } = $props();
</script>

<span class="flourish" data-flourish="wordmark" aria-hidden="true">
	<Sticker {size} />
	<Dial />
	<Stripes {size} />
	<Sheen />
</span>

<style>
	/* Spans the letters, so a piece can sit on, under or beside them in em. */
	.flourish {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
</style>
