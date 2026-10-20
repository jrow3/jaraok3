<script lang="ts">
	// Shown after the first real snapshot whenever the socket drops, so a frozen
	// lineup never looks live. Hidden on first load (nothing to be stale yet).
	let { connected, received }: { connected: boolean; received: boolean } = $props();
</script>

{#if received && !connected}
	<div class="strip" role="status" aria-live="polite">
		<span class="dot"></span>Reconnecting… the lineup may be out of date
	</div>
{/if}

<style>
	.strip {
		position: fixed;
		top: env(safe-area-inset-top, 0px);
		left: 0;
		right: 0;
		z-index: 60;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: var(--sp-2);
		padding: var(--sp-2) var(--sp-4);
		background: var(--warn);
		color: var(--warn-ink);
		font-size: var(--fs-md);
		font-weight: 700;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
		animation: pulse 1s ease-in-out infinite alternate;
	}
	@keyframes pulse {
		from { opacity: 0.3; }
	}
	@media (prefers-reduced-motion: reduce) {
		.dot { animation: none; }
	}
</style>
