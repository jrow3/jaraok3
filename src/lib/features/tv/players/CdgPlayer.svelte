<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type CDGraphics from 'cdgraphics';
	import { startMedia } from './autoplay';

	let {
		songId,
		playing,
		volume,
		onended,
		onfailed,
		onblocked,
		ontime
	}: {
		songId: number;
		playing: boolean;
		/** The Sound tab's Music fader, 0..100. */
		volume: number;
		onended?: () => void;
		onfailed?: () => void;
		onblocked?: () => void;
		ontime?: (current: number, duration: number) => void;
	} = $props();

	let canvas: HTMLCanvasElement;
	let audio: HTMLAudioElement;
	let graphics: CDGraphics | null = null;
	let context: CanvasRenderingContext2D | null = null;
	let frameId = 0;
	let isAudioOnly = $state(false);

	const loading = new AbortController();

	function draw() {
		// A lone mp3 never gets graphics; no need to wake 60 times a second for it.
		if (isAudioOnly) return;
		frameId = requestAnimationFrame(draw);
		if (!graphics || !context) return;
		const frame = graphics.render(audio.currentTime);
		if (frame.isChanged) context.putImageData(frame.imageData, 0, 0);
	}
	function startDrawing() {
		cancelAnimationFrame(frameId);
		frameId = requestAnimationFrame(draw);
	}
	const stopDrawing = () => cancelAnimationFrame(frameId);

	onMount(async () => {
		context = canvas.getContext('2d');
		// Uncaught, a lyrics load that breaks leaves the audio playing over a black canvas (B12).
		try {
			const response = await fetch(`/media/${songId}.cdg`, { signal: loading.signal });
			// A lone mp3 has no lyrics graphics; the media server answers 404 and it plays over the audio-only card.
			if (response.status === 404) {
				isAudioOnly = true;
				return;
			}
			if (!response.ok) {
				onfailed?.();
				return;
			}
			const [{ default: Graphics }, buffer] = await Promise.all([import('cdgraphics'), response.arrayBuffer()]);
			graphics = new Graphics(buffer);
		} catch {
			if (!loading.signal.aborted) onfailed?.();
		}
	});
	onDestroy(() => {
		loading.abort();
		stopDrawing();
	});

	$effect(() => {
		audio.volume = volume / 100;
	});

	// Follows the host's play/pause; its first run starts the song.
	$effect(() => {
		if (playing && audio.paused) startMedia(audio, () => onblocked?.());
		else if (!playing && !audio.paused) audio.pause();
	});
</script>

<div class="player">
	<canvas bind:this={canvas} width="300" height="216"></canvas>
	{#if isAudioOnly}
		<div class="card">
			<span class="note">♪</span>
			<span class="caption">Audio only · no lyrics for this track</span>
		</div>
	{/if}
	<audio
		bind:this={audio}
		src={`/media/${songId}.mp3`}
		preload="auto"
		onplay={startDrawing}
		onpause={stopDrawing}
		onended={() => {
			stopDrawing();
			onended?.();
		}}
		onerror={() => onfailed?.()}
		ontimeupdate={() => ontime?.(audio.currentTime, audio.duration || 0)}
	></audio>
</div>

<style>
	.player {
		position: relative;
		width: 100%;
		height: 100%;
		background: var(--tv-stage-bg);
		overflow: hidden;
	}
	/* The lyrics keep their true 300:216 shape, centered at full height; the black player
	   behind them fills the bands at the sides instead of stretching them to 16:9 (B11). */
	canvas {
		height: 100%;
		margin: 0 auto;
		image-rendering: pixelated;
		display: block;
	}
	.card {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--tv-gap);
		padding: var(--tv-gap);
		text-align: center;
		background: var(--tv-page-bg);
		color: var(--ink-hi);
	}
	.note {
		font-size: var(--tv-fs-xl);
		color: var(--accent);
		line-height: 1;
	}
	.caption {
		font-size: var(--tv-fs-sm);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--ink-mid);
	}
</style>
