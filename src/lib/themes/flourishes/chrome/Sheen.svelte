<script lang="ts">
	import { page } from '$app/state';
</script>

<!-- A slow specular glint sweeps the chrome letters now and then. -->
<span class="sheen" aria-hidden="true"><span class="window"><span class="glint">{page.data.features.appName}</span></span></span>

<style>
	/* The glint is a white copy of the letters seen through a slanted window. The window
	   slides across while the copy slides back by the same amount, so the copy stays on the
	   letters and only transforms move. */
	.sheen {
		display: none;
		position: absolute;
		inset: 0;
		overflow: hidden;
	}
	:global(:root[data-theme='chrome']) .sheen {
		display: block;
	}
	.window {
		position: absolute;
		top: 0;
		bottom: 0;
		left: 0;
		width: 0.45em;
		overflow: hidden;
		transform-origin: 0 0;
		transform: translateX(-1em) skewX(-18deg);
		animation: sweep 7s cubic-bezier(0.6, 0, 0.2, 1) infinite;
	}
	.glint {
		position: absolute;
		top: 0;
		left: 0;
		white-space: nowrap;
		color: var(--s2);
		opacity: 0.85;
		transform-origin: 0 0;
		transform: skewX(18deg) translateX(1em);
		animation: sweep-back 7s cubic-bezier(0.6, 0, 0.2, 1) infinite;
	}
	@keyframes sweep {
		0%,
		60% {
			transform: translateX(-1em) skewX(-18deg);
		}
		100% {
			transform: translateX(7em) skewX(-18deg);
		}
	}
	@keyframes sweep-back {
		0%,
		60% {
			transform: skewX(18deg) translateX(1em);
		}
		100% {
			transform: skewX(18deg) translateX(-7em);
		}
	}
</style>
