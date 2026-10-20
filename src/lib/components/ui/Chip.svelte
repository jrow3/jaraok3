<script lang="ts">
	import Icon, { type IconName } from './Icon.svelte';

	let {
		label,
		icon,
		trailingIcon,
		tone = 'accent',
		onclick,
		onremove,
		removeLabel
	}: {
		label: string;
		icon?: IconName;
		trailingIcon?: IconName;
		tone?: 'accent' | 'bad';
		onclick?: () => void;
		onremove?: () => void;
		removeLabel?: string;
	} = $props();
</script>

{#snippet content()}
	{#if icon}<Icon name={icon} size={13} />{/if}
	<span class="label">{label}</span>
	{#if trailingIcon}<Icon name={trailingIcon} size={11} />{/if}
{/snippet}

{#if onclick}
	<button type="button" class={['chip', tone === 'bad' && 'bad']} {onclick}>{@render content()}</button>
{:else}
	<span class={['chip', tone === 'bad' && 'bad', onremove && 'removable']}>
		{@render content()}
		{#if onremove}
			<button type="button" class="remove" onclick={onremove} aria-label={removeLabel ?? `Remove ${label}`}>
				<Icon name="x" size={12} />
			</button>
		{/if}
	</span>
{/if}

<style>
	.chip {
		max-width: 100%;
		min-width: 0;
		box-sizing: border-box;
	}
	.chip > :global(svg) {
		color: var(--chip-icon);
	}
	.label {
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.bad {
		background: var(--bad-a14);
		border-color: var(--bad-a30);
		color: var(--bad-soft);
	}
	.removable {
		padding-right: var(--sp-2);
	}
	.remove {
		position: relative;
		display: grid;
		place-items: center;
		background: none;
		border: none;
		color: inherit;
		opacity: 0.7;
		padding: 0;
		transition: opacity var(--t-fast) var(--ease);
	}
	/* The icon stays 12px; this invisible square makes the tap target 44px. */
	.remove::after {
		content: '';
		position: absolute;
		inset: calc((var(--tap) - 12px) / -2);
	}
	@media (hover: hover) {
		.remove:hover {
			opacity: 1;
		}
	}
</style>
