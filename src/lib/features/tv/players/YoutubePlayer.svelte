<script lang="ts">
	import { onMount, onDestroy } from 'svelte';

	let {
		videoId,
		playing,
		volume,
		onended,
		onfailed,
		ontime
	}: {
		videoId: string;
		playing: boolean;
		/** The Sound tab's Music fader, 0..100. */
		volume: number;
		onended?: () => void;
		onfailed?: (errorCode?: number) => void;
		ontime?: (current: number, duration: number) => void;
	} = $props();

	const YT_ENDED = 0;
	// The iframe API comes from youtube.com; past this, the network has failed it.
	const API_TIMEOUT_MS = 15_000;

	let host: HTMLDivElement;
	let player: YtPlayer | null = null;
	let isReady = $state(false);
	let timeTimer: ReturnType<typeof setInterval> | null = null;
	let isDestroyed = false;

	function loadApi(): Promise<NonNullable<Window['YT']>> {
		if (window.YT?.Player) return Promise.resolve(window.YT);
		return new Promise((resolve, reject) => {
			const previous = window.onYouTubeIframeAPIReady;
			const timeout = setTimeout(() => {
				// Gone, so the next YouTube song tries the script again.
				document.getElementById('yt-iframe-api')?.remove();
				reject(new Error('YouTube iframe API did not load'));
			}, API_TIMEOUT_MS);
			window.onYouTubeIframeAPIReady = () => {
				clearTimeout(timeout);
				previous?.();
				if (window.YT) resolve(window.YT);
			};
			if (!document.getElementById('yt-iframe-api')) {
				const script = document.createElement('script');
				script.id = 'yt-iframe-api';
				script.src = 'https://www.youtube.com/iframe_api';
				document.head.appendChild(script);
			}
		});
	}

	onMount(async () => {
		let YT: NonNullable<Window['YT']>;
		try {
			YT = await loadApi();
		} catch {
			if (!isDestroyed) onfailed?.();
			return;
		}
		// Skipped while the API loaded: a player made now would outlive the stage.
		if (isDestroyed) return;
		player = new YT.Player(host, {
			videoId,
			playerVars: { autoplay: 0, controls: 0, rel: 0, modestbranding: 1, playsinline: 1 },
			events: {
				onReady: () => {
					isReady = true;
					timeTimer = setInterval(() => {
						if (player) ontime?.(player.getCurrentTime(), player.getDuration());
					}, 1000);
				},
				onStateChange: (event) => {
					if (event.data === YT_ENDED) onended?.();
				},
				// Embedding disabled, removed or private: a failure, not a finished song. The code
				// tells a video that can still be downloaded from one that is gone.
				onError: (event) => onfailed?.(event.data)
			}
		});
	});
	onDestroy(() => {
		isDestroyed = true;
		if (timeTimer) clearInterval(timeTimer);
		player?.destroy();
	});

	$effect(() => {
		if (isReady && player) player.setVolume(volume);
	});

	// Follows the host's play/pause once the player can take commands; its first run starts the song.
	$effect(() => {
		if (!isReady || !player) return;
		if (playing) player.playVideo();
		else player.pauseVideo();
	});
</script>

<div class="yt-wrap"><div bind:this={host}></div></div>

<style>
	.yt-wrap {
		width: 100%;
		height: 100%;
	}
	.yt-wrap :global(iframe) {
		width: 100%;
		height: 100%;
		border: 0;
		display: block;
	}
</style>
