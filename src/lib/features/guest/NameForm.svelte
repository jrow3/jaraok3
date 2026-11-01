<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';

	let {
		value = $bindable(''),
		isFirstTime,
		onsave,
		oncancel
	}: {
		value?: string;
		isFirstTime: boolean;
		onsave: () => void;
		/** Offered only when there is a saved name to go back to. */
		oncancel?: () => void;
	} = $props();
</script>

<!-- `gate` is the class the screenshot script waits for. -->
<section class="gate">
	<h1 class="headline">{isFirstTime ? "What's your name?" : 'Change your name'}</h1>
	<form onsubmit={(event) => (event.preventDefault(), onsave())}>
		<input class="input" bind:value placeholder="Your name" autocomplete="off" maxlength="60" />
		<Button type="submit" disabled={!value.trim()}>{isFirstTime ? "Let's go" : 'Save'}</Button>
		{#if oncancel}<Button variant="secondary" onclick={oncancel}>Cancel</Button>{/if}
	</form>
</section>

<style>
	.gate {
		padding-top: var(--sp-8);
	}
	h1 {
		letter-spacing: -0.02em;
		margin: 0 0 var(--sp-4);
	}
	form {
		display: flex;
		flex-direction: column;
		gap: var(--sp-3);
	}
</style>
