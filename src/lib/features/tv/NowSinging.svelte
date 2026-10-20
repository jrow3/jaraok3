<script lang="ts">
	import type { QueueItem } from '$lib/types';
	import type { StageSpot } from './stageSpot';
	import NameFlourish from '$lib/themes/flourishes/NameFlourish.svelte';

	let { item, isPlaying, spot }: { item: QueueItem; isPlaying: boolean; spot: StageSpot } = $props();
</script>

<!-- The lyrics are the show: the singer and the song read as Up next does, a bold name over a
     quieter title, and only the rail has the room for the artist. The rail's props live in its own
     flourish row. -->
<div class={['now-singing', `is-${spot}`]}>
	<span class="mark">
		{#if spot !== 'rail'}<NameFlourish {isPlaying} />{/if}
		<span class={['eq', !isPlaying && 'is-still']}><i></i><i></i><i></i></span>
	</span>
	<span class="singer">{item.singer}</span>
	<span class="song">{spot === 'rail' ? `${item.title} · ${item.artist}` : item.title}</span>
</div>

<style>
	.now-singing {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 1vh calc(var(--tv-gap) / 2);
		min-width: 0;
		font-size: var(--tv-fs-sm);
		line-height: 1.2;
	}
	/* The same size as Up next beneath it. */
	.is-rail {
		font-size: var(--tv-fs-md);
	}
	.mark {
		display: flex;
		align-items: center;
		gap: calc(var(--tv-gap) / 2);
		color: var(--accent);
	}
	.eq {
		height: 0.8em;
		gap: 0.12em;
	}
	.eq i {
		width: 0.18em;
	}
	.is-still i {
		animation-play-state: paused;
	}
	.singer,
	.song {
		min-width: 0;
		max-width: 100%;
		overflow: hidden;
		overflow-wrap: anywhere;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
	}
	/* A name too long to sit beside the mark takes the next line whole rather than squeeze. */
	.singer {
		flex: none;
		font-weight: 700;
		color: var(--ink-hi);
	}
	.song {
		flex-basis: 100%;
		color: var(--ink-mid);
	}
	/* One line over the picture, with the halo in place of a box, as Up next has. */
	.is-video {
		flex-wrap: nowrap;
		max-width: 100%;
		font-size: var(--tv-fs-md);
		text-shadow: var(--tv-halo);
	}
	.is-video .song {
		color: var(--ink-hi);
	}
	.is-video .singer,
	.is-video .song {
		display: block;
		flex: 0 1 auto;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.is-video .song::before {
		content: '· ';
	}
</style>
