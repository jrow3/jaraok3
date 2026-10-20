<script lang="ts">
	import type { QueueItem } from '$lib/types';
	import type { StageSpot } from './stageSpot';
	import { upNextSongs, downloadNote } from './upNext';

	let { queue, isNearEnd, spot }: { queue: QueueItem[]; isNearEnd: boolean; spot: StageSpot } = $props();

	// Under the rail's QR a second song would push the time left past the safe margin.
	let songs = $derived(upNextSongs(queue, spot === 'rail' ? 1 : 2));
	let first = $derived(songs.at(0));
	let isCallingFirst = $derived(isNearEnd && first !== undefined);
	let listed = $derived(isCallingFirst ? songs.slice(1) : songs);
	let note = $derived(downloadNote(queue));
</script>

<!-- Words only, in one face and one size: a footnote to the lyrics, not a card over them. Each
     song is its singer then its title, so the call near the end reads the same as the list. -->
<div class={['up-next', `is-${spot}`]}>
	{#if isCallingFirst && first}
		<div class="entry">
			<span class="singer is-calling">Next: {first.singer}, get ready</span>
			<span class="song">{first.title}</span>
		</div>
	{/if}
	{#if listed.length > 0}
		<div class="group">
			<span class="label">{isCallingFirst ? 'Then' : 'Up next'}</span>
			{#each listed as song (song.id)}
				<div class="entry">
					<span class="singer">{song.singer}</span>
					<span class="song">{song.title}</span>
				</div>
			{/each}
		</div>
	{:else if !isCallingFirst}
		<div class="group">
			<span class="label">Up next</span>
			<span class="empty">No one’s up yet. Scan to sing!</span>
		</div>
	{/if}
	{#if note}<span class={['note', note.isFailed && 'is-failed']}>{note.text}</span>{/if}
</div>

<style>
	/* Spacing is in em of this size, so a spot sets it once; the label and the note sit at the
	   TV's smallest size, the floor for reading across a room. */
	.up-next {
		display: flex;
		flex-direction: column;
		gap: 0.6em;
		min-width: 0;
		font-size: var(--tv-fs-md);
		line-height: 1.2;
	}
	.is-band {
		font-size: var(--tv-fs-sm);
	}
	.group {
		display: flex;
		flex-direction: column;
		gap: 0.35em;
		min-width: 0;
	}
	/* Singer then song on one row, cut short rather than wrapped: the name keeps its room first,
	   and the song takes what's left. */
	.entry {
		display: flex;
		align-items: baseline;
		gap: 0.5em;
		min-width: 0;
		white-space: nowrap;
	}
	.label {
		font-size: var(--tv-fs-sm);
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--ink-mid);
	}
	.singer {
		flex: none;
		max-width: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		font-weight: 700;
		color: var(--ink-hi);
	}
	.is-calling {
		color: var(--accent);
	}
	.song {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--ink-mid);
	}
	.empty {
		color: var(--ink-mid);
		overflow-wrap: anywhere;
	}
	.note {
		font-size: var(--tv-fs-sm);
		color: var(--warn);
		overflow-wrap: anywhere;
	}
	.is-failed {
		color: var(--bad);
	}
	/* Over a video the words carry their own halo in place of a box, since any picture can be
	   behind them. */
	.is-video {
		text-shadow: var(--tv-halo);
	}
	.is-video .song,
	.is-video .empty,
	.is-video .label {
		color: var(--ink-hi);
	}
</style>
