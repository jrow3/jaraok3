<script lang="ts">
	import { toastStore, runToastAction } from '$lib/toast.svelte';
	import Icon from './Icon.svelte';

	/** How far a bar pinned to the bottom of the screen reaches up, so the toasts sit above it. */
	let { clearance = 0 }: { clearance?: number } = $props();
</script>

<!-- Always rendered: screen readers only announce changes inside a live region that already exists. -->
<div class="toasts" role="status" aria-live="polite" style:--clearance="{clearance}px">
	{#each toastStore.list as t (t.id)}
		<div class="toast" class:err={t.kind === 'err'}>
			<span class="dot"><Icon name={t.kind === 'err' ? 'x' : 'check'} size={14} /></span>
			{t.text}
			{#if t.action}
				<button class="action" onclick={() => runToastAction(t.id)}>{t.action.label}</button>
			{/if}
		</div>
	{/each}
</div>

<style>
	.toasts {
		position: fixed;
		left: 50%;
		bottom: calc(22px + var(--clearance));
		transform: translateX(-50%);
		z-index: 50;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--sp-2);
		pointer-events: none;
		width: max-content;
		max-width: calc(100vw - 32px);
	}
	.toast {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		background: var(--surface-glass);
		border: var(--card-edge-strong);
		border-radius: var(--r-lg);
		padding: var(--sp-3) var(--sp-4);
		font-size: var(--fs-md);
		font-weight: 600;
		box-shadow: var(--shadow-stage);
		/* iOS Safari before 18 knows only the prefixed name. */
		-webkit-backdrop-filter: blur(8px);
		backdrop-filter: blur(8px);
		animation: toast-in var(--t-slow) var(--ease);
		max-width: 100%;
		box-sizing: border-box;
	}
	.toast.err {
		border-color: var(--bad-a40);
	}
	.dot {
		flex: none;
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: var(--accent);
		color: var(--accent-ink);
	}
	.err .dot {
		background: var(--bad);
		color: var(--on-tile);
	}
	.action {
		pointer-events: auto;
		flex: none;
		min-height: var(--tap);
		margin-left: var(--sp-1);
		padding: 0 var(--sp-3);
		border: none;
		border-radius: var(--r-md);
		background: var(--accent-a10);
		color: var(--accent);
		font-size: var(--fs-sm);
		font-weight: 700;
	}
	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateY(12px);
		}
	}
</style>
