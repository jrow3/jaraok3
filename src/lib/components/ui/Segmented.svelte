<script lang="ts" generics="T extends string">
	import Icon, { type IconName } from './Icon.svelte';

	let {
		options,
		value,
		onchange,
		label
	}: {
		options: { value: T; label: string; icon?: IconName; tone?: 'good' | 'warn' | 'bad' }[];
		value: T;
		onchange: (value: T) => void;
		label: string;
	} = $props();
</script>

<div class="segmented" role="group" aria-label={label}>
	{#each options as option (option.value)}
		{@const isActive = option.value === value}
		<button
			type="button"
			class={[isActive && 'active', isActive && option.tone && `tone-${option.tone}`]}
			aria-pressed={isActive}
			onclick={() => onchange(option.value)}
		>
			{#if option.icon}<Icon name={option.icon} size={13} />{/if}
			{option.label}
		</button>
	{/each}
</div>

<style>
	.segmented {
		display: flex;
		gap: var(--sp-1);
		background: var(--s1);
		border-radius: var(--r-md);
		padding: var(--sp-1);
	}
	button {
		flex: 1;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--sp-2);
		min-height: var(--tap-sm);
		padding: 0 var(--sp-3);
		background: transparent;
		border: none;
		border-radius: var(--r-sm);
		color: var(--ink-mid);
		font-size: var(--fs-sm);
		font-weight: 600;
		transition: background var(--t-base) var(--ease), color var(--t-base) var(--ease);
	}
	.active {
		background: var(--accent);
		color: var(--accent-ink);
	}
	.tone-good {
		background: var(--good);
		color: var(--good-ink);
	}
	.tone-warn {
		background: var(--warn);
		color: var(--warn-ink);
	}
	.tone-bad {
		background: var(--bad);
		color: var(--bad-ink);
	}
</style>
