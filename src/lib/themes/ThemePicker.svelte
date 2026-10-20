<script lang="ts">
	import { tick } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import PhoneThemeCards from './PhoneThemeCards.svelte';

	const titleId = $props.id();
	let isOpen = $state(false);
	let dialog = $state<HTMLDivElement>();
	let trigger: HTMLButtonElement;

	async function open(event: MouseEvent) {
		trigger = event.currentTarget as HTMLButtonElement;
		isOpen = true;
		await tick();
		dialog!.querySelector('button')!.focus();
	}

	function close() {
		isOpen = false;
		trigger.focus();
	}

	// aria-modal hides the page from screen readers, but Tab would still walk into it.
	function keepFocusInside(event: KeyboardEvent) {
		const buttons = dialog!.querySelectorAll('button');
		const first = buttons[0];
		const last = buttons[buttons.length - 1];
		const edge = event.shiftKey ? first : last;
		if (document.activeElement !== edge && document.activeElement !== dialog) return;
		event.preventDefault();
		(event.shiftKey ? last : first).focus();
	}

	function onkeydown(event: KeyboardEvent) {
		if (!isOpen) return;
		if (event.key === 'Escape') close();
		if (event.key === 'Tab') keepFocusInside(event);
	}
</script>

<svelte:window {onkeydown} />

<Button iconOnly icon="palette" label="Theme for this phone" aria-expanded={isOpen} onclick={open} />
{#if isOpen}
	<button type="button" class="scrim" tabindex="-1" aria-label="Close" onclick={close}></button>
	<div class="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} tabindex="-1" bind:this={dialog}>
		<div class="sheet-head">
			<h2 class="eyebrow" id={titleId}>Theme for this phone</h2>
			<Button iconOnly icon="x" label="Close" onclick={close} />
		</div>
		<PhoneThemeCards />
	</div>
{/if}

<style>
	.scrim {
		position: fixed;
		inset: 0;
		z-index: 40;
		border: none;
		background: var(--scrim);
	}
	.sheet {
		position: fixed;
		z-index: 41;
		left: 50%;
		bottom: 0;
		transform: translateX(-50%);
		box-sizing: border-box;
		width: 100%;
		max-width: 480px;
		max-height: 85vh;
		overflow-y: auto;
		overscroll-behavior: contain;
		padding: var(--sp-3) var(--sp-4) calc(var(--sp-6) + env(safe-area-inset-bottom));
		background: var(--bg-1);
		border: var(--card-edge-strong);
		border-bottom: none;
		border-radius: var(--r-xl) var(--r-xl) 0 0;
		box-shadow: var(--shadow-stage);
		animation: sheet-up var(--t-slow) var(--ease);
	}
	@keyframes sheet-up {
		from {
			transform: translateX(-50%) translateY(24px);
			opacity: 0;
		}
	}
	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--sp-3);
	}
</style>
