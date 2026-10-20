<script lang="ts">
	let {
		checked,
		onchange,
		label
	}: { checked: boolean; onchange: (checked: boolean) => void; label: string } = $props();
</script>

<button
	type="button"
	class="switch"
	class:on={checked}
	role="switch"
	aria-checked={checked}
	aria-label={label}
	onclick={() => onchange(!checked)}
></button>

<style>
	.switch {
		flex: none;
		width: 40px;
		height: 23px;
		border-radius: var(--r-pill);
		background: var(--s3);
		border: none;
		position: relative;
		transition: background var(--t-base) var(--ease);
	}
	/* The switch stays 40×23; this invisible box makes the tap target 44px square. */
	.switch::before {
		content: '';
		position: absolute;
		inset: calc((var(--tap) - 23px) / -2) calc((var(--tap) - 40px) / -2);
	}
	.switch::after {
		content: '';
		position: absolute;
		top: 2.5px;
		left: 2.5px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: var(--on-tile);
		transition: transform var(--t-base) var(--ease);
	}
	.on {
		background: var(--switch-on);
	}
	.on::after {
		transform: translateX(17px);
	}
</style>
