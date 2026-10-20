<script lang="ts">
	import type { PartySnapshot } from '$lib/types';
	import type { JoinLink } from './joinLink';
	import { sungLabel, downloadingLabel } from './idleText';
	import Wordmark from '$lib/components/ui/Wordmark.svelte';
	import JoinQr from './JoinQr.svelte';
	import BackdropFlourish from '$lib/themes/flourishes/BackdropFlourish.svelte';

	let { snapshot, join }: { snapshot: PartySnapshot; join: JoinLink } = $props();

	let downloading = $derived(downloadingLabel(snapshot.queue));
</script>

<div class="tv-idle">
	<BackdropFlourish />
	<div class="beam is-left"></div>
	<div class="beam is-right"></div>
	<Wordmark size="tv" />
	<JoinQr {join} size="lg" hasAddress />
	{#if downloading}
		<p class="downloading"><span class="spin"></span>{downloading}</p>
	{/if}
	{#if snapshot.sungCount > 0}
		<p class="ticker"><b>Tonight</b> · {sungLabel(snapshot.sungCount)}</p>
	{/if}
</div>

<style>
	.tv-idle {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		/* Room under the wordmark for the flourishes that hang from it. */
		gap: var(--tv-gap-lg);
		width: 100vw;
		height: 100vh;
		box-sizing: border-box;
		padding: var(--tv-safe-y) var(--tv-safe-x);
		overflow: hidden;
		isolation: isolate;
		background: var(--tv-page-bg);
	}
	.beam {
		position: absolute;
		top: -12vh;
		width: 24vw;
		height: 70vh;
		opacity: 0.14;
		background: var(--tv-beam);
		clip-path: polygon(46% 0, 54% 0, 92% 100%, 8% 100%);
	}
	.is-left {
		left: 7vw;
		transform: rotate(16deg);
	}
	.is-right {
		right: 7vw;
		transform: rotate(-16deg);
	}
	.downloading {
		display: flex;
		align-items: center;
		gap: var(--tv-gap);
		margin: 0;
		font-size: var(--tv-fs-md);
		color: var(--warn);
	}
	.downloading .spin {
		width: 0.8em;
		height: 0.8em;
		border-width: 3px;
	}
	.ticker {
		position: absolute;
		bottom: var(--tv-safe-y);
		margin: 0;
		font-size: var(--tv-fs-sm);
		letter-spacing: 0.08em;
		color: var(--ink-mid);
	}
	.ticker b {
		color: var(--ink-hi);
		font-weight: 600;
	}
</style>
