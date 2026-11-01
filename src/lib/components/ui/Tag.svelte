<script lang="ts">
	import type { Tier } from '$lib/types';

	type Props =
		| { kind: 'tier'; value: Tier; label: string }
		| { kind: 'source'; value: 'local' | 'youtube' | 'local-video'; label?: string }
		| { kind: 'note'; value: 'best' | 'no-lyrics' };

	const SOURCE_LOOK = {
		local: { className: 'tag-local', text: 'CDG' },
		youtube: { className: 'tag-yt', text: 'YT' },
		'local-video': { className: 'tag-vid', text: 'VID' }
	} as const;

	// Plain-language quality notes for guests, in place of brand names and tiers.
	const NOTE_LOOK = {
		best: { className: 'tag-green', text: 'Best version' },
		'no-lyrics': { className: 'tag-yellow', text: 'No lyrics on screen' }
	} as const;

	let props: Props = $props();

	let look = $derived.by(() => {
		const current = props;
		if (current.kind === 'tier') return { className: `tag-${current.value}`, text: current.label };
		if (current.kind === 'note') return NOTE_LOOK[current.value];
		const preset = SOURCE_LOOK[current.value];
		return { className: preset.className, text: current.label ?? preset.text };
	});
</script>

<span class="tag {look.className}">{look.text}</span>
