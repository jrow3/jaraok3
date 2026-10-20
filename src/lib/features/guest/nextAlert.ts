import type { MySong } from './mySongs';

// Two short pulses, once: easy to feel, and over before anyone wonders what it was.
export const NEXT_VIBRATION_MS = [200, 100, 200];

export interface NextCheck {
	buzzedIds: ReadonlySet<string>;
	shouldBuzz: boolean;
}

// `buzzedIds` is undefined on the first look, so a phone that opens while it is already
// next stays quiet, and that song counts as buzzed. A song can drop back and become next
// again (a download ahead turns ready, the host reorders); it has already had its buzz.
export function checkNext(buzzedIds: ReadonlySet<string> | undefined, songs: MySong[]): NextCheck {
	const nextId = songs.find((song) => song.status === 'next')?.id;
	if (nextId === undefined || buzzedIds?.has(nextId)) return { buzzedIds: buzzedIds ?? new Set(), shouldBuzz: false };
	return { buzzedIds: new Set(buzzedIds).add(nextId), shouldBuzz: buzzedIds !== undefined };
}
