<script lang="ts">
	import { page } from '$app/state';
	import type { Party } from '$lib/party.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Wordmark from '$lib/components/ui/Wordmark.svelte';
	import { POWER_LABEL, powerLook } from './powerButton';
	import { showFailed } from './showFailed';

	let { party }: { party: Party } = $props();

	let isConfirmingOff = $state(false);
	let confirmTimer: ReturnType<typeof setTimeout> | undefined;
	let look = $derived(powerLook(party.system, isConfirmingOff));

	// Turning off kills the TV and sound mid-party, so it takes a second tap.
	function onPowerTap() {
		const system = party.system;
		if (!system) return;
		if (system.isOn && !isConfirmingOff) {
			isConfirmingOff = true;
			confirmTimer = setTimeout(() => (isConfirmingOff = false), 4000);
			return;
		}
		clearTimeout(confirmTimer);
		isConfirmingOff = false;
		party.setPower(!system.isOn).catch(showFailed);
	}
</script>

<div class="head">
	<Wordmark />
	<span class="mode">Host</span>
	<!-- Only an install with the TV kiosk (KIOSK=on) can turn the TV on or off from here. -->
	{#if page.data.features.isKioskOn}
	<button
		type="button"
		class={[
			'power',
			look === 'on' && 'is-on',
			look === 'starting' && 'is-starting',
			look === 'confirming' && 'is-confirming'
		]}
		onclick={onPowerTap}
		disabled={look === 'unknown'}
		aria-pressed={party.system?.isOn ?? false}
		title="Turns the TV and sound on or off"
	>
		{#if look === 'starting'}<span class="spin" aria-hidden="true"></span>{:else}<Icon name="power" size={15} />{/if}
		{POWER_LABEL[look]}
	</button>
	{/if}
</div>

<style>
	.head {
		display: flex;
		align-items: center;
		gap: var(--sp-3);
		margin-bottom: var(--sp-4);
	}
	.mode {
		font-size: var(--fs-xs);
		font-weight: 600;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: var(--ink-low);
		border: 1px solid var(--line-soft);
		border-radius: var(--r-pill);
		padding: var(--sp-1) var(--sp-2);
	}
	.power {
		margin-left: auto;
		display: inline-flex;
		align-items: center;
		gap: var(--sp-2);
		padding: var(--sp-2) var(--sp-4);
		white-space: nowrap;
		border-radius: var(--r-pill);
		border: 1px solid var(--line);
		background: var(--s2);
		color: var(--ink-mid);
		font: inherit;
		font-size: var(--fs-sm);
		font-weight: 700;
		cursor: pointer;
		transition:
			background var(--t-base) var(--ease),
			color var(--t-base) var(--ease);
	}
	.power:disabled {
		opacity: 0.6;
		cursor: default;
	}
	.is-on {
		background: var(--good);
		border-color: var(--good);
		color: var(--good-ink);
	}
	.is-starting {
		background: var(--warn-a14);
		border-color: var(--warn-a35);
		color: var(--warn);
	}
	.is-starting .spin {
		width: 13px;
		height: 13px;
		border-color: var(--warn-a35);
		border-top-color: var(--warn);
	}
	.is-confirming {
		background: var(--bad);
		border-color: var(--bad);
		color: var(--bad-ink);
	}
	@media (max-width: 359px) {
		.mode {
			display: none;
		}
	}
</style>
