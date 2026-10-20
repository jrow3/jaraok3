import { queuePosition } from '../../queue';
import { isPlayable } from '../../playable';
import { songKey } from '../../songKey';
import type { PartySnapshot, QueueItem, SongOutcome } from '../../types';

export type MySongStatus = 'singing' | 'next' | 'waiting' | 'downloading' | SongOutcome;

export interface MySong {
	id: string;
	title: string;
	artist: string;
	status: MySongStatus;
	/** 1-based spot in the waiting line; 0 once the song has left it. */
	position: number;
}

// Enough to explain a skip or a removal without the card growing all night.
const MAX_FINISHED_SHOWN = 3;

const LABELS: Record<Exclude<MySongStatus, 'waiting'>, string> = {
	singing: 'Singing now',
	next: 'Up next',
	downloading: 'Downloading',
	sung: 'Sung',
	skipped: 'Skipped',
	removed: 'Removed by the host',
	failed: 'Couldn\u2019t play'
};

// The song the server starts next: advance() passes over anything still downloading or failed.
function nextUpId(queue: QueueItem[]): string | null {
	return queue.find(isPlayable)?.id ?? null;
}

function waitingStatus(item: QueueItem, nextId: string | null): MySongStatus {
	if (item.status === 'failed') return 'failed';
	if (item.status === 'downloading') return 'downloading';
	return item.id === nextId ? 'next' : 'waiting';
}

export function listMySongs(party: Pick<PartySnapshot, 'current' | 'queue' | 'ended'>, ownerTag: string): MySong[] {
	const isMine = (item: QueueItem) => item.owner === ownerTag;
	const toSong = (item: QueueItem, status: MySongStatus): MySong => ({
		id: item.id,
		title: item.title,
		artist: item.artist,
		status,
		position: queuePosition(party.queue, item.id)
	});
	const nextId = nextUpId(party.queue);
	const singing = party.current && isMine(party.current) ? [toSong(party.current, 'singing')] : [];
	const waiting = party.queue.filter(isMine).map((item) => toSong(item, waitingStatus(item, nextId)));
	// A host can put a finished song back in line; the live row then tells the whole story.
	const liveKeys = new Set([...singing, ...waiting].map((song) => songKey(song.artist, song.title)));
	const finished = party.ended
		.filter((item) => isMine(item) && !liveKeys.has(songKey(item.artist, item.title)))
		.slice(0, MAX_FINISHED_SHOWN)
		.map((item) => toSong(item, item.outcome));
	return [...singing, ...waiting, ...finished];
}

export function statusLabel(song: MySong): string {
	return song.status === 'waiting' ? `#${song.position} in line` : LABELS[song.status];
}
