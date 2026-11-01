<script lang="ts">
	import type { Party } from '$lib/party.svelte';
	import { toast } from '$lib/toast.svelte';
	import { addFailedMessage, COULD_NOT_SAVE } from '$lib/messages';
	import { libraryInput } from '$lib/features/search/api';
	import type { SearchResult } from '$lib/features/search/types';
	import type { HostSettings } from '../hostSettings.svelte';
	import type { ControlsState } from './controlsState.svelte';
	import AddSong from './AddSong.svelte';
	import NowPlaying from './NowPlaying.svelte';
	import RecentlyPlayed from './RecentlyPlayed.svelte';
	import SuggestedSongs from './SuggestedSongs.svelte';
	import UpNext from './UpNext.svelte';

	let {
		party,
		settings,
		controls
	}: { party: Party; settings: HostSettings; controls: ControlsState } = $props();

	async function addLibrarySong(song: SearchResult) {
		try {
			await party.add(libraryInput(song, controls.singerName));
		} catch (error) {
			toast(addFailedMessage(error), { kind: 'err' });
			return;
		}
		controls.clear();
	}

	// The server ranks starred versions first, so an open search reloads to show the new order.
	async function toggleStar(songId: number) {
		const outcome = await settings.toggleStar(songId);
		// An expired session already went back to the PIN gate, whose note says the change wasn't saved.
		if (outcome === 'failed') toast(COULD_NOT_SAVE, { kind: 'err' });
		if (outcome === 'saved') controls.refresh();
	}
</script>

<div class="tab">
	<NowPlaying {party} {settings} ontogglestar={toggleStar} />
	<!-- Right under the now card, so a one-handed host reaches it without scrolling past the line. -->
	<AddSong {party} {controls} onadd={addLibrarySong} ontogglestar={toggleStar} />
	<UpNext {party} {settings} />
	<RecentlyPlayed {party} {settings} ontogglestar={toggleStar} />
	<SuggestedSongs songs={controls.suggestions} onadd={addLibrarySong} />
</div>

<style>
	.tab {
		display: flex;
		flex-direction: column;
		gap: var(--sp-6);
	}
</style>
