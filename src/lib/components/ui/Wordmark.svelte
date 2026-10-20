<script lang="ts">
	import { page } from '$app/state';
	import Icon from './Icon.svelte';
	import WordmarkFlourish from '$lib/themes/flourishes/WordmarkFlourish.svelte';
	import { wordmarkLetters } from './wordmark';

	let { size = 'sm' }: { size?: 'sm' | 'tv' } = $props();

	// One span per letter, so a theme can tilt and bounce them one by one; a theme's
	// --wm-wobble scales the tilts (0 leaves them upright).
	const name = $derived(page.data.features.appName);
	const LETTERS = $derived(wordmarkLetters(name));
</script>

<span class={['wordmark', `is-${size}`]} role="img" aria-label={name}>
	<span class="tile"><Icon name="mic" size={size === 'tv' ? 42 : 16} /></span>
	<!-- No whitespace between the letters, or it would show as spaces. -->
	<span class="letters"><span class="word">{#each LETTERS as { letter, paint, tilt }, index (index)}<span class={paint} style:--tilt={tilt} style:--index={index}>{letter}</span>{/each}</span><WordmarkFlourish {size} /></span>
</span>

<style>
	.wordmark {
		flex: none;
		display: flex;
		align-items: center;
		gap: var(--sp-2);
		white-space: nowrap;
	}
	.tile {
		flex: none;
		display: var(--wm-tile);
		place-items: center;
		width: 27px;
		height: 27px;
		border-radius: var(--r-logo);
		background: var(--brand-gradient);
		color: var(--on-brand);
	}
	.letters {
		position: relative;
		font-family: var(--wm-font);
		font-size: var(--wm-size);
		font-weight: var(--wm-weight);
		font-stretch: var(--wm-stretch);
		letter-spacing: var(--wm-tracking);
	}
	/* The shadow is on the letters alone: on .letters it would reach the flourish too, and
	   any moving piece would make the browser re-filter the whole wordmark every frame. */
	.word {
		filter: var(--wm-effect);
	}
	/* Painted rather than colored, so a theme can fill the letters with a gradient. */
	.word span {
		display: var(--wm-letter-display);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		rotate: calc(var(--tilt) * var(--wm-wobble));
		animation: var(--wm-letter-motion);
		animation-delay: calc(var(--index) * 70ms);
	}
	/* Global, so a theme's --wm-letter-motion can name it. Letters drop in, squash and settle. */
	@keyframes -global-wordmark-bounce {
		0% {
			opacity: 0;
			transform: translateY(-0.7em) scale(0.8, 1.2);
		}
		45% {
			opacity: 1;
			transform: translateY(0) scale(1.18, 0.82);
		}
		70% {
			transform: translateY(-0.1em) scale(0.95, 1.05);
		}
		100% {
			transform: none;
		}
	}
	.j {
		background-image: var(--wm-j);
	}
	.body {
		background-image: var(--wm-body);
	}
	.three {
		background-image: var(--wm-3);
	}
	.is-tv {
		gap: var(--tv-gap);
	}
	.is-tv .tile {
		width: 8vh;
		height: 8vh;
		border-radius: var(--tv-radius);
	}
	.is-tv .letters {
		font-size: var(--tv-fs-hero);
	}
</style>
