<script lang="ts">
	let { spot, isPlaying }: { spot: 'stage' | 'rail' | 'spotlight'; isPlaying: boolean } = $props();
</script>

<span class={['meters', `is-${spot}`, !isPlaying && 'is-resting']} aria-hidden="true">
	<span class="meter"><span class="shutter"></span></span>
	<span class="meter"><span class="shutter"></span></span>
</span>

<style>
	/* A stereo pair of LED ladders. The level is a shutter over the lit ladder, so it moves
	   by transform alone. The levels are made up: the song's sound never passes through
	   the page, so nothing can measure it. */
	.meters {
		display: none;
	}
	:global(:root[data-theme='onair']) .meters {
		display: flex;
	}
	.meter {
		position: relative;
		flex: none;
		overflow: hidden;
		background: linear-gradient(to top, var(--good) 0 55%, var(--accent) 55% 80%, var(--bad) 80%);
		mask-image: repeating-linear-gradient(to top, currentColor 0 72%, transparent 72% 100%);
	}
	.shutter {
		position: absolute;
		inset: 0;
		background: var(--bg-1);
		transform-origin: top;
		transform: scaleY(0.45);
		animation: level 1.9s linear infinite;
	}
	.meter + .meter .shutter {
		animation-duration: 1.6s;
		animation-delay: -0.7s;
	}
	/* Dark rather than frozen, so a paused song reads as silence, not as a stuck level. */
	.is-resting .shutter {
		animation: none;
		transform: none;
	}
	@keyframes level {
		0%,
		100% {
			transform: scaleY(0.45);
		}
		10% {
			transform: scaleY(0.2);
		}
		22% {
			transform: scaleY(0.4);
		}
		34% {
			transform: scaleY(0.12);
		}
		46% {
			transform: scaleY(0.35);
		}
		58% {
			transform: scaleY(0.08);
		}
		70% {
			transform: scaleY(0.3);
		}
		84% {
			transform: scaleY(0.18);
		}
	}
	/* Over a song the pair stands in the right band under the lamp, clear of the singer and the
	   lineup in the left band and of the notices below. */
	.is-stage {
		position: absolute;
		top: 32vh;
		bottom: 44vh;
		right: calc(var(--tv-safe-x) + 1vh);
		gap: 2vh;
	}
	.is-stage .meter {
		width: 2vh;
		mask-size: 100% 1.6vh;
	}
	.is-rail {
		position: absolute;
		right: 0;
		bottom: 0;
		height: min(100%, 12vh);
		gap: 1vh;
	}
	.is-rail .meter {
		width: 1.6vh;
		mask-size: 100% 1.2vh;
	}
	.is-spotlight {
		flex: none;
		gap: 4px;
		height: 32px;
		margin-left: auto;
	}
	.is-spotlight .meter {
		width: 7px;
		mask-size: 100% 5px;
	}
</style>
