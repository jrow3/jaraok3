<script lang="ts">
	import type { JoinLink } from './joinLink';
	import JoinQr from './JoinQr.svelte';
	import BackdropFlourish from '$lib/themes/flourishes/BackdropFlourish.svelte';

	let {
		next,
		join
	}: { next: { singer: string; title: string; artist: string }; join: JoinLink } = $props();
</script>

<div class="hold-frame">
	<BackdropFlourish />
	<div class="who">
		<span class="label">Up next</span>
		<span class="singer headline">{next.singer}</span>
		<span class="song">{next.title} · {next.artist}</span>
	</div>
	<JoinQr {join} size="lg" hasAddress />
</div>

<style>
	.hold-frame {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		display: flex;
		align-items: center;
		gap: var(--tv-gap-lg);
		width: 100vw;
		height: 100vh;
		box-sizing: border-box;
		padding: var(--tv-safe-y) var(--tv-safe-x);
		background: var(--tv-page-bg);
	}
	.who {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: var(--tv-gap);
		min-width: 0;
	}
	.label {
		font-size: var(--tv-fs-sm);
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.singer {
		font-size: var(--tv-fs-2xl);
		letter-spacing: -0.025em;
		line-height: 1.05;
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.song {
		font-size: var(--tv-fs-md);
		color: var(--ink-mid);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
</style>
