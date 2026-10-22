<script lang="ts" module>
	export type IconName = keyof typeof PATHS;

	const PATHS = {
		search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.8-3.8"/>',
		mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/>',
		play: '<path d="M7 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
		pause: '<path d="M9 5v14M15 5v14" stroke-width="2.4"/>',
		next: '<path d="M6 5.5v13l9-6.5z" fill="currentColor" stroke="none"/><path d="M18 5v14" stroke-width="2.4"/>',
		restart: '<path d="M4 10a8 8 0 1 1 2 6.5"/><path d="M4 5v5h5"/>',
		plus: '<path d="M12 5v14M5 12h14"/>',
		minus: '<path d="M5 12h14"/>',
		x: '<path d="m6 6 12 12M18 6 6 18"/>',
		'chev-down': '<path d="m6 9 6 6 6-6"/>',
		star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
		'star-fill':
			'<path d="m12 3.5 2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" fill="currentColor" stroke="none"/>',
		grip: '<g fill="currentColor" stroke="none"><circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/></g>',
		up: '<path d="M12 19V6M6 12l6-6 6 6"/>',
		down: '<path d="M12 5v13M6 12l6 6 6-6"/>',
		top: '<path d="M12 20V9M6.5 14.5 12 9l5.5 5.5"/><path d="M5 4.5h14"/>',
		edit: '<path d="M16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1 1-4z"/>',
		note: '<path d="M9 18V6l10-2v11.5"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/>',
		tv: '<rect x="3" y="5" width="18" height="13" rx="2"/><path d="M9 21h6"/>',
		sliders:
			'<path d="M5 7h9M18 7h1M5 12h3M12 12h7M5 17h11M20 17h-1"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="17" r="2"/>',
		check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
		clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
		power: '<path d="M12 3.5V12"/><path d="M7.2 6.6a7.5 7.5 0 1 0 9.6 0"/>',
		palette:
			'<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.1 0 1.6-.8 1.6-1.6 0-.9-.7-1.3-.7-2.2s.7-1.6 1.6-1.6h1.9a4.1 4.1 0 0 0 4.1-4.1c0-4.2-3.8-7.5-8.5-7.5z"/><g fill="currentColor" stroke="none"><circle cx="7.8" cy="11.5" r="1.2"/><circle cx="10.4" cy="7.6" r="1.2"/><circle cx="15.1" cy="7.9" r="1.2"/></g>'
	} as const;
</script>

<script lang="ts">
	let { name, size = 18 }: { name: IconName; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- static path table above, no user input -->
	{@html PATHS[name]}
</svg>

<style>
	svg {
		flex: none;
		display: inline-block;
		vertical-align: middle;
	}
</style>
