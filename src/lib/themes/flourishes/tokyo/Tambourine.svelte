<script lang="ts">
	let { spot, isPlaying = true }: { spot: 'qr' | 'name' | 'rail' | 'spotlight'; isPlaying?: boolean } = $props();
</script>

<svg class={['tambourine', `is-${spot}`, !isPlaying && 'is-resting']} viewBox="0 0 100 100" aria-hidden="true">
	<circle class="head" cx="50" cy="50" r="40" />
	<circle class="ring" cx="50" cy="50" r="30" />
	<g class="jingles">
		<rect x="42" y="3" width="16" height="10" rx="3" />
		<rect x="42" y="87" width="16" height="10" rx="3" />
		<rect x="3" y="42" width="10" height="16" rx="3" />
		<rect x="87" y="42" width="10" height="16" rx="3" />
		<rect x="15" y="15" width="12" height="12" rx="3" transform="rotate(45 21 21)" />
		<rect x="73" y="73" width="12" height="12" rx="3" transform="rotate(45 79 79)" />
		<rect x="73" y="15" width="12" height="12" rx="3" transform="rotate(45 79 21)" />
		<rect x="15" y="73" width="12" height="12" rx="3" transform="rotate(45 21 79)" />
	</g>
</svg>

<style>
	/* Tokyo's motion: things sit still, then give a quick jangle. */
	.tambourine {
		display: none;
		flex: none;
		rotate: -3deg;
		animation: jangle 2.6s ease-in-out infinite;
	}
	:global(:root[data-theme='tokyo']) .tambourine {
		display: block;
	}
	.is-resting {
		animation-play-state: paused;
	}
	/* Hung on the join card's upper right corner, reaching in no further than the card's
	   padding: the code needs its quiet margin clear to scan, and the tagline sits above. */
	.is-qr {
		position: absolute;
		right: -8vh;
		top: 0;
		width: 10vh;
		height: 10vh;
	}
	.is-name {
		width: 1.1em;
		height: 1.1em;
	}
	.is-rail {
		position: absolute;
		left: 0;
		bottom: 0;
		height: min(100%, 9vh);
		aspect-ratio: 1;
	}
	.is-spotlight {
		width: 40px;
		height: 40px;
		margin-left: auto;
	}
	.head {
		fill: var(--sticker-edge);
		stroke: var(--sticker-ink);
		stroke-width: 6;
	}
	.ring {
		fill: none;
		stroke: var(--sticker);
		stroke-width: 8;
	}
	.jingles {
		fill: var(--sticker);
		stroke: var(--sticker-ink);
		stroke-width: 3;
	}
	@keyframes jangle {
		0%,
		70%,
		100% {
			transform: none;
		}
		74% {
			transform: rotate(10deg);
		}
		78% {
			transform: rotate(-5deg);
		}
		82% {
			transform: rotate(8deg);
		}
		86% {
			transform: rotate(-1deg);
		}
	}
</style>
