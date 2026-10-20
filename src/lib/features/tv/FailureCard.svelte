<script lang="ts">
	import { failureMessage } from './playbackHealth';
	import GlassCard from './GlassCard.svelte';

	let { title, isEmbedBlocked }: { title: string; isEmbedBlocked: boolean } = $props();
</script>

<div class="failure" role="status">
	<GlassCard>
		<span class="message">{failureMessage(title, isEmbedBlocked)}</span>
	</GlassCard>
</div>

<style>
	.failure {
		position: absolute;
		inset: 0;
		z-index: 3;
		display: grid;
		place-items: center;
		padding: var(--tv-safe-y) var(--tv-safe-x);
		background: var(--tv-dim);
	}
	.message {
		max-width: 70vw;
		font-size: var(--tv-fs-lg);
		font-weight: 700;
		text-align: center;
		overflow-wrap: anywhere;
	}
</style>
