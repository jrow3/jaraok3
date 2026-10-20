<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { wordmarkLetters } from '$lib/components/ui/wordmark';
	import { THEMES, type ThemeId } from './themes';

	let { value, label, onchange }: { value: ThemeId; label: string; onchange: (id: ThemeId) => void } = $props();

	const letters = $derived(wordmarkLetters(page.data.features.appName));
</script>

<div class="theme-cards" role="group" aria-label={label}>
	{#each THEMES as theme (theme.id)}
		{@const isPicked = theme.id === value}
		<button type="button" class={['card', isPicked && 'is-picked']} aria-pressed={isPicked} onclick={() => onchange(theme.id)}>
			<span class="poster" style:background={theme.background} style:color={theme.ink}>
				<span class="mini" style:font-family={theme.wordmarkFont} style:font-weight={theme.wordmarkWeight}>{#each letters as { letter, paint }, index (index)}<span style:color={paint === 'j' ? theme.j : paint === 'three' ? theme.three : undefined}>{letter}</span>{/each}</span>
				{#if isPicked}<span class="check"><Icon name="check" size={14} /></span>{/if}
			</span>
			<span class="chips">
				{#each theme.swatches as color, index (index)}<i style:background={color}></i>{/each}
			</span>
			<span class="name">{theme.name}</span>
		</button>
	{/each}
</div>

<style>
	.theme-cards {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--sp-2);
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
		min-width: 0;
		padding: var(--sp-2);
		text-align: left;
		color: var(--ink-hi);
		background: var(--s1);
		border: var(--card-edge);
		border-radius: var(--r-lg);
		box-shadow: var(--shadow-card);
		transition: border-color var(--t-base) var(--ease);
	}
	.is-picked {
		border-color: var(--accent);
		box-shadow: var(--ring-selected);
	}
	.poster {
		position: relative;
		display: grid;
		place-items: center;
		height: 56px;
		border-radius: var(--r-md);
		border: 1px solid var(--line-soft);
	}
	/* Each card letters its name in its own theme's font, which the browser fetches only
	   once the cards render, even those scrolled out of view. */
	.mini {
		font-size: var(--fs-lg);
		letter-spacing: -0.02em;
	}
	/* Hung off the poster's corner, so wide lettering like On Air's never runs under it. */
	.check {
		position: absolute;
		top: calc(-1 * var(--sp-1));
		right: calc(-1 * var(--sp-1));
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background: var(--accent);
		color: var(--accent-ink);
	}
	.chips {
		display: flex;
		gap: var(--sp-1);
	}
	.chips i {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		border: 1px solid var(--line-soft);
	}
	.name {
		font-size: var(--fs-sm);
		font-weight: 700;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	@media (hover: hover) {
		.card:not(.is-picked):hover {
			border-color: var(--accent-a55);
		}
	}
</style>
