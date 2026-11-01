<script lang="ts">
	import type { Party } from '$lib/party.svelte';
	import { toast } from '$lib/toast.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import StarButton from '$lib/features/search/StarButton.svelte';
	import { tileGradient, initial } from '$lib/ui';
	import type { HostSettings } from '../hostSettings.svelte';
	import { showFailed, showUndoFailed } from '../showFailed';

	let {
		party,
		settings,
		ontogglestar
	}: { party: Party; settings: HostSettings; ontogglestar: (songId: number) => void } = $props();

	let current = $derived(party.state.current);
	// Between songs the next one waits while the TV shows who's up.
	let isHolding = $derived(party.state.hold !== null);

	function next() {
		const skipped = current;
		if (!skipped) return;
		party
			.next(skipped.id)
			.then((outcome) => {
				// Near the end it counts as sung, and only a skip can be undone.
				if (outcome === 'sung') return toast(`Finished ${skipped.title}`);
				toast(`Skipped ${skipped.title}`, {
					action: { label: 'Undo', run: () => party.unskip(skipped.id).catch(showUndoFailed) }
				});
			})
			// The server refuses a "next" for a song that already changed (a TV got there
			// first); that is expected, not a failure.
			.catch((error) => {
				if (error?.code !== 'stale') showFailed();
			});
	}
</script>

<section class="now-playing">
	<div class="song">
		{#if current}
			<span class="art" style:background={tileGradient(current.artist + current.title)}>{initial(current.title)}</span>
			<div class="details">
				<span class="label">
					{#if isHolding}
						Up next
					{:else}
						<!-- Still bars and "Paused", so a paused song never looks like a hang. -->
						<span class={['eq', !party.state.isPlaying && 'is-still']}><i></i><i></i><i></i></span>
						{party.state.isPlaying ? 'Now singing' : 'Paused'}
					{/if}
				</span>
				<div class="title-line">
					<span class="title headline">{current.title}</span>
					{#if current.source === 'local' && current.songId != null}
						{@const songId = current.songId}
						<StarButton isOn={settings.isStarred(songId)} onclick={() => ontogglestar(songId)} />
					{/if}
				</div>
				<div class="subtitle">{current.singer} · {current.artist}</div>
				{#if current.source === 'local' && current.discTag}
					<div class="tags"><Tag kind="tier" value={settings.tierOf(current.discTag)} label={current.discTag} /></div>
				{/if}
			</div>
		{:else}
			<div class="details"><div class="idle">No one’s singing</div></div>
		{/if}
	</div>
	<div class="transport">
		<button
			type="button"
			class="transport-button"
			onclick={() => party.restart().catch(showFailed)}
			disabled={!current}
			aria-label="Restart this song"
			title="Restart this song"
		>
			<Icon name="restart" size={18} />
		</button>
		{#if party.state.isPlaying}
			<button type="button" class="transport-button main" onclick={() => party.pause().catch(showFailed)} aria-label="Pause" title="Pause">
				<Icon name="pause" size={22} />
			</button>
		{:else}
			<button type="button" class="transport-button main" onclick={() => party.play().catch(showFailed)} disabled={!current} aria-label="Play" title="Play">
				<Icon name="play" size={22} />
			</button>
		{/if}
		<button type="button" class="transport-button next" onclick={next} disabled={!current} title="Skip to the next song">
			<Icon name="next" size={18} />Next
		</button>
	</div>
</section>

<style>
	.now-playing {
		display: flex;
		flex-direction: column;
		gap: var(--sp-4);
		background: var(--surface-now), var(--s1);
		border: var(--card-edge-strong);
		border-radius: var(--r-xl);
		box-shadow: var(--shadow-card);
		padding: var(--sp-4);
	}
	.song {
		display: flex;
		align-items: center;
		gap: var(--sp-3);
		min-width: 0;
	}
	.art {
		flex: none;
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: var(--r-lg);
		font-size: var(--fs-xl);
		font-weight: 800;
		color: var(--on-tile);
		text-shadow: var(--shadow-tile-text);
	}
	.details {
		flex: 1;
		min-width: 0;
	}
	.label {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		font-weight: 600;
		letter-spacing: 0.2em;
		text-transform: uppercase;
		white-space: nowrap;
		color: var(--accent);
	}
	.label .eq {
		height: 11px;
	}
	.eq.is-still i {
		animation: none;
	}
	.title-line {
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		margin-top: var(--sp-1);
		min-width: 0;
	}
	.title {
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: var(--fs-lg);
		letter-spacing: -0.01em;
	}
	.subtitle {
		margin-top: var(--sp-1);
		font-size: var(--fs-sm);
		color: var(--ink-mid);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.tags {
		display: flex;
		margin-top: var(--sp-1);
	}
	.tags :global(.tag) {
		display: block;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.idle {
		color: var(--ink-mid);
	}
	.transport {
		display: flex;
		align-items: center;
		gap: var(--sp-3);
	}
	.transport-button {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		display: grid;
		place-items: center;
		width: var(--tap);
		height: var(--tap);
		border-radius: 50%;
		background: var(--s2);
		border: 1px solid var(--line-soft);
		color: var(--ink-hi);
		transition: background var(--t-fast) var(--ease);
	}
	/* A theme's gel highlight across the top, under the icon: an ellipse, so it reads as a
	   reflection on the round buttons rather than a cap. */
	.transport-button::before {
		content: '';
		position: absolute;
		inset: 2px 15% 60%;
		z-index: -1;
		border-radius: 50%;
		background: var(--gloss);
		pointer-events: none;
	}
	@media (hover: hover) {
		.transport-button:hover {
			background: var(--s3);
		}
	}
	.transport-button:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.transport-button.main {
		width: 56px;
		height: 56px;
		background: var(--accent);
		color: var(--accent-ink);
		border: none;
	}
	@media (hover: hover) {
		.transport-button.main:hover {
			background: var(--accent);
		}
		.transport-button.main:not(:active):hover {
			filter: brightness(1.07);
		}
	}
	/* Far from Play, so a thumb reaching for Pause can't skip someone's song. */
	.transport-button.next {
		margin-left: auto;
		width: auto;
		display: inline-flex;
		align-items: center;
		gap: var(--sp-2);
		padding: 0 var(--sp-4);
		border-radius: var(--r-pill);
		font-size: var(--fs-sm);
		font-weight: 700;
	}
</style>
