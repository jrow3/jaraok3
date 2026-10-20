<script lang="ts" generics="T">
	import type { Snippet } from 'svelte';
	import { moveBefore } from './reorder';

	let {
		items,
		key,
		label,
		onreorder,
		row
	}: {
		items: T[];
		key: (item: T) => string;
		label: string;
		onreorder: (next: T[]) => void;
		row: Snippet<[T, number]>;
	} = $props();

	let draggedKey = $state<string | null>(null);
	let overKey = $state<string | null>(null);

	// Runs on every drop and also when a drag ends outside the list, so no row stays faded.
	function endDrag() {
		draggedKey = null;
		overKey = null;
	}

	function drop(targetIndex: number) {
		const fromIndex = items.findIndex((item) => key(item) === draggedKey);
		endDrag();
		if (fromIndex === -1) return;
		const next = moveBefore(items, fromIndex, targetIndex);
		if (next) onreorder(next);
	}
</script>

<ul class="reorder-list" aria-label={label}>
	{#each items as item, index (key(item))}
		{@const itemKey = key(item)}
		<li
			draggable="true"
			class={[
				draggedKey === itemKey && 'is-dragging',
				overKey === itemKey && draggedKey !== null && draggedKey !== itemKey && 'is-drop-target'
			]}
			ondragstart={(event) => {
				// Firefox starts a drag only when it carries data.
				event.dataTransfer?.setData('text/plain', itemKey);
				draggedKey = itemKey;
			}}
			ondragover={(event) => {
				event.preventDefault();
				overKey = itemKey;
			}}
			ondragleave={(event) => {
				// Moving onto a child of the row fires dragleave too; only leaving the row clears its line.
				if (overKey === itemKey && !event.currentTarget.contains(event.relatedTarget as Node | null)) overKey = null;
			}}
			ondrop={(event) => {
				// Otherwise Firefox opens the dragged text as a link.
				event.preventDefault();
				drop(index);
			}}
			ondragend={endDrag}
		>
			{@render row(item, index)}
		</li>
	{/each}
</ul>

<style>
	.reorder-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}
	li {
		position: relative;
		user-select: none;
		cursor: grab;
	}
	.is-dragging {
		opacity: 0.4;
		cursor: grabbing;
	}
	.is-drop-target::before {
		content: '';
		position: absolute;
		left: 0;
		right: 0;
		top: -3.5px;
		height: 2.5px;
		border-radius: var(--r-pill);
		background: var(--accent);
	}
</style>
