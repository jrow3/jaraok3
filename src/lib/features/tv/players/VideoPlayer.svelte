<script lang="ts">
	import { onDestroy } from 'svelte';
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

	let video: HTMLVideoElement;

	onDestroy(() => {
		if (video) video.pause();
	});

	$effect(() => {
		video.volume = volume / 100;
	});

	// Follows the host's play/pause; its first run starts the song.
	$effect(() => {
		if (playing && video.paused) startMedia(video, () => onblocked?.());
		else if (!playing && !video.paused) video.pause();
	});
</script>

<div class="video-wrap">
	<!-- svelte-ignore a11y_media_has_caption -->
	<video
		bind:this={video}
		src={`/media/${songId}.mp4`}
		preload="auto"
		playsinline
		onended={() => onended?.()}
		onerror={() => onfailed?.()}
		ontimeupdate={() => ontime?.(video.currentTime, video.duration || 0)}
	></video>
</div>

<style>
	.video-wrap {
		width: 100%;
		height: 100%;
		background: var(--tv-stage-bg);
		overflow: hidden;
	}
	video {
		width: 100%;
		height: 100%;
		object-fit: contain;
		display: block;
	}
</style>
