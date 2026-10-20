<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import { connectParty } from '$lib/party.svelte';
	import ConnectionStrip from '$lib/components/ui/ConnectionStrip.svelte';
	import type { IconName } from '$lib/components/ui/Icon.svelte';
	import Segmented from '$lib/components/ui/Segmented.svelte';
	import Toasts from '$lib/components/ui/Toasts.svelte';
	import HostGate from '$lib/features/host/HostGate.svelte';
	import HostHeader from '$lib/features/host/HostHeader.svelte';
	import { createHostSettings } from '$lib/features/host/hostSettings.svelte';
	import ControlsTab from '$lib/features/host/controls/ControlsTab.svelte';
	import { createControlsState } from '$lib/features/host/controls/controlsState.svelte';
	import LibraryTab from '$lib/features/host/library/LibraryTab.svelte';
	import { createRescan } from '$lib/features/host/library/rescan.svelte';
	import { createYtdlpUpdate } from '$lib/features/host/library/ytdlpUpdate.svelte';
	import PartyTab from '$lib/features/host/party/PartyTab.svelte';
	import { applyTheme } from '$lib/themes/applyTheme';
	import SoundTab from '$lib/features/mixer/SoundTab.svelte';

	type Tab = 'controls' | 'party' | 'library' | 'sound';

	const ALL_TABS: { value: Tab; label: string; icon: IconName }[] = [
		{ value: 'controls', label: 'Controls', icon: 'play' },
		{ value: 'party', label: 'Party', icon: 'sliders' },
		{ value: 'library', label: 'Library', icon: 'note' },
		{ value: 'sound', label: 'Sound', icon: 'mic' }
	];
	// The Sound tab drives the mixer agent, so an install without one (MIXER=off) has no Sound tab.
	const tabs = $derived(ALL_TABS.filter((option) => option.value !== 'sound' || page.data.features.isMixerOn));

	const party = connectParty('control');
	const settings = createHostSettings();
	const controls = createControlsState();
	const rescan = createRescan(settings);
	const ytdlp = createYtdlpUpdate(settings);
	let tab = $state<Tab>('controls');

	onMount(settings.load);

	// The server painted the saved TV theme; a pick in the Party tab re-themes this page at once.
	$effect(() => {
		if (settings.session.isAuthed) applyTheme(settings.data.tvTheme);
	});

	// Suggestions follow the lineup whichever tab is open, and wait for a burst of adds to settle.
	$effect(() => {
		void (party.state.queue.length + '|' + (party.state.current?.id ?? ''));
		const timer = setTimeout(() => controls.loadSuggestions(party.state), 1500);
		return () => clearTimeout(timer);
	});

	async function unlock() {
		await settings.load();
		party.reconnect();
	}

	// The socket may have connected before the PIN cookie existed, so it joined as a
	// guest; one fresh handshake after sign-in makes host actions work without a reload.
	let hasTriedHostReconnect = false;
	$effect(() => {
		if (settings.session.isAuthed && party.received && party.connected && !party.isHost && !hasTriedHostReconnect) {
			hasTriedHostReconnect = true;
			party.reconnect();
		}
	});
</script>

<main>
	<ConnectionStrip connected={party.connected} received={party.received} />
	{#if settings.session.isChecking}
		<div class="checking" role="status" aria-label="Loading"><span class="spin"></span></div>
	{:else if !settings.session.isAuthed}
		<HostGate message={settings.session.lockMessage} onunlock={unlock} />
	{:else}
		<HostHeader {party} />
		<div class="tabs">
			<Segmented label="Host sections" options={tabs} value={tab} onchange={(next) => (tab = next)} />
		</div>
		{#if tab === 'controls'}
			<ControlsTab {party} {settings} {controls} />
		{:else if tab === 'party'}
			<PartyTab {settings} />
		{:else if tab === 'library'}
			<LibraryTab {settings} {rescan} {ytdlp} />
		{:else}
			<SoundTab {party} />
		{/if}
	{/if}
	<Toasts />
</main>

<style>
	main {
		max-width: 600px;
		margin: 0 auto;
		padding: var(--sp-6) var(--sp-4) 72px;
		box-sizing: border-box;
	}
	.tabs {
		margin-bottom: var(--sp-6);
	}
	.checking {
		display: grid;
		place-items: center;
		min-height: 60vh;
	}
</style>
