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

	// Dragging this far up or down sweeps the whole range: fine enough to set a value on a phone.
	const FULL_SWEEP_PX = 200;
	const SWEEP_DEGREES = 270;

	let drag: { startY: number; startFraction: number } | null = null;
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

<div class="knob">
	<div
		class="dial"
		role="slider"
		tabindex="0"
		aria-label={label}
		aria-valuemin={range.min}
		aria-valuemax={range.max}
		aria-valuenow={value}
		aria-valuetext="{value} {unit}"
		style:--angle="{fraction * SWEEP_DEGREES - SWEEP_DEGREES / 2}deg"
		style:--sweep="{fraction * SWEEP_DEGREES}deg"
		{onpointerdown}
		{onpointermove}
		onpointerup={() => (drag = null)}
		onpointercancel={() => (drag = null)}
		ondblclick={() => onchange(defaultValue)}
		{onkeydown}
	>
		<span class="pointer"></span>
	</div>
	<span class="readout">{value}{unit}</span>
	<span class="name">{label}</span>
</div>

<style>
	.knob {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--sp-1);
		min-width: 64px;
	}
	.dial {
		position: relative;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		touch-action: none;
		cursor: ns-resize;
		background:
			radial-gradient(circle, var(--s2) 58%, transparent 60%),
			conic-gradient(from -135deg, var(--accent) var(--sweep), var(--s3) var(--sweep) 270deg, transparent 270deg);
	}
	.pointer {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 3px;
		height: 16px;
		border-radius: var(--r-pill);
		background: var(--ink-hi);
		transform-origin: 50% 100%;
		transform: translate(-50%, -100%) rotate(var(--angle));
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
