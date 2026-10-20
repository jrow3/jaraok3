<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Wordmark from '$lib/components/ui/Wordmark.svelte';

	let { message = '', onunlock }: { message?: string; onunlock: () => Promise<void> } = $props();

	let pin = $state('');
	let error = $state('');

	async function submit() {
		error = '';
		const response = await fetch('/api/login', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ pin })
		});
		if (!response.ok) {
			error = 'Wrong PIN';
			return;
		}
		pin = '';
		await onunlock();
	}
</script>

<section class="gate">
	<div class="gate-mark"><Wordmark /></div>
	<h1 class="headline">Host access</h1>
	{#if message}<p class="notice" role="status">{message}</p>{/if}
	<input
		class="input pin"
		type="password"
		bind:value={pin}
		onkeydown={(event) => event.key === 'Enter' && submit()}
		placeholder="PIN"
		autocomplete="off"
	/>
	<Button onclick={submit}>Unlock</Button>
	{#if error}<p class="error">{error}</p>{/if}
</section>

<style>
	.gate {
		max-width: 320px;
		margin: 72px auto 0;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: var(--sp-3);
	}
	.gate-mark {
		display: flex;
		justify-content: center;
		margin-bottom: var(--sp-2);
	}
	h1 {
		letter-spacing: -0.02em;
		margin: 0 0 var(--sp-2);
	}
	.pin {
		text-align: center;
		font-size: var(--fs-lg);
		letter-spacing: 0.3em;
	}
	.error {
		margin: 0;
		color: var(--bad);
		font-size: var(--fs-sm);
	}
	.notice {
		margin: 0;
		color: var(--warn);
		font-size: var(--fs-sm);
	}
</style>
