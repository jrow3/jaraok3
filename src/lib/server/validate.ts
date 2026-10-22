import type { AddInput } from '../types';
import { isThemeId } from '../themes/themes';
import { YOUTUBE_ID } from './env';

const SOURCES = new Set(['local', 'youtube', 'local-video']);
// The shape ownerTagFor gives.
const OWNER_TAG_RE = /^[0-9a-f]{16}$/;
// Far past any real party's line; unremove puts anything beyond the end at the end anyway.
const MAX_QUEUE_INDEX = 500;

function boundedString(value: unknown, min: number, max: number): string | null {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (trimmed.length < min || trimmed.length > max) return null;
	return trimmed;
}

// Turns an untrusted socket payload into a clean AddInput (or null): only the
// known fields, never a copy of whatever the client happened to send.
export function toAddInput(raw: unknown): AddInput | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const input = raw as Record<string, unknown>;

	const artist = boundedString(input.artist, 1, 200);
	const title = boundedString(input.title, 1, 200);
	const singer = boundedString(input.singer, 1, 60);
	if (artist === null || title === null || singer === null) return null;

	if (typeof input.source !== 'string' || !SOURCES.has(input.source)) return null;
	const source = input.source as AddInput['source'];

	const result: AddInput = { artist, title, singer, source };

	if (input.songId !== undefined) {
		if (typeof input.songId !== 'number' || !Number.isInteger(input.songId) || input.songId < 0) return null;
		result.songId = input.songId;
	}

	if (input.ytId !== undefined) {
		if (typeof input.ytId !== 'string' || !YOUTUBE_ID.test(input.ytId)) return null;
		result.ytId = input.ytId;
	}

	if (input.discTag !== undefined) {
		if (input.discTag !== null && (typeof input.discTag !== 'string' || input.discTag.length > 80)) return null;
		result.discTag = input.discTag as string | null;
	}

	// Cosmetic only, so a theme this server doesn't know costs the song its theme, not its add.
	if (isThemeId(input.theme)) result.theme = input.theme;

	return result;
}

// A host putting a guest's song back keeps it the guest's, so the owner comes from the client here.
export function toRequeueInput(raw: unknown): (AddInput & { owner?: string }) | null {
	const input = toAddInput(raw);
	if (input === null) return null;
	const { owner, isHouseSound } = raw as Record<string, unknown>;
	const requeued = isHouseSound === true ? { ...input, isHouseSound } : input;
	if (owner === undefined) return requeued;
	if (typeof owner !== 'string' || !OWNER_TAG_RE.test(owner)) return null;
	return { ...requeued, owner };
}

export function toIdList(raw: unknown): string[] | null {
	if (!Array.isArray(raw) || raw.length > 500) return null;
	const ids: string[] = [];
	for (const item of raw) {
		if (typeof item !== 'string' || item.length > 64) return null;
		ids.push(item);
	}
	return ids;
}

export function toId(raw: unknown): string | null {
	if (typeof raw !== 'string' || raw.length > 64) return null;
	return raw;
}

// The same rule as an add's singer, so a rename can't carry a name an add would refuse.
export function toSinger(raw: unknown): string | null {
	return boundedString(raw, 1, 60);
}

// The host's Undo after a removal names the song and the place it stood in line.
export function toUndoRemoval(raw: unknown): { id: string; index: number } | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const input = raw as Record<string, unknown>;
	const id = toId(input.id);
	const index = input.index;
	if (id === null || typeof index !== 'number' || !Number.isInteger(index)) return null;
	return index >= 0 && index <= MAX_QUEUE_INDEX ? { id, index } : null;
}

const isSeconds = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0;

// The TV's place in the song on stage: seconds in, and the song's length (0 while unknown).
export function toProgress(raw: unknown): { id: string; time: number; duration: number } | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const input = raw as Record<string, unknown>;
	const id = toId(input.id);
	const { time, duration } = input;
	if (id === null || !isSeconds(time) || !isSeconds(duration)) return null;
	return { id, time, duration };
}
