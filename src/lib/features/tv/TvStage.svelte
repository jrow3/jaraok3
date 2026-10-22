<script lang="ts">
	import { fade } from 'svelte/transition';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { QueueItem } from '$lib/types';
	import type { Party } from '$lib/party.svelte';
	import type { JoinLink } from './joinLink';
	import type { JustAddedSong } from './upNext';
	import type { MovedAheadNote } from './movedAhead';
	import { isNearEnd, remainingLabel } from './progress';
	import { stageSpot, isUpNextFull } from './stageSpot';
	import { createStagePlayback } from './stagePlayback.svelte';
	import { MOVED_AHEAD_MS } from './movedAheadNotice.svelte';
	import StagePlayer from './StagePlayer.svelte';
	import NowSinging from './NowSinging.svelte';
	import JoinQr from './JoinQr.svelte';
	import UpNext from './UpNext.svelte';
	import Notice from './Notice.svelte';
	import PausedBadge from './PausedBadge.svelte';
	import FailureCard from './FailureCard.svelte';
	import TapToStart from './TapToStart.svelte';
	import StageFlourish from '$lib/themes/flourishes/StageFlourish.svelte';

	let {
		current,
		party,
		join,
		justAdded,
		isJustAddedFresh,
		movedAhead
	}: {
		current: QueueItem;
		party: Party;
		join: JoinLink;
		justAdded: JustAddedSong | null;
		isJustAddedFresh: boolean;
		movedAhead: MovedAheadNote | null;
	} = $props();

	// Long enough to read who's up, then the name gets out of the lyrics' way.
	const NAME_SHOW_MS = 8000;
	// Matches --tv-fade, for the fades Svelte runs as a card comes and goes.
	const FADE_MS = 900;

	const playback = createStagePlayback(() => party);
	const playKey = $derived(party.state.playKey);
	let isPlaying = $derived(party.state.isPlaying);
	let spot = $derived(stageSpot(current.source, party.display.lyricsLayout));
	let isEnding = $derived(isNearEnd(playback.progress.time, playback.progress.duration));
	let isNameHidden = $state(false);
	let isUpNextFaint = $derived(
		!isUpNextFull({
			isAlwaysShown: party.display.isUpNextAlwaysShown,
			isNameShown: !isNameHidden,
			isNearEnd: isEnding
		})
	);
	// A new song is news on its own; after that it keeps time with Up next's start and end.
	let isJustAddedFaint = $derived(!isJustAddedFresh && isNameHidden && !isEnding);
	let fadeMs = $derived(prefersReducedMotion.current ? 0 : FADE_MS);

	$effect(() => {
		void playKey;
		isNameHidden = false;
		const timer = setTimeout(() => (isNameHidden = true), NAME_SHOW_MS);
		return () => clearTimeout(timer);
	});
</script>

