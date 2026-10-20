<script lang="ts">
	import { fromFraction, stepByKey, toFraction, type SliderRange } from './sliderMath';

	let {
		value,
		range,
		defaultValue,
		label,
		unit = '',
		onchange
	}: {
		value: number;
		range: SliderRange;
		defaultValue: number;
		label: string;
		unit?: string;
		onchange: (value: number) => void;
	} = $props();

	// Relative, and slower than the track: touching never jumps the level, and on a
	// phone a finger can land on one value instead of skipping past it.
	const FULL_SWEEP_PX = 360;

	let drag = $state<{ startY: number; startFraction: number } | null>(null);
	const isDragging = $derived(drag !== null);
	const fraction = $derived(toFraction(range, value));

	function onpointerdown(event: PointerEvent) {
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
		drag = { startY: event.clientY, startFraction: fraction };
	}

	function onpointermove(event: PointerEvent) {
		if (!drag) return;
		const next = fromFraction(range, drag.startFraction + (drag.startY - event.clientY) / FULL_SWEEP_PX);
		if (next !== value) onchange(next);
	}

	function onkeydown(event: KeyboardEvent) {
		const next = stepByKey(range, value, event.key);
		if (next === null) return;
		event.preventDefault();
		if (next !== value) onchange(next);
	}
</script>

<div class="fader">
	<div
		class="track"
		class:dragging={isDragging}
		role="slider"
		tabindex="0"
		aria-label={label}
		aria-orientation="vertical"
		aria-valuemin={range.min}
		aria-valuemax={range.max}
		aria-valuenow={value}
		aria-valuetext="{value} {unit}"
		style:--fill="{fraction * 100}%"
		{onpointerdown}
		{onpointermove}
		onpointerup={() => (drag = null)}
		onpointercancel={() => (drag = null)}
		ondblclick={() => onchange(defaultValue)}
		{onkeydown}
	>
		<span class="rail"></span>
		<span class="cap"></span>
	</div>
	<span class="readout">{value}{unit}</span>
	<span class="name">{label}</span>
</div>

<style>
	.fader {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--sp-2);
		width: var(--tap);
	}
	.track {
		position: relative;
		width: var(--tap);
		height: 180px;
		touch-action: none;
		cursor: ns-resize;
		border-radius: var(--r-md);
	}
	.rail {
		position: absolute;
		left: 50%;
		top: 0;
		bottom: 0;
		width: 6px;
		transform: translateX(-50%);
		border-radius: var(--r-pill);
		background: linear-gradient(to top, var(--accent) var(--fill), var(--s3) var(--fill));
	}
	.cap {
		position: absolute;
		left: 4px;
		right: 4px;
		height: 16px;
		bottom: calc(var(--fill) - 8px);
		border-radius: var(--r-sm);
		background: var(--ink-hi);
		box-shadow: 0 1px 3px rgb(0 0 0 / 0.4);
	}
	.dragging .cap {
		background: var(--accent);
	}
	.readout {
		font-family: var(--font-mono);
		font-size: var(--fs-xs);
		color: var(--ink-hi);
		font-variant-numeric: tabular-nums;
	}
	.name {
		font-size: var(--fs-xs);
		color: var(--ink-low);
		text-align: center;
	}
</style>
