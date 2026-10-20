<script lang="ts">
	let { size }: { size: 'sm' | 'tv' } = $props();
</script>

<span class={['sticker', `is-${size}`]} aria-hidden="true">カラオケ</span>

<style>
	/* The brand's secondary mark: a song-code sticker slapped on the wordmark's corner. */
	.sticker {
		display: none;
		position: absolute;
		right: -1em;
		top: -1.2em;
		padding: 0.18em 0.5em 0.22em;
		border: 0.12em solid var(--sticker-edge);
		border-radius: 0.5em;
		background: var(--sticker);
		color: var(--sticker-ink);
		box-shadow: 0 0.14em 0 var(--line);
		font-family: var(--font-display);
		font-weight: 400;
		letter-spacing: 0.06em;
		line-height: 1;
		white-space: nowrap;
		rotate: 8deg;
	}
	:global(:root[data-theme='tokyo']) .sticker {
		display: block;
	}
	/* On a phone it jangles once as the page opens; the TV's jangles every few seconds. */
	/* A step higher than the TV's, so its edge clears the k in the phone's smaller mark. */
	.is-sm {
		top: -1.5em;
		font-size: max(10px, 0.45em);
		animation: jangle 3s ease-in-out;
	}
	.is-tv {
		font-size: max(var(--tv-fs-sm), 0.3em);
		animation: jangle 5s ease-in-out infinite;
	}
	@keyframes jangle {
		0%,
		70%,
		100% {
			transform: none;
		}
		74% {
			transform: rotate(8deg);
		}
		78% {
			transform: rotate(-7deg);
		}
		82% {
			transform: rotate(5deg);
		}
		86% {
			transform: rotate(-3deg);
		}
	}
</style>
