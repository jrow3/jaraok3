<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';

	let {
		icon,
		title,
		body
	}: { icon: IconName; title: string; body?: string } = $props();
</script>

<div class="empty-state">
	<span class="icon"><Icon name={icon} size={22} /></span>
	<p class="title">{title}</p>
	{#if body}<p class="body">{body}</p>{/if}
</div>

<style>
	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--sp-2);
		padding: var(--sp-6) var(--sp-4);
		text-align: center;
		background: var(--s1);
		border: 1px dashed var(--line);
		border-radius: var(--r-lg);
	}
	.icon {
		display: grid;
		place-items: center;
		width: var(--tap);
		height: var(--tap);
		border-radius: 50%;
		background: var(--s2);
		color: var(--ink-low);
	}
	.title {
		margin: 0;
		font-size: var(--fs-md);
		font-weight: 700;
		color: var(--ink-hi);
	}
	.body {
		margin: 0;
		font-size: var(--fs-sm);
		color: var(--ink-mid);
	}
</style>
