<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { connectParty, type PartyActionError } from '$lib/party.svelte';
	import { toast } from '$lib/toast.svelte';
	import { addFailedMessage, COULD_NOT_DO, COULD_NOT_REMOVE, COULD_NOT_RENAME } from '$lib/messages';
	import Chip from '$lib/components/ui/Chip.svelte';
	import ConnectionStrip from '$lib/components/ui/ConnectionStrip.svelte';
	import Toasts from '$lib/components/ui/Toasts.svelte';
	import Wordmark from '$lib/components/ui/Wordmark.svelte';
	import { ADDED_HOLD_MS, createAddTracker, songAddKey, type AddPhase } from '$lib/features/search/addTracker';
	import { libraryInput } from '$lib/features/search/api';
	import { MAX_SEEDS, type Seed } from '$lib/features/search/suggestions';
	import type { SearchResult } from '$lib/features/search/types';
	import GuestLineup from '$lib/features/guest/GuestLineup.svelte';
	import GuestSearch from '$lib/features/guest/GuestSearch.svelte';
	import MySongsCard from '$lib/features/guest/MySongsCard.svelte';
	import NameForm from '$lib/features/guest/NameForm.svelte';
	import NowBar from '$lib/features/guest/NowBar.svelte';
	import SuggestedForYou from '$lib/features/guest/SuggestedForYou.svelte';
	import { listMySongs } from '$lib/features/guest/mySongs';
	import { createNextAlert } from '$lib/features/guest/nextAlert.svelte';
	import YourSoundCard from '$lib/features/singer-sound/YourSoundCard.svelte';
	import ThemePicker from '$lib/themes/ThemePicker.svelte';
	import type { QueueItem } from '$lib/types';

	const SINGER_KEY = 'karaoke:singer';
	const SEEDS_KEY = 'karaoke:myseeds';
	const HAS_ADDED_KEY = 'karaoke:has-added';
	const UNDO_WINDOW_MS = 5000;

	const party = connectParty('guest');
	const nextAlert = createNextAlert();
	const phases = $state<Record<string, AddPhase>>({});
	const adds = createAddTracker(phases);

	let singer = $state('');
	let nameDraft = $state('');
	// Stays false until the browser has read the saved name, so a returning guest
	// never sees the name form flash.
	let isNameKnown = $state(false);
	let isEditingName = $state(false);
	let hasAdded = $state(false);
	let query = $state('');
	let seeds = $state<Seed[]>([]);
	let nowBarHeight = $state(0);
	let undoIds = $state<string[]>([]);

	let mySongs = $derived(listMySongs(party.state, party.ownerTag));

	onMount(() => {
		singer = localStorage.getItem(SINGER_KEY) ?? '';
		nameDraft = singer;
		isEditingName = !singer;
		hasAdded = localStorage.getItem(HAS_ADDED_KEY) === '1';
		seeds = readSeeds();
		isNameKnown = true;
		nextAlert.load();
	});

	// Only after the first real snapshot: the empty placeholder would make a phone
	// that opens while already next look newly next, and buzz.
	$effect(() => {
		if (party.received && party.ownerTag) nextAlert.check(mySongs);
	});

	// A value this page can't read would leave the page on its spinner; it starts over instead.
	function readSeeds(): Seed[] {
		try {
			const saved = JSON.parse(localStorage.getItem(SEEDS_KEY) ?? '[]');
			return Array.isArray(saved) ? saved : [];
		} catch {
			return [];
		}
	}

	function rememberSeed(song: SearchResult) {
		seeds = [
			{ songId: song.id, artist: song.artist, title: song.title },
			...seeds.filter((seed) => seed.songId !== song.id)
		].slice(0, MAX_SEEDS);
		localStorage.setItem(SEEDS_KEY, JSON.stringify(seeds));
	}

	// After the row's check has shown, the page returns to the top, where the card
	// now lists the song and offers Undo for a few seconds.
	function afterAdd(item: QueueItem) {
		hasAdded = true;
		localStorage.setItem(HAS_ADDED_KEY, '1');
		undoIds = [...undoIds, item.id];
		setTimeout(() => (undoIds = undoIds.filter((id) => id !== item.id)), UNDO_WINDOW_MS);
		const isReducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
		setTimeout(() => window.scrollTo({ top: 0, behavior: isReducedMotion ? 'auto' : 'smooth' }), ADDED_HOLD_MS);
	}

	async function addSong(song: SearchResult): Promise<QueueItem | null> {
		let item: QueueItem | null;
		try {
			item = await adds.run(songAddKey(song.id), () => party.add(libraryInput(song, singer)));
		} catch (error) {
			toast(addFailedMessage(error), { kind: 'err' });
			return null;
		}
		if (!item) return null;
		rememberSeed(song);
		afterAdd(item);
		return item;
	}

	// Undo and the ✕ in the card, and the ✕ in the lineup, all land here.
	async function removeMine(id: string) {
		undoIds = undoIds.filter((undoId) => undoId !== id);
		try {
			await party.remove(id);
			toast('Removed from the lineup');
		} catch {
			toast(COULD_NOT_REMOVE, { kind: 'err' });
		}
	}

	// The server records a singer's own end as sung. A stale answer means the song already
	// ended on its own, which is what they wanted.
	async function endMine(id: string) {
		try {
			await party.next(id);
			toast('Ended your song');
		} catch (error) {
			if ((error as PartyActionError).code !== 'stale') toast(COULD_NOT_DO, { kind: 'err' });
		}
	}

	// The search's results live in GuestSearch, which the name form unmounts, so a kept
	// query would come back with no results and read as "Not in the library".
	function editName() {
		query = '';
		nameDraft = singer;
		isEditingName = true;
	}

	function saveName() {
		const name = nameDraft.trim();
		if (!name) return;
		const shouldRename = name !== singer && mySongs.some((song) => song.position > 0);
		singer = name;
		localStorage.setItem(SINGER_KEY, name);
		isEditingName = false;
		if (shouldRename) party.rename(name).catch(() => toast(COULD_NOT_RENAME, { kind: 'err' }));
	}
