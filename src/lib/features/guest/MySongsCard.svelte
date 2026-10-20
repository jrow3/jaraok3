<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import SpotlightFlourish from '$lib/themes/flourishes/SpotlightFlourish.svelte';
	import { statusLabel, type MySong, type MySongStatus } from './mySongs';

	const TONES: Record<MySongStatus, 'accent' | 'strong' | 'warn' | 'good' | 'muted' | 'bad'> = {
		singing: 'strong',
		next: 'strong',
		waiting: 'accent',
		downloading: 'warn',
		sung: 'good',
		skipped: 'muted',
		removed: 'muted',
		failed: 'bad'
	};
	// Two taps to end a song, so a phone in a pocket can't end one.
	const CONFIRM_END_MS = 3000;
	const REMOVABLE: MySongStatus[] = ['waiting', 'next', 'downloading'];

	let {
		songs,
		isPlaying,
		undoIds,
		onremove,
		isHolding,
		onend,
		isVibrationShown,
		isVibrationOn,
		onvibrationchange
	}: {
		songs: MySong[];
		isPlaying: boolean;
		/** Songs added in the last few seconds, which may still be taken back. */
		undoIds: string[];
		onremove: (id: string) => void;
		/** The song on stage is still waiting to start: there's nothing to end yet. */
		isHolding: boolean;
		onend: (id: string) => void;
		isVibrationShown: boolean;
		isVibrationOn: boolean;
		onvibrationchange: (isOn: boolean) => void;
	} = $props();

	let isConfirmingEnd = $state(false);
	let confirmTimer: ReturnType<typeof setTimeout> | undefined;

	function tapEnd(id: string) {
		clearTimeout(confirmTimer);
		if (isConfirmingEnd) {
			isConfirmingEnd = false;
			onend(id);
			return;
		}
		isConfirmingEnd = true;
		confirmTimer = setTimeout(() => (isConfirmingEnd = false), CONFIRM_END_MS);
	}

	let spotlight = $derived(
		songs.find((song) => song.status === 'singing') ?? songs.find((song) => song.status === 'next')
	);
</script>

<section class="my-songs">
	{#if spotlight}
		<div class={['spotlight', spotlight.status === 'singing' && 'is-singing']} role="status">
			<span class="spotlight-icon"><Icon name="mic" size={20} /></span>
			<span class="spotlight-text">
				<strong class="headline">{spotlight.status === 'singing' ? 'You’re singing' : 'You’re next, get ready'}</strong>
				<span>{spotlight.status === 'singing' ? 'Grab the mic!' : spotlight.title}</span>
			</span>
			{#if spotlight.status === 'singing'}<SpotlightFlourish {isPlaying} />{/if}
			{#if spotlight.status === 'singing' && !isHolding}
				{@const id = spotlight.id}
				<span class="end">
					<Button variant="secondary" size="sm" onclick={() => tapEnd(id)}>
						{isConfirmingEnd ? 'Tap again to end' : 'End my song'}
					</Button>
				</span>
			{/if}
		</div>
	{/if}
	<SectionHeader label="Your songs" tone="accent" />
	<ul class="songs">
		{#each songs as song (song.id)}
			<li class="song">
				<span class="meta">
					<span class="title">{song.title}</span>
					<span class="artist">{song.artist}</span>
				</span>
				<span class="status status-{TONES[song.status]}">{statusLabel(song)}</span>
				{#if REMOVABLE.includes(song.status)}
					{#if undoIds.includes(song.id)}
						<Button variant="secondary" onclick={() => onremove(song.id)}>Undo</Button>
					{:else}
						<Button iconOnly variant="danger" icon="x" label="Remove my song" onclick={() => onremove(song.id)} />
					{/if}
				{/if}
			</li>
		{/each}
	</ul>
	{#if isVibrationShown}
		<div class="vibration">
			<span>Vibrate when I’m next</span>
			<Switch checked={isVibrationOn} onchange={onvibrationchange} label="Vibrate when I’m next" />
		</div>
	{/if}
</section>

<style>
	.my-songs {
		margin-bottom: var(--sp-4);
		padding: var(--sp-3);
		background: var(--s1);
		border: var(--card-edge-strong);
		border-radius: var(--r-xl);
		box-shadow: var(--shadow-card);
	}
	.spotlight {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--sp-3);
		margin-bottom: var(--sp-3);
		padding: var(--sp-3);
		background: var(--surface-now), var(--s2);
		border: 1px solid var(--accent-a40);
		border-radius: var(--r-lg);
		animation: spotlight-in var(--t-slow) var(--ease);
	}
	.is-singing {
		background: var(--brand-gradient);
		border-color: transparent;
		color: var(--on-brand);
	}
	@keyframes spotlight-in {
		from {
			opacity: 0;
			transform: scale(0.96);
		}
	}
	.spotlight-icon {
		flex: none;
		display: grid;
		place-items: center;
		width: var(--tap);
		height: var(--tap);
		border-radius: 50%;
		background: var(--accent);
		color: var(--accent-ink);
	}
	.is-singing .spotlight-icon {
		background: var(--accent-ink);
		color: var(--accent);
	}
	.end {
		position: relative;
		margin-left: auto;
		flex: none;
	}
	.spotlight-text {
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.spotlight-text strong {
		font-size: var(--fs-lg);
	}
	.spotlight-text span,
	.title,
	.artist {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.spotlight-text span {
		font-size: var(--fs-sm);
		color: var(--ink-mid);
	}
	.is-singing .spotlight-text span {
		color: inherit;
	}
	.songs {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}
	.song {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		min-height: var(--tap);
	}
	.meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.title {
		font-size: var(--fs-sm);
		font-weight: 700;
	}
	.artist {
		font-size: var(--fs-xs);
		color: var(--ink-mid);
	}
	.status {
		flex: none;
		font-size: var(--fs-xs);
		font-weight: 700;
		border-radius: var(--r-pill);
		padding: var(--sp-1) var(--sp-2);
	}
	.status-accent {
		color: var(--accent);
		background: var(--accent-a10);
	}
	.status-strong {
		color: var(--accent-ink);
		background: var(--accent);
	}
	.status-warn {
		color: var(--warn);
		background: var(--warn-a14);
	}
	.status-good {
		color: var(--good);
		background: var(--good-a13);
	}
	.status-muted {
		color: var(--ink-mid);
		background: var(--s2);
	}
	.status-bad {
		color: var(--bad-soft);
		background: var(--bad-a14);
	}
	.vibration {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--sp-3);
		margin-top: var(--sp-3);
		padding-top: var(--sp-3);
		border-top: 1px solid var(--line-soft);
		font-size: var(--fs-sm);
		color: var(--ink-mid);
	}
</style>
