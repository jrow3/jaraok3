<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';
	import GlassCard from './GlassCard.svelte';
</script>

<GlassCard isRow isCompact>
	<span class="paused"><Icon name="pause" size={32} />Paused</span>
</GlassCard>

<style>
	.paused {
		display: flex;
		align-items: center;
		gap: var(--tv-gap);
		font-size: var(--tv-fs-md);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
</style>
