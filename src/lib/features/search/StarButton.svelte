<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';

	let { isOn, onclick }: { isOn: boolean; onclick: () => void } = $props();

	let label = $derived(isOn ? 'Unstar this version' : 'Star this version');
</script>

<button type="button" class={['star-button', isOn && 'is-on']} {onclick} title={label} aria-label={label} aria-pressed={isOn}>
	<Icon name={isOn ? 'star-fill' : 'star'} size={15} />
</button>

<style>
	.star-button {
		flex: none;
		display: grid;
		place-items: center;
		width: var(--tap-sm);
		min-height: var(--tap-sm);
		background: none;
		border: none;
		color: var(--ink-low);
		transition: color var(--t-fast) var(--ease);
	}
	.is-on {
		color: var(--star);
	}
	@media (hover: hover) {
		.star-button:hover {
			color: var(--star);
		}
	}
</style>
