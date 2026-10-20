<script lang="ts">
	let { spot, isLit }: { spot: 'backdrop' | 'stage' | 'corner' | 'rail'; isLit: boolean } = $props();
</script>

<span class={['lamp', `is-${spot}`, isLit && 'is-lit']} aria-hidden="true"><span class="face">ON AIR</span></span>

<style>
	/* The lamp is the brand's red gradient with its white letters, so the contrast test
	   already holds it (--on-brand on --brand-gradient). */
	.lamp {
		display: none;
		border-radius: var(--r-sm);
		background: var(--bg-1);
		box-shadow: 0 0 0 0.12em var(--line);
		font-family: var(--font-mono);
		font-size: var(--tv-fs-sm);
		font-weight: 600;
		letter-spacing: 0.14em;
		line-height: 1.1;
	}
	:global(:root[data-theme='onair']) .lamp {
		display: block;
	}
	.face {
		display: block;
		padding: 0.3em 0.5em 0.3em 0.64em;
		border-radius: inherit;
		background: var(--brand-gradient);
		color: var(--on-brand);
		opacity: 0.3;
	}
	/* Lit, it warms up with one flicker, like a real bulb. */
	.is-lit .face {
		opacity: 1;
		box-shadow: 0 0 0.8em var(--bad-a40);
		animation: warm 1.2s steps(1, end) both;
	}
	@keyframes warm {
		0% {
			opacity: 0.3;
		}
		12% {
			opacity: 1;
		}
		18% {
			opacity: 0.55;
		}
		30%,
		100% {
			opacity: 1;
		}
	}
	.is-backdrop {
		position: absolute;
		top: var(--tv-safe-y);
		left: var(--tv-safe-x);
	}
	/* Over a song it stands in the right band beside the lyrics, under the join code, so its
	   words stack; the left band holds the singer and the lineup. */
	.is-stage {
		position: absolute;
		top: calc(var(--tv-safe-y) + var(--tv-qr-sm) + var(--tv-gap));
		right: var(--tv-safe-x);
		width: 3.4em;
		text-align: center;
	}
	/* Under 900px tall a 16:9 band is narrower than the lamp at the 28px text floor, and the
	   28px letters stand taller than the vh gap above the meters, so the lamp tightens rather
	   than reach the lyrics or the ladders. */
	@media (max-height: 899px) {
		.is-stage {
			width: min-content;
			letter-spacing: 0.04em;
		}
		.is-stage .face {
			padding: 0.12em 0.3em;
		}
	}
	/* A video fills the screen, so the lamp keeps to a corner like a broadcast's live bug, under
	   the join code: the bottom corner is the time left's and the notices'. */
	.is-corner {
		position: absolute;
		top: calc(var(--tv-safe-y) + var(--tv-qr-sm) + var(--tv-gap));
		right: var(--tv-safe-x);
		white-space: nowrap;
	}
	.is-rail {
		position: absolute;
		left: 0;
		bottom: 0;
	}
</style>
