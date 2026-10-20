<script lang="ts">
	import type { Party, PartyActionError } from '$lib/party.svelte';
	import type { QueueItem } from '$lib/types';
	import { toast } from '$lib/toast.svelte';
	import { CANT_PLAY_HERE, COULD_NOT_ADD } from '$lib/messages';
	import Button from '$lib/components/ui/Button.svelte';
	import SectionHeader from '$lib/components/ui/SectionHeader.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import SongRow from './SongRow.svelte';
	import { createAddTracker, videoAddKey, type AddPhase } from './addTracker';
	import { fetchYoutube, isEmbeddable, youtubeInput } from './api';
	import type { YtResult } from './types';
	import { parseYoutubeTitle } from './youtubeTitle';

	let {
		query,
		singer,
		party,
		tone = 'muted',
		size = 'md',
		hasAddIcon = false,
		isPrimary = false,
		videos = $bindable([]),
		onadded
	}: {
		query: string;
		singer: string;
		party: Party;
		tone?: 'muted' | 'accent';
		size?: 'md' | 'sm';
		hasAddIcon?: boolean;
		/** The library had nothing, so YouTube is the page's main action (F11). */
		isPrimary?: boolean;
		videos?: YtResult[];
		onadded: (item: QueueItem) => void;
	} = $props();

	let isSearching = $state(false);
	let message = $state('');
	let hasFailed = $state(false);
	const phases = $state<Record<string, AddPhase>>({});
	const adds = createAddTracker(phases);

	async function search() {
		isSearching = true;
		message = '';
		hasFailed = false;
		try {
			videos = await fetchYoutube(query.trim());
			if (videos.length === 0) message = 'No YouTube results.';
		} catch {
			message = 'YouTube search is unavailable right now.';
			hasFailed = true;
		} finally {
			isSearching = false;
		}
	}

	// Videos that block embedding (KaraFun and the like) are downloaded instead and
	// join the lineup right away as a pending item.
	async function addVideo(video: YtResult): Promise<QueueItem> {
		const input = youtubeInput(video, singer);
		return (await isEmbeddable(video.ytId)) ? party.add(input) : party.addDownload(input);
	}

	async function add(video: YtResult) {
		let item: QueueItem | null;
		try {
			item = await adds.run(videoAddKey(video.ytId), () => addVideo(video));
		} catch (error) {
			// "disabled": it blocks embedding and this install doesn't download (DOWNLOADS=off).
			toast((error as PartyActionError).code === 'disabled' ? CANT_PLAY_HERE : COULD_NOT_ADD, { kind: 'err' });
			return;
		}
		if (item) onadded(item);
	}
</script>

<div class="search-button">
	<Button variant={isPrimary ? 'primary' : 'ghost'} icon="search" loading={isSearching} onclick={search}>
		{#if isSearching}Searching YouTube…{:else if isPrimary}Try YouTube →{:else}Search YouTube for “{query}”{/if}
	</Button>
</div>
{#if message}<p class={['message', hasFailed && 'is-error']} role={hasFailed ? 'alert' : undefined}>{message}</p>{/if}
{#if videos.length > 0}
	<div class="group">
		<SectionHeader label="From YouTube" {tone} />
		<ul class="results">
			{#each videos as video (video.ytId)}
				{@const parsed = parseYoutubeTitle(video.title)}
				<li>
					<SongRow
						title={parsed?.title ?? video.title}
						detail={parsed?.artist ?? video.channel}
						caption={parsed ? video.channel : undefined}
						thumbnailUrl="https://i.ytimg.com/vi/{video.ytId}/mqdefault.jpg"
						{size}
						{hasAddIcon}
						phase={phases[videoAddKey(video.ytId)]}
						onclick={() => add(video)}
					>
						{#snippet tags()}<Tag kind="source" value="youtube" label="YouTube" />{/snippet}
					</SongRow>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.search-button {
		display: grid;
		margin-bottom: var(--sp-3);
	}
	.message {
		margin: 0 0 var(--sp-3);
		font-size: var(--fs-sm);
		color: var(--ink-mid);
	}
	.is-error {
		color: var(--bad-soft);
	}
	.group {
		margin-top: var(--sp-3);
	}
	.results {
		list-style: none;
		margin: 0 0 var(--sp-3);
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--sp-2);
	}
</style>
