<script lang="ts">
	import Tambourine from './tokyo/Tambourine.svelte';
	import Screws from './chrome/Screws.svelte';
</script>

<span class="flourish" data-flourish="qr" aria-hidden="true">
	<Tambourine spot="qr" />
	<Screws spot="qr" />
</span>

<style>
	/* The join card's own edges: the code sits inside the glass card's padding. */
	.flourish {
		position: absolute;
		inset: calc(-1 * var(--tv-gap)) calc(-1.25 * var(--tv-gap));
		pointer-events: none;
	}
</style>
