<script lang="ts">
	let { size }: { size: 'sm' | 'tv' } = $props();
</script>

<!-- Roller-rink signage: four stripes run under the word and turn up past the 3. -->
<span class={['stripes', `is-${size}`]} aria-hidden="true"><i></i><i></i><i></i><i></i></span>

<style>
	.stripes {
		display: none;
		position: absolute;
		left: -0.1em;
		top: 0;
	}
	:global(:root[data-theme='disco']) .stripes {
		display: block;
	}
	/* Each stripe is a box that paints only its bottom and right edges, so the turn is a
	   true arc and nothing paints behind the letters. */
	.stripes i {
		position: absolute;
		left: 0;
		top: 0;
		border-style: solid;
		border-top-width: 0;
		border-left-width: 0;
	}
	.stripes i:nth-child(1) {
		border-color: var(--stripe-1);
	}
	.stripes i:nth-child(2) {
		border-color: var(--stripe-2);
	}
	.stripes i:nth-child(3) {
		border-color: var(--stripe-3);
	}
	.stripes i:nth-child(4) {
		border-color: var(--stripe-4);
	}
	/* Thinner and closer than the brand's, so the turn leaves the host's "Host" pill some room. */
	.is-sm {
		right: -0.52em;
		bottom: -0.44em;
	}
	.is-sm i {
		border-right-width: 0.08em;
		border-bottom-width: 0.08em;
	}
	.is-sm i:nth-child(1) {
		right: 0.3em;
		bottom: 0.3em;
		border-bottom-right-radius: 0.2em;
	}
	.is-sm i:nth-child(2) {
		right: 0.2em;
		bottom: 0.2em;
		border-bottom-right-radius: 0.3em;
	}
	.is-sm i:nth-child(3) {
		right: 0.1em;
		bottom: 0.1em;
		border-bottom-right-radius: 0.4em;
	}
	.is-sm i:nth-child(4) {
		right: 0;
		bottom: 0;
		border-bottom-right-radius: 0.5em;
	}
	/* The TV's stripes are thinner, so the band stays in the gap above the tagline. */
	.is-tv {
		right: -0.36em;
		bottom: -0.2em;
	}
	.is-tv i {
		border-right-width: 0.045em;
		border-bottom-width: 0.045em;
	}
	.is-tv i:nth-child(1) {
		right: 0.18em;
		bottom: 0.18em;
		border-bottom-right-radius: 0.12em;
	}
	.is-tv i:nth-child(2) {
		right: 0.12em;
		bottom: 0.12em;
		border-bottom-right-radius: 0.18em;
	}
	.is-tv i:nth-child(3) {
		right: 0.06em;
		bottom: 0.06em;
		border-bottom-right-radius: 0.24em;
	}
	.is-tv i:nth-child(4) {
		right: 0;
		bottom: 0;
		border-bottom-right-radius: 0.3em;
	}
</style>
