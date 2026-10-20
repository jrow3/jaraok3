<script lang="ts">
	let { spot }: { spot: 'qr' | 'spotlight' } = $props();
</script>

<!-- The frosted plates are screwed into a chrome bezel. -->
<span class={['screws', `is-${spot}`]} aria-hidden="true"><i></i><i></i><i></i><i></i></span>

<style>
	.screws {
		display: none;
		position: absolute;
		inset: 0;
	}
	:global(:root[data-theme='chrome']) .screws {
		display: block;
	}
	.screws i {
		position: absolute;
		border-radius: 50%;
		background:
			linear-gradient(45deg, transparent 44%, var(--line) 44% 56%, transparent 56%),
			radial-gradient(circle at 35% 35%, var(--s2), var(--line) 70%);
		box-shadow: 0 1px 0 var(--line-soft);
	}
	.screws i:nth-child(1) {
		left: 0;
		top: 0;
	}
	.screws i:nth-child(2) {
		right: 0;
		top: 0;
	}
	.screws i:nth-child(3) {
		left: 0;
		bottom: 0;
	}
	.screws i:nth-child(4) {
		right: 0;
		bottom: 0;
	}
	.is-qr {
		inset: 0.8vh;
	}
	.is-qr i {
		width: 1.1vh;
		height: 1.1vh;
	}
	/* Clear of the card's rounded corners. */
	.is-spotlight {
		inset: 7px;
	}
	.is-spotlight i {
		width: 7px;
		height: 7px;
	}
</style>
