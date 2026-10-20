<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';

	let { onstart }: { onstart: () => void } = $props();
</script>

<button class="tap-to-start" onclick={onstart}>
	<span class="pill"><Icon name="play" size={40} />Tap to start sound</span>
</button>

<style>
	.tap-to-start {
		position: absolute;
		inset: 0;
		z-index: 4;
		display: grid;
		place-items: center;
		border: none;
		background: var(--tv-dim);
		color: var(--accent-ink);
	}
	.pill {
		display: flex;
		align-items: center;
		gap: var(--tv-gap);
		padding: var(--tv-gap) calc(var(--tv-gap) * 2);
		border-radius: var(--r-pill);
		background: var(--accent);
		font-size: var(--tv-fs-lg);
		font-weight: 700;
	}
</style>
