<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import Segmented from '$lib/components/ui/Segmented.svelte';
	import Switch from '$lib/components/ui/Switch.svelte';
	import type { HostSettings } from '../hostSettings.svelte';
	import SaveStatus from '../SaveStatus.svelte';
	import { MAX_SONG_DELAY_SEC, clampSongDelay } from '../settingsModel';
	import type { LyricsLayout } from '$lib/types';
	import ThemeCards from '$lib/themes/ThemeCards.svelte';

	let { settings }: { settings: HostSettings } = $props();

	let delay = $derived(settings.data.songDelaySec);

	const LYRICS_LAYOUTS: { value: LyricsLayout; label: string }[] = [
		{ value: 'full', label: 'Full screen' },
		{ value: 'panel', label: 'Side panel' }
	];

	function changeDelay(seconds: number) {
		settings.update({ songDelaySec: clampSongDelay(delay + seconds) });
	}
</script>

<div class="tab">
	<section>
		<SectionHeader label="Guests">
			{#snippet aside()}<SaveStatus saveState={settings.saveStates.guests} onretry={() => settings.retry('guests')} />{/snippet}
		</SectionHeader>
		<div class="setting-row">
			<span class="setting-label"><Icon name="note" size={15} />Suggested songs</span>
			<Switch
				checked={settings.data.recsEnabled}
				onchange={(isOn) => settings.update({ recsEnabled: isOn })}
				label="Suggested songs"
			/>
		</div>
		<div class="setting-row">
			<span class="setting-label"><Icon name="mic" size={15} />Vibrate phones when they’re next</span>
			<Switch
				checked={settings.data.isVibrationOn}
				onchange={(isOn) => settings.update({ isVibrationOn: isOn })}
				label="Vibrate phones when they’re next"
			/>
		</div>
	</section>
	<section>
		<SectionHeader label="Playback">
			{#snippet aside()}<SaveStatus saveState={settings.saveStates.playback} onretry={() => settings.retry('playback')} />{/snippet}
		</SectionHeader>
		<div class="setting-row">
			<span class="setting-text">
				<span class="setting-label">Pause between songs</span>
				<span class="hint">Before each song, the TV shows who’s up next for this long.</span>
			</span>
			<span class="stepper">
				<Button iconOnly size="sm" icon="minus" label="Shorter pause" disabled={delay === 0} onclick={() => changeDelay(-1)} />
				<b>{delay === 0 ? 'Off' : `${delay}s`}</b>
				<Button
					iconOnly
					size="sm"
					icon="plus"
					label="Longer pause"
					disabled={delay === MAX_SONG_DELAY_SEC}
					onclick={() => changeDelay(1)}
				/>
			</span>
		</div>
	</section>
	<section>
		<SectionHeader label="TV">
			{#snippet aside()}<SaveStatus saveState={settings.saveStates.tv} onretry={() => settings.retry('tv')} />{/snippet}
		</SectionHeader>
		<div class="setting-row is-stacked">
			<span class="setting-text">
				<span class="setting-label">TV theme</span>
				<span class="hint">Changes the TV and this host page. Guests pick their own with the palette button.</span>
			</span>
			<ThemeCards label="TV theme" value={settings.data.tvTheme} onchange={(tvTheme) => settings.update({ tvTheme })} />
		</div>
		<div class="setting-row">
			<span class="setting-text">
				<span class="setting-label">Use each singer’s theme</span>
				<span class="hint">The TV wears the phone theme of whoever is up. With no one up, it keeps the TV theme.</span>
			</span>
			<Switch
				checked={settings.data.isSingerThemeShown}
				onchange={(isOn) => settings.update({ isSingerThemeShown: isOn })}
				label="Use each singer’s theme"
			/>
		</div>
		<div class="setting-row is-stacked">
			<span class="setting-text">
				<span class="setting-label">Lyrics layout</span>
				<span class="hint">For lyrics songs: fill the screen with cards on top, or sit beside a panel of cards.</span>
			</span>
			<Segmented
				label="Lyrics layout"
				options={LYRICS_LAYOUTS}
				value={settings.data.lyricsLayout}
				onchange={(layout) => settings.update({ lyricsLayout: layout })}
			/>
		</div>
		<div class="setting-row">
			<span class="setting-label"><Icon name="tv" size={15} />Show the join code during songs</span>
			<Switch
				checked={settings.data.isJoinCodeShown}
				onchange={(isOn) => settings.update({ isJoinCodeShown: isOn })}
				label="Show the join code during songs"
			/>
		</div>
		<div class="setting-row">
			<span class="setting-label"><Icon name="tv" size={15} />Show time left</span>
			<Switch
				checked={settings.data.isTimeLeftShown}
				onchange={(isOn) => settings.update({ isTimeLeftShown: isOn })}
				label="Show time left"
			/>
		</div>
		<div class="setting-row">
			<span class="setting-text">
				<span class="setting-label"><Icon name="tv" size={15} />Show Up next through video songs</span>
				<span class="hint">Off: only as the song starts and in its last 30 seconds, so more of the video shows.</span>
			</span>
			<Switch
				checked={settings.data.isUpNextAlwaysShown}
				onchange={(isOn) => settings.update({ isUpNextAlwaysShown: isOn })}
				label="Show Up next through video songs"
			/>
		</div>
	</section>
</div>

<style>
	.tab {
		display: flex;
		flex-direction: column;
		gap: var(--sp-6);
	}
	.setting-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--sp-3);
		padding: var(--sp-3) 0;
		border-top: 1px solid var(--line-soft);
		font-size: var(--fs-sm);
		font-weight: 600;
	}
	.is-stacked {
		flex-direction: column;
		align-items: stretch;
	}
	.setting-label {
		display: inline-flex;
		align-items: center;
		gap: var(--sp-2);
		color: var(--ink-hi);
	}
	.setting-text {
		display: flex;
		flex-direction: column;
		gap: var(--sp-1);
		min-width: 0;
	}
	.hint {
		font-size: var(--fs-xs);
		font-weight: 400;
		color: var(--ink-mid);
	}
	.stepper {
		flex: none;
		display: flex;
		align-items: center;
		gap: var(--sp-2);
	}
	.stepper b {
		min-width: 34px;
		text-align: center;
	}
</style>
