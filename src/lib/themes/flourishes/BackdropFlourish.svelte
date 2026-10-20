<script lang="ts">
	import Lamp from './onair/Lamp.svelte';
	import Record from './disco/Record.svelte';
</script>

<span class="flourish" data-flourish="backdrop" aria-hidden="true">
	<Lamp spot="backdrop" isLit={false} />
	<Record spot="backdrop" />
</span>

<style>
	/* Under the screen's own content: a piece keeps to the corners, and if one ever reaches
	   text, the text still paints over it. */
	.flourish {
		position: absolute;
		inset: 0;
		z-index: -1;
		overflow: hidden;
		pointer-events: none;
	}
</style>
