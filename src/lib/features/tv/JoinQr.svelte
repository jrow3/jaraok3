<script lang="ts">
	import type { JoinLink } from './joinLink';
	import GlassCard from './GlassCard.svelte';
	import QrFlourish from '$lib/themes/flourishes/QrFlourish.svelte';

	let {
		join,
		size,
		hasAddress = false
	}: { join: JoinLink; size: 'sm' | 'md' | 'lg'; hasAddress?: boolean } = $props();
</script>

{#snippet plate(label: string)}
	<!-- The SVG is drawn on the server from JOIN_URL by the qrcode package; no guest text reaches it. -->
	<span class={['plate', `is-${size}`]} role="img" aria-label={label}>{@html join.qrSvg}</span>
{/snippet}

<!-- Over a song the code stands alone, with no card or words to pull eyes off the lyrics. -->
{#if size === 'lg'}
	<GlassCard>
		<div class="join-qr">
			{@render plate('QR code: scan to sing')}
			<span class="label">Scan to sing</span>
			{#if hasAddress}<span class="address">{join.address}</span>{/if}
			<QrFlourish />
		</div>
	</GlassCard>
{:else}
	{@render plate('Scan to join')}
{/if}

<style>
	.join-qr {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: calc(var(--tv-gap) / 2);
	}
	.plate {
		display: block;
		aspect-ratio: 1;
		border-radius: var(--tv-radius-sm);
		background: var(--tv-qr-plate);
	}
	.plate :global(svg) {
		display: block;
		width: 100%;
		height: 100%;
	}
	.is-sm {
		width: var(--tv-qr-sm);
	}
	.is-md {
		width: var(--tv-qr-md);
	}
	.is-lg {
		width: var(--tv-qr-lg);
	}
	.label {
		font-size: var(--tv-fs-sm);
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.address {
		font-size: var(--tv-fs-md);
		font-weight: 700;
	}
</style>
