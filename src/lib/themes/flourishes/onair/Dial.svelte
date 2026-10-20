<!-- The brand's lockup: a radio tuning scale under the name, its amber needle drifting. -->
<span class="dial" aria-hidden="true"><span class="scale"></span><span class="needle"></span></span>

<style>
	.dial {
		display: none;
		position: absolute;
		left: 0;
		right: 0;
		top: 92%;
		height: 0.2em;
		color: var(--ink-mid);
	}
	:global(:root[data-theme='onair']) .dial {
		display: block;
	}
	.scale {
		position: absolute;
		inset: 0;
		opacity: 0.45;
		background:
			repeating-linear-gradient(90deg, currentColor 0 1px, transparent 1px 0.25em) bottom / 100% 55% no-repeat,
			repeating-linear-gradient(90deg, currentColor 0 2px, transparent 2px 1.25em) bottom / 100% 100% no-repeat;
	}
	.needle {
		position: absolute;
		right: 0.36em;
		bottom: -0.08em;
		width: 0.07em;
		height: 0.34em;
		border-radius: 1px;
		background: var(--accent);
		box-shadow: 0 0 0.2em var(--accent);
		animation: tune 14s ease-in-out infinite alternate;
	}
	@keyframes tune {
		0%,
		20% {
			transform: none;
		}
		100% {
			transform: translateX(-2.6em);
		}
	}
</style>
