<script lang="ts">
	import { browser } from '$app/environment';
	import ThemeCards from './ThemeCards.svelte';
	import { applyTheme } from './applyTheme';
	import { PHONE_THEME_KEY } from './phoneTheme';
	import { DEFAULT_PHONE_THEME, isThemeId, type ThemeId } from './themes';

	// app.html already put this phone's theme on <html> before the first paint, so the first
	// check mark drawn is the right one.
	const painted = browser ? document.documentElement.dataset.theme : undefined;
	let theme = $state<ThemeId>(isThemeId(painted) ? painted : DEFAULT_PHONE_THEME);

	function pick(id: ThemeId) {
		theme = id;
		applyTheme(id);
		localStorage.setItem(PHONE_THEME_KEY, id);
	}
</script>

<ThemeCards label="Theme for this phone" value={theme} onchange={pick} />
