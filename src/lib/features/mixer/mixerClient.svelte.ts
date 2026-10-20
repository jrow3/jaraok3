import type { Party } from '$lib/party.svelte';
import { showFailed } from '../host/showFailed';
import type { ControlId } from './controls';
import type { MixerState } from './presets';
import type { SingerStage } from './stageSound';

export interface MeterLevels {
	inL: number;
	inR: number;
	room: number;
}

const SILENT: MeterLevels = { inL: -90, inR: -90, room: -90 };

// The Sound tab's view of the server mixer. Changes show at once; the server echoes
// them to the other host phones, never back to this one, so a drag is never fought.
export function createMixerClient(party: Party) {
	let state = $state<MixerState | null>(null);
	let levels = $state<MeterLevels>(SILENT);
	let stage = $state<SingerStage | null>(null);
	let isAgentConnected = $state<boolean | null>(null);
	let unsubscribe: (() => void)[] = [];

	async function refresh() {
		try {
			state = await party.mixer<MixerState>('mixer:get');
		} catch {
			showFailed();
		}
	}

	async function run(event: `mixer:${string}`, payload: unknown) {
		try {
			state = await party.mixer<MixerState>(event, payload);
		} catch {
			showFailed();
			await refresh();
		}
	}

	return {
		get state() {
			return state;
		},
		get levels() {
			return levels;
		},
		/** null until the server says; false means the host agent isn't running on the server. */
		get isAgentConnected() {
			return isAgentConnected;
		},
		get stage() {
			return stage;
		},
		open() {
			const watch = () => party.send('mixer:watch');
			unsubscribe = [
				party.listen<MixerState>('mixer', (next) => (state = next)),
				party.listen<MeterLevels>('mixer:levels', (next) => (levels = next)),
				party.listen<SingerStage | null>('mixer:stage', (next) => (stage = next)),
				party.listen<boolean>('mixer:agent', (next) => {
					isAgentConnected = next;
					if (!next) levels = SILENT;
				}),
				// A reconnect is a new socket: the server forgot this phone was watching.
				party.listen('connect', () => {
					watch();
					void refresh();
				})
			];
			watch();
			void refresh();
		},
		close() {
			party.send('mixer:unwatch');
			unsubscribe.forEach((off) => off());
			unsubscribe = [];
		},
		set(id: ControlId, value: number) {
			if (!state) return;
			state = { ...state, live: { ...state.live, [id]: value } };
			// The answer is not applied: mid-drag it is already older than the fader.
			party.mixer('mixer:set', { id, value }).catch(() => {
				showFailed();
				void refresh();
			});
		},
		resetSinger() {
			// Stale means the song changed or was already reset (a double tap): nothing to undo.
			party.mixer('mixer:reset-singer').catch((error) => {
				if (error?.code !== 'stale') showFailed();
			});
		},
		load: (id: string) => run('mixer:load', id),
		save: (id: string) => run('mixer:save', id),
		saveAs: (name: string) => run('mixer:add', name),
		rename: (id: string, name: string) => run('mixer:rename', { id, name }),
		remove: (id: string) => run('mixer:delete', id)
	};
}

export type MixerClient = ReturnType<typeof createMixerClient>;
