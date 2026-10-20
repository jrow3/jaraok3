<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Icon, { type IconName } from './Icon.svelte';

	type BaseProps = Omit<HTMLButtonAttributes, 'children'> & {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		/** md is `--tap` tall like today's `.btn-primary`; sm is `--tap-sm` like `.btn-ghost`, so a swap for `.btn-ghost` uses `size="sm"`. */
		size?: 'md' | 'sm';
		icon?: IconName;
		loading?: boolean;
		children?: Snippet;
	};
	type Props = BaseProps &
		({ iconOnly: true; icon: IconName; label: string } | { iconOnly?: false; label?: undefined });

	let {
		variant = 'primary',
		size = 'md',
		icon,
		iconOnly = false,
		label,
		loading = false,
		disabled = false,
		type = 'button',
		class: className = '',
		children,
		...rest
	}: Props = $props();
</script>

<!-- Svelte scopes page styles, so a page class passed in won't style this; wrap it or use :global(). -->
<button
	{...rest}
	{type}
	class={[
		'btn',
		iconOnly ? 'icon-btn' : `btn-${variant}`,
		iconOnly && variant === 'danger' && 'danger',
		iconOnly && variant === 'ghost' && 'ghost',
		`btn-${size}`,
		className
	]}
	disabled={disabled || loading}
	aria-busy={loading || undefined}
	aria-label={iconOnly ? label : undefined}
>
	{#if loading}
		<span class="spin"></span>
	{:else if icon}
		<Icon name={icon} size={size === 'sm' ? 14 : 16} />
	{/if}
	{#if !iconOnly}{@render children?.()}{/if}
</button>

<style>
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--sp-2);
		box-sizing: border-box;
	}
	/* A theme's gel highlight across the top, under the label and clear of it. */
	.btn:not(.btn-ghost, .ghost) {
		position: relative;
		isolation: isolate;
	}
	.btn:not(.btn-ghost, .ghost)::before {
		content: '';
		position: absolute;
		inset: 2px 12% 68%;
		z-index: -1;
		border-radius: var(--r-pill);
		background: var(--gloss);
		pointer-events: none;
	}
	/* An unlit gel: the sheen alone would float over the neutral disabled surface. */
	.btn-primary:disabled:not([aria-busy='true'])::before {
		content: none;
	}
	.btn-md {
		min-height: var(--tap);
	}
	.btn-sm {
		min-height: var(--tap-sm);
	}
	.btn-md:not(.icon-btn) {
		border-radius: var(--r-lg);
		padding: var(--sp-3) var(--sp-4);
		font-size: var(--fs-md);
	}
	.btn-sm:not(.icon-btn) {
		border-radius: var(--r-md);
		padding: var(--sp-2) var(--sp-3);
		font-size: var(--fs-sm);
	}
	.icon-btn.btn-md {
		width: var(--tap);
		height: var(--tap);
	}
	.icon-btn.btn-sm {
		width: var(--tap-sm);
		height: var(--tap-sm);
	}
	.btn-secondary,
	.btn-danger {
		font-weight: 700;
		transition: background var(--t-base) var(--ease), filter var(--t-fast) var(--ease),
			transform var(--t-fast) var(--ease);
	}
	.btn-secondary {
		background: var(--s2);
		border: 1px solid var(--line);
		color: var(--ink-hi);
	}
	.btn-danger {
		background: var(--bad);
		border: none;
		color: var(--bad-ink);
	}
	.btn-secondary:disabled,
	.btn-danger:disabled,
	.btn-ghost:disabled {
		opacity: 0.4;
		cursor: default;
	}
	.btn[aria-busy='true'] {
		opacity: 1;
	}
	.btn-primary .spin,
	.btn-danger .spin {
		border-color: rgba(0, 0, 0, 0.2);
		border-color: color-mix(in srgb, currentColor 25%, transparent);
		border-top-color: currentColor;
	}
	@media (hover: hover) {
		.btn-secondary:not(:disabled):hover {
			background: var(--s3);
		}
		.btn-danger:not(:disabled):not(:active):hover {
			filter: brightness(1.07);
		}
		.icon-btn.danger:hover {
			color: var(--bad);
			border-color: var(--bad-a40);
		}
	}
</style>
