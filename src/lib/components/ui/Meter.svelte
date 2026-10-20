<script lang="ts">
	let {
		db,
		label,
		isReduction = false
	}: { db: number; label: string; isReduction?: boolean } = $props();

	const FLOOR_DB = -60;
	const REDUCTION_SPAN_DB = 20;
	const PEAK_HOLD_MS = 1200;

	const fraction = $derived(
		isReduction
			? Math.min(1, Math.max(0, db / REDUCTION_SPAN_DB))
			: Math.min(1, Math.max(0, (db - FLOOR_DB) / -FLOOR_DB))
	);

	let peak = $state(0);
	let peakAt = 0;
	$effect(() => {
		const now = performance.now();
		if (fraction >= peak || now - peakAt > PEAK_HOLD_MS) {
			peak = fraction;
			peakAt = now;
		}
	});
</script>

<div class="meter" class:reduction={isReduction} role="meter" aria-label={label} aria-valuemin={isReduction ? 0 : FLOOR_DB} aria-valuemax={isReduction ? REDUCTION_SPAN_DB : 0} aria-valuenow={Math.round(db)}>
	<span class="fill" style:transform="scaleY({fraction})"></span>
	{#if !isReduction}
		<span class="peak" class:clip={peak >= 0.99} style:bottom="{peak * 100}%"></span>
	{/if}
</div>

<style>
	.meter {
		position: relative;
		width: 8px;
		height: 180px;
		border-radius: var(--r-xs);
		background: var(--s3);
		overflow: hidden;
	}
	.fill {
		position: absolute;
		inset: 0;
		transform-origin: bottom;
		background: linear-gradient(to top, var(--good) 0 70%, var(--warn) 85%, var(--bad) 100%);
		transition: transform 60ms linear;
	}
	.reduction .fill {
		transform-origin: top;
		background: var(--warn);
	}
	.peak {
		position: absolute;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--ink-hi);
	}
	.peak.clip {
		background: var(--bad);
	}
</style>
