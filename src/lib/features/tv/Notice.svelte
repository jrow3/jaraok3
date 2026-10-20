<script lang="ts">
	// With no lifetime the notice stays, and whoever shows it fades it.
	let {
		title,
		detail,
		lifetimeMs,
		isTitleOneRow = false
	}: { title: string; detail: string; lifetimeMs?: number; isTitleOneRow?: boolean } = $props();
</script>

<!-- Words only, at the smallest size: news for the room, not a card over the lyrics. -->
<div
	class={['notice', lifetimeMs && 'is-timed']}
	style:animation-duration={lifetimeMs ? `${lifetimeMs}ms` : undefined}
>
	<span class={['title', isTitleOneRow && 'is-one-row']}>{title}</span>
	<span class="detail">{detail}</span>
</div>

<style>
	.notice {
		display: flex;
		flex-direction: column;
		min-width: 0;
		font-size: var(--tv-fs-sm);
		overflow-wrap: anywhere;
	}
	/* Cut short rather than wrapped onto a second row. */
	.is-one-row {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.is-timed {
		animation-name: notice-life;
		animation-timing-function: var(--ease);
		animation-fill-mode: forwards;
	}
	.title {
		font-weight: 700;
	}
	@keyframes notice-life {
		0% {
			opacity: 0;
			transform: translateY(16px);
		}
		4%,
		90% {
			opacity: 1;
			transform: none;
		}
		100% {
			opacity: 0;
		}
	}
</style>
