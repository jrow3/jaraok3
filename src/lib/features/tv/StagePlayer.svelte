<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import type { QueueItem } from '$lib/types';
	import type { StagePlayback } from './stagePlayback.svelte';
	import CdgPlayer from './players/CdgPlayer.svelte';
	import VideoPlayer from './players/VideoPlayer.svelte';
	import YoutubePlayer from './players/YoutubePlayer.svelte';

	let {
		item,
		isPlaying,
		volume,
		playback
	}: { item: QueueItem; isPlaying: boolean; volume: number; playback: StagePlayback } = $props();

	// Pinned at mount: a report that arrives after a skip must name the old song, which
	// the stage and the server both ignore, not the song that replaced it.
	const mountedItem = untrack(() => item);
	// A restart or a tap-to-start retry remounts the player for the same song id, so an old
	// player's late report would pass the stage's id check and end a song that plays.
	let isDestroyed = false;
	onDestroy(() => (isDestroyed = true));
	const onended = () => {
		if (!isDestroyed) playback.ended(mountedItem.id);
	};
	const onfailed = (errorCode?: number) => {
		if (!isDestroyed) playback.fail(mountedItem, errorCode);
	};
</script>

{#if item.source === 'local' && item.songId != null}
	<CdgPlayer
		songId={item.songId}
		playing={isPlaying}
		{volume}
		{onended}
		{onfailed}
		onblocked={playback.block}
		ontime={playback.ontime}
	/>
{:else if item.source === 'local-video' && item.songId != null}
	<VideoPlayer
		songId={item.songId}
		playing={isPlaying}
		{volume}
		{onended}
		{onfailed}
		onblocked={playback.block}
		ontime={playback.ontime}
	/>
{:else}
	<YoutubePlayer videoId={item.ytId ?? ''} playing={isPlaying} {volume} {onended} {onfailed} ontime={playback.ontime} />
{/if}