<div class={['tv-stage', `is-${spot}`]}>
	<div class="screen">
		{#key playback.mountKey}
			<StagePlayer item={current} {isPlaying} volume={party.display.musicLevel} {playback} />
		{/key}
	</div>
	<div class="flourish"><StageFlourish {isPlaying} isInRail={spot === 'rail'} hasBands={spot === 'band'} /></div>
	<div class={['now', isNameHidden && 'is-hidden']}>
		<NowSinging item={current} {isPlaying} {spot} />
	</div>
	{#if party.display.isJoinCodeShown}<div class="join"><JoinQr {join} size={spot === 'rail' ? 'md' : 'sm'} /></div>{/if}
	<!-- Beside full-screen lyrics, Up next and the notices sit in the corners as over a video: the
	     bands are too narrow to show a whole song name. -->
	<div class={['next', isUpNextFaint && 'is-faint']}>
		<UpNext queue={party.state.queue} isNearEnd={isEnding} spot={spot === 'band' ? 'video' : spot} />
	</div>
	<!-- One at a time, so a notice never spreads onto the lyrics. The moved-ahead note explains
	     the song on stage, so it goes first. -->
	<div class="notices">
		{#if movedAhead}
			{#key movedAhead}
				<Notice title={movedAhead.title} detail={movedAhead.detail} lifetimeMs={MOVED_AHEAD_MS} />
			{/key}
		{:else if justAdded}
			{#key justAdded.id}
				<div class={['just-added', isJustAddedFaint && 'is-faint']} transition:fade|global={{ duration: fadeMs }}>
					<Notice
						title={`${justAdded.singer} · ${justAdded.title}`}
						detail={`Just added · #${justAdded.position} in line`}
						isTitleOneRow
					/>
				</div>
			{/key}
		{/if}
	</div>
	{#if party.display.isTimeLeftShown && playback.progress.duration > 0}
		<div class="time-left">{remainingLabel(playback.progress.time, playback.progress.duration)}</div>
	{/if}
	{#if !isPlaying}<div class="paused"><PausedBadge /></div>{/if}
	{#if playback.failure}<FailureCard title={playback.failure.item.title} isEmbedBlocked={playback.failure.isEmbedBlocked} />{/if}
	{#if playback.isBlocked}<TapToStart onstart={playback.retry} />{/if}
</div>

<style>
	.tv-stage {
		position: relative;
		width: 100vw;
		height: 100vh;
		box-sizing: border-box;
		overflow: hidden;
		background: var(--tv-stage-bg);
	}
	.notices {
		display: flex;
		flex-direction: column;
		gap: var(--tv-gap);
		min-width: 0;
	}
	.time-left {
		font-size: var(--tv-fs-sm);
		color: var(--ink-mid);
	}
	.paused {
		position: absolute;
		top: var(--tv-safe-y);
		left: 50%;
		z-index: 2;
		transform: translateX(-50%);
	}

	/* CDG: the lyrics keep their 300:216 shape; the rail on the left takes the rest, the
	   notices included, so nothing lands on the lyrics. */
	.is-rail {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		grid-template-rows: auto auto auto auto minmax(0, 1fr) auto;
		grid-template-areas: 'now screen' 'join screen' 'next screen' 'notices screen' 'flourish screen' 'time screen';
		gap: var(--tv-gap) var(--tv-gap-lg);
		padding: var(--tv-safe-y) var(--tv-safe-x);
		background: var(--tv-page-bg);
	}
	.is-rail .screen {
		grid-area: screen;
		height: calc(100vh - 2 * var(--tv-safe-y));
		aspect-ratio: 300 / 216;
	}
	.is-rail .now {
		grid-area: now;
		min-width: 0;
	}
	.is-rail .join {
		grid-area: join;
		justify-self: start;
	}
	.is-rail .next {
		grid-area: next;
		min-width: 0;
	}
	.is-rail .notices {
		grid-area: notices;
	}
	.is-rail .flourish {
		grid-area: flourish;
		position: relative;
		min-height: 0;
		container: stage-rail / size;
	}
	.is-rail .time-left {
		grid-area: time;
		justify-self: end;
	}

	/* Full-screen CDG and video: the overlays sit in the screen's corners. Beside full-screen
	   lyrics they keep to the bands, so none of them lands on a lyric. */
	.is-band > *,
	.is-video > * {
		position: absolute;
	}
	/* In a band the side margin gives way to the band's own padding, the same gap from the screen's
	   edge as from the lyrics; the top and bottom keep the safe margin. */
	.is-band {
		--tv-safe-x: var(--tv-band-pad);
	}
	.is-band .screen,
	.is-video .screen,
	.is-band .flourish,
	.is-video .flourish {
		inset: 0;
	}
	.flourish {
		pointer-events: none;
	}
	.now {
		top: var(--tv-safe-y);
		left: var(--tv-safe-x);
	}
	.join {
		top: var(--tv-safe-y);
		right: var(--tv-safe-x);
	}
	.next {
		bottom: var(--tv-safe-y);
		left: var(--tv-safe-x);
	}
	/* The notices stand clear of the time left beneath them. */
	.notices {
		right: var(--tv-safe-x);
		bottom: calc(var(--tv-safe-y) + var(--tv-gap-lg));
	}
	.time-left {
		right: var(--tv-safe-x);
		bottom: var(--tv-safe-y);
	}
	.is-band .now {
		width: var(--tv-band);
	}
	.is-video .now {
		max-width: 60vw;
	}
	.is-band .next,
	.is-video .next {
		max-width: 54vw;
	}
	.is-band .notices,
	.is-video .notices {
		max-width: 34vw;
	}
	/* Any picture can be behind words laid over a video or the lyrics, so they carry a halo in
	   place of a box. */
	.is-video .time-left,
	.is-band .notices,
	.is-video .notices {
		color: var(--ink-hi);
		text-shadow: var(--tv-halo);
	}
	/* Mid-song Up next and the just-added card stay on stage, faint, and come back to full for the
	   moments that matter; both ways fade. */
	.next,
	.just-added {
		transition: opacity var(--tv-fade) var(--ease);
	}
	.is-faint {
		opacity: 0.2;
	}
	/* The rail has room to keep the name; beside the lyrics it leaves once the singer has seen it. */
	.is-band .is-hidden,
	.is-video .is-hidden {
		opacity: 0;
		visibility: hidden;
		transition:
			opacity var(--tv-fade) var(--ease),
			visibility var(--tv-fade);
	}
</style>
