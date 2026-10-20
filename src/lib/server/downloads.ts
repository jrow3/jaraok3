import type { PartyState } from './party';
import { downloadVideo, type SongName } from './download';
import { indexVideoFile, type IndexedVideo } from './library';
import { recordDownload, findDownloaded } from './ytindex';
import { getDb } from './db';

// On-demand download of non-embeddable picks: cap concurrent yt-dlp processes and
// dedupe by video id so two guests picking the same video share one download.
const MAX_CONCURRENT_DOWNLOADS = 3;
let activeDownloads = 0;
const downloadWaiters: (() => void)[] = [];
const inFlight = new Map<string, Promise<IndexedVideo>>();

function downloadAndIndex(ytId: string, name: SongName): Promise<IndexedVideo> {
	let p = inFlight.get(ytId);
	if (!p) {
		p = (async () => {
			while (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) {
				await new Promise<void>((resolve) => downloadWaiters.push(resolve));
			}
			activeDownloads++;
			try {
				const rel = await downloadVideo(ytId, name);
				const indexed = indexVideoFile(rel);
				recordDownload(getDb(), ytId, rel);
				return indexed;
			} finally {
				activeDownloads--;
				downloadWaiters.shift()?.();
			}
		})().finally(() => inFlight.delete(ytId));
		inFlight.set(ytId, p);
	}
	return p;
}

// Flips a downloading row to its local copy, which plays when its turn comes, or shows
// it failed for a while before clearing it. A video pulled before is not pulled again.
export async function completeDownload(
	party: PartyState,
	row: { id: string; ytId: string } & SongName,
	broadcast: () => void
): Promise<IndexedVideo | null> {
	try {
		const { songId, artist, title, discTag } = findDownloaded(getDb(), row.ytId) ?? (await downloadAndIndex(row.ytId, row));
		party.update(row.id, { source: 'local-video', songId, artist, title, discTag, status: 'ready' });
		party.startIfIdle();
		broadcast();
		return { songId, artist, title, discTag };
	} catch (error) {
		console.error(`[youtube] download failed for ${row.ytId}:`, error instanceof Error ? error.message : error);
		party.update(row.id, { status: 'failed' });
		broadcast();
		setTimeout(() => {
			party.remove(row.id, 'failed');
			broadcast();
		}, 8000);
		return null;
	}
}
