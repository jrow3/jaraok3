import type { Party } from '$lib/party.svelte';
import { toast } from '$lib/toast.svelte';
import {
	STARTING_POINTS,
	withSinger,
	type SingerControlId,
	type SingerSound,
	type SingerValues,
	type StartingPointId
} from '../mixer/singerSound';
import type { SingerSnapshot, SingerStage } from '../mixer/stageSound';

const COULD_NOT_SAVE = 'Couldn’t save your sound';
const COULD_NOT_LOAD = 'Couldn’t load your sound';

// The guest's view of their own echo and reverb. Like the Sound tab, a change shows at
// once and a knob's answer is not applied, so a drag is never fought.
export function createSingerSoundClient(party: Party) {
	let sound = $state<SingerSound>({});
	let house = $state<SingerValues | null>(null);
	let stage = $state<SingerStage | null>(null);
	let unsubscribe: (() => void)[] = [];

	async function refresh() {
		try {
			const snapshot = await party.singer<SingerSnapshot>('singer:get');
			sound = snapshot.sound;
			house = snapshot.house;
			stage = snapshot.stage;
		} catch {
			toast(COULD_NOT_LOAD, { kind: 'err' });
		}
	}

	async function replace(next: SingerSound) {
		sound = next;
		try {
			sound = await party.singer<SingerSound>('singer:replace', next);
		} catch {
			toast(COULD_NOT_SAVE, { kind: 'err' });
			await refresh();
		}
	}

	return {
		get sound() {
			return sound;
		},
		/** null until the server says. */
		get house() {
			return house;
		},
		get stage() {
			return stage;
		},
		get values() {
			return house && withSinger(house, sound);
		},
		open() {
			unsubscribe = [
				party.listen<SingerValues>('singer:house', (next) => (house = next)),
				party.listen<SingerStage | null>('mixer:stage', (next) => (stage = next)),
				party.listen('connect', () => void refresh())
			];
			// A returning guest's card mounts before the socket connects; the connect listener loads it then.
			if (party.connected) void refresh();
		},
		close() {
			unsubscribe.forEach((off) => off());
			unsubscribe = [];
		},
		set(id: SingerControlId, value: number) {
			sound = { ...sound, [id]: value };
			party.singer('singer:set', { id, value }).catch(() => {
				toast(COULD_NOT_SAVE, { kind: 'err' });
				void refresh();
			});
		},
		choose(id: StartingPointId) {
			const point = STARTING_POINTS.find((candidate) => candidate.id === id);
			if (point) void replace({ ...point.values });
		},
		reset: () => replace({})
	};
}

export type SingerSoundClient = ReturnType<typeof createSingerSoundClient>;
