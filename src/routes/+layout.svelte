<script lang="ts">
	import '../app.css';
	// After app.css: primitives must follow the base rules (e.g. :focus-visible) so their classes win ties.
	import '$lib/styles/primitives.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<title>{page.data.features.appName}</title>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
