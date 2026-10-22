<script lang="ts">
	import type { Party } from '$lib/party.svelte';
	import { isPlayable } from '$lib/playable';

	let { party, height = $bindable(0) }: { party: Party; height?: number } = $props();

	let current = $derived(party.state.current);
	// The song the server will really start: a download still running is passed over.
	let upNext = $derived(party.state.queue.find(isPlayable));
	let myPosition = $derived(party.state.queue.findIndex((item) => party.isMine(item)) + 1);
</script>

{#if current}
	<div class="now-bar" bind:offsetHeight={height}>
		{#if party.state.isPlaying}<span class="eq"><i></i><i></i><i></i></span>{/if}
		<span class="meta">
			<span class="line-1">{current.singer} · {current.title}</span>
			<span class="line-2">
				{#if upNext}Up next: {upNext.singer} · {upNext.title}{:else}No one’s up yet. Be first!{/if}
			</span>
		</span>
		{#if myPosition > 0}<span class="position">#{myPosition} in line</span>{/if}
	</div>
{/if}

<style>
	.now-bar {
		position: fixed;
		left: 50%;
		transform: translateX(-50%);
		bottom: 16px;
		z-index: 20;
		width: calc(100% - 32px);
		max-width: 452px;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		gap: var(--sp-3);
		background: var(--surface-now), var(--surface-glass);
		border: var(--card-edge-strong);
		border-radius: var(--r-lg);
		padding: var(--sp-3);
		/* iOS Safari before 18 knows only the prefixed name. */
		-webkit-backdrop-filter: blur(8px);
		backdrop-filter: blur(8px);
		animation: bar-in var(--t-slow) var(--ease);
	}
	@keyframes bar-in {
		from {
			opacity: 0;
			transform: translateX(-50%) translateY(12px);
		}
	}
	.meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.line-1,
	.line-2 {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.line-1 {
		font-size: var(--fs-sm);
		font-weight: 700;
	}
	.line-2 {
		font-size: var(--fs-xs);
		color: var(--ink-mid);
	}
	.position {
		flex: none;
		font-size: var(--fs-xs);
		font-weight: 700;
		color: var(--accent);
		background: var(--accent-a10);
		border-radius: var(--r-pill);
		padding: var(--sp-1) var(--sp-2);
	}
</style>