</script>

<main>
	<ConnectionStrip connected={party.connected} received={party.received} />
	<header class="head">
		<Wordmark />
		<span class="head-actions">
			{#if isNameKnown && !isEditingName}
				<Chip label={singer} icon="mic" trailingIcon="edit" onclick={editName} />
			{/if}
			<span class="theme-slot"><ThemePicker /></span>
		</span>
	</header>
	{#if !isNameKnown}
		<div class="loading" role="status" aria-label="Loading"><span class="spin"></span></div>
	{:else if isEditingName}
		<NameForm
			bind:value={nameDraft}
			isFirstTime={!singer}
			onsave={saveName}
			oncancel={singer ? () => (isEditingName = false) : undefined}
		/>
	{:else}
		{#if mySongs.length > 0}
			<MySongsCard
				songs={mySongs}
				isPlaying={party.state.isPlaying}
				{undoIds}
				onremove={removeMine}
				isHolding={party.state.hold !== null}
				onend={endMine}
				isVibrationShown={nextAlert.isSwitchShown}
				isVibrationOn={nextAlert.isPhoneOn}
				onvibrationchange={nextAlert.setPhoneOn}
			/>
		{/if}
		{#if page.data.features.isMixerOn}<YourSoundCard {party} />{/if}
		<GuestSearch
			{party}
			{singer}
			{phases}
			bind:query
			hasHint={!hasAdded && mySongs.length === 0}
			onadd={addSong}
			onvideoadded={afterAdd}
		/>
		<SuggestedForYou {party} {seeds} {phases} isHidden={query.trim().length >= 2} onadd={addSong} />
		<GuestLineup {party} onremove={removeMine} />
		<NowBar {party} bind:height={nowBarHeight} />
	{/if}
	<!-- The bar keeps its last height once it closes, so only a playing song lifts the toasts. -->
	<Toasts clearance={party.state.current ? nowBarHeight : 0} />
</main>

<style>
	main {
		min-height: 100vh;
		max-width: 480px;
		margin: 0 auto;
		padding: var(--sp-6) var(--sp-4) 112px;
		box-sizing: border-box;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--sp-3);
		margin-bottom: var(--sp-4);
	}
	.head-actions {
		display: flex;
		align-items: center;
		gap: var(--sp-1);
		min-width: 0;
	}
	/* A long name chip must squeeze itself, never the 44px palette button. */
	.theme-slot {
		display: flex;
		flex: none;
	}
	.loading {
		display: grid;
		place-items: center;
		padding-top: var(--sp-8);
	}
</style>
