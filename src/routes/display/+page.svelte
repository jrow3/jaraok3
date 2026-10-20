<script lang="ts">
	import { untrack } from 'svelte';
	import type { PageProps } from './$types';
	import { connectParty } from '$lib/party.svelte';
	import { createJustAddedNotice } from '$lib/features/tv/justAddedNotice.svelte';
	import { createMovedAheadNotice } from '$lib/features/tv/movedAheadNotice.svelte';
	import HoldFrame from '$lib/features/tv/HoldFrame.svelte';
	import TvStage from '$lib/features/tv/TvStage.svelte';
	import TvIdle from '$lib/features/tv/TvIdle.svelte';
	import { applyTheme } from '$lib/themes/applyTheme';
	import { stageTheme } from '$lib/features/tv/stageTheme';

	let { data }: PageProps = $props();

	// Only the first value: the socket keeps the choices current after that.
	const party = connectParty('display', untrack(() => data.display));
	const justAdded = createJustAddedNotice(party);
	const movedAhead = createMovedAheadNotice(party);

	// The host's theme, or the singer's, reaches the TV live with no reload. Only data-theme
	// changes, so the player on stage keeps playing.
	let theme = $derived(stageTheme(party.display, party.state));
	$effect(() => applyTheme(theme));
</script>

<main>
	<!-- No start click: a browser that refuses to play sound gets the stage's own tap to start. -->
	{#if party.state.hold}
		<HoldFrame next={party.state.hold.next} join={data.join} />
	{:else if party.state.current}
		<TvStage
			current={party.state.current}
			{party}
			join={data.join}
			justAdded={justAdded.song}
			isJustAddedFresh={justAdded.isFresh}
			movedAhead={movedAhead.note}
		/>
	{:else}
		<TvIdle snapshot={party.state} join={data.join} />
	{/if}
</main>

<style>
	main {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
