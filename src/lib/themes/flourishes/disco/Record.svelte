<script lang="ts">
	let { spot, isPlaying = true }: { spot: 'backdrop' | 'name' | 'rail' | 'spotlight'; isPlaying?: boolean } = $props();
</script>

<!-- Things that play spin at 33⅓ like a label; the grooves' glare stays put. -->
<span class={['record', `is-${spot}`, !isPlaying && 'is-resting']} aria-hidden="true"><span class="label"></span></span>

<style>
	.record {
		display: none;
		position: relative;
		flex: none;
		aspect-ratio: 1;
		border-radius: 50%;
		background:
			conic-gradient(from 30deg, transparent 0 10%, var(--s3) 14%, transparent 20% 60%, var(--s3) 64%, transparent 70%),
			repeating-radial-gradient(circle, var(--bg-0) 0 1.5px, var(--bg-1) 1.5px 3px);
	}
	:global(:root[data-theme='disco']) .record {
		display: block;
	}
	.label {
		position: absolute;
		inset: 31%;
		border-radius: 50%;
		background:
			radial-gradient(circle, var(--bg-0) 0 6%, transparent 7%),
			linear-gradient(var(--stripe-2) 0 25%, var(--stripe-3) 25% 50%, var(--stripe-4) 50% 75%, var(--line) 75%);
		animation: spin 1.8s linear infinite;
	}
	.is-resting .label {
		animation-play-state: paused;
	}
	@keyframes spin {
		to {
			transform: rotate(1turn);
		}
	}
	/* Cropped by the corner so it reads as a record left on the rug, not a second logo. */
	.is-backdrop {
		position: absolute;
		left: -12vh;
		bottom: -14vh;
		width: 46vh;
	}
	/* The stage behind the name is as dark as the grooves, so a rim keeps the small record's
	   edge readable. */
	.is-name {
		width: 1.1em;
		box-shadow: 0 0 0 0.06em var(--ink-low);
	}
	.is-rail {
		position: absolute;
		left: 0;
		bottom: 0;
		height: min(100%, 11vh);
	}
	.is-spotlight {
		width: 44px;
		margin-left: auto;
	}
</style>
