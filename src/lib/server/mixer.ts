import type { Server, Socket } from 'socket.io';
import { clampControl, isControlId, type MixerParams } from '../features/mixer/controls';
import { toPipewire } from '../features/mixer/pipewire';
import {
	addPreset,
	cleanPresetName,
	deletePreset,
	loadPreset,
	renamePreset,
	saveToPreset,
	type MixerState
} from '../features/mixer/presets';
import { houseValues, isSingerControlId, toSingerSound, type SingerSound } from '../features/mixer/singerSound';
import {
	guestSong,
	singerOnStage,
	stageParams,
	type SingerSnapshot,
	type SingerStage,
	type StageSong
} from '../features/mixer/stageSound';
import { createLevelRelay } from './mixerLevels';
import { mayDo, type Caller } from './permissions';
import { reply } from './reply';

export interface MixerStore {
	load(): MixerState;
	save(state: MixerState): void;
	/** Hands the sound to the host agent; throws when the control folder isn't there. */
	apply(params: MixerParams): void;
	loadSinger(owner: string): SingerSound;
	saveSinger(owner: string, sound: SingerSound): void;
	/** Where the host agent streams its meters. */
	levelPath(): string;
}

const WATCHERS = 'mixer-watch';

/** The events that answer, for refusing them all when the mixer is switched off. */
export const MIXER_EVENTS = [
	'mixer:get',
	'mixer:set',
	'mixer:load',
	'mixer:save',
	'mixer:delete',
	'mixer:add',
	'mixer:rename',
	'mixer:reset-singer',
	'singer:get',
	'singer:set',
	'singer:replace'
] as const;

// A fader drag sends dozens of changes a second; the database and PipeWire only need the
// value it settles on, so they get the latest state once the drag pauses this long.
const SETTLE_MS = 50;

const isId = (raw: unknown): raw is string => typeof raw === 'string' && raw.length > 0 && raw.length <= 64;
const newPresetId = () => `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// One mixer per server. Every host phone sees each change at once, and the host agent
// on the machine applies it to the voice chain (see deploy/audio/README.md).
export function createMixer(io: Server, store: MixerStore) {
	let state: MixerState | null = null;
	let timer: ReturnType<typeof setTimeout> | null = null;
	let unsaved: MixerState | null = null;
	let lastApplied = '';
	const current = () => (state ??= store.load());
	let stage: StageSong = { current: null, hold: null };
	let resetSongId: string | null = null;
	let lastStage = 'null';
	const singerSounds = new Map<string, SingerSound>();
	let isAgentConnected = false;
	const watchers = new Set<string>();
	const relay = createLevelRelay({
		path: store.levelPath,
		onLevels: (levels) => io.to(WATCHERS).emit('mixer:levels', levels),
		onAgent: (isConnected) => {
			isAgentConnected = isConnected;
			io.to(WATCHERS).emit('mixer:agent', isConnected);
		}
	});

	function unwatch(socket: Socket): void {
		socket.leave(WATCHERS);
		watchers.delete(socket.id);
		if (watchers.size === 0) relay.stop();
	}

	function soundOf(owner: string): SingerSound {
		if (!singerSounds.has(owner)) singerSounds.set(owner, store.loadSinger(owner));
		return singerSounds.get(owner) ?? {};
	}

	const onStage = (): SingerStage | null => singerOnStage(stage, resetSongId, soundOf);

	function applyStage(): void {
		const singer = onStage();
		const params = stageParams(current().live, singer, singer ? soundOf(singer.owner) : {});
		if (JSON.stringify(params) === lastApplied) return;
		store.apply(params);
		lastApplied = JSON.stringify(params);
	}

	function settleLater(): void {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => {
			timer = null;
			// A throw inside a timer would take the whole server down. A failed settings write
			// must not hold back the sound either, or every later change would stall behind it.
			try {
				if (unsaved) store.save(unsaved);
				unsaved = null;
			} catch (error) {
				// The next settle tries the write again.
				console.error('[mixer] could not save the mixer:', error);
			}
			try {
				applyStage();
			} catch (error) {
				// A missing control folder or database (dev, or a broken mount) only means the
				// agent catches up later.
				console.error('[mixer] could not hand the sound to the agent:', error);
			}
		}, SETTLE_MS);
	}

	function refreshStage(): void {
		const singer = onStage();
		if (JSON.stringify(singer) !== lastStage) {
			lastStage = JSON.stringify(singer);
			io.emit('mixer:stage', singer);
		}
		settleLater();
	}

	function setStage(next: StageSong): void {
		stage = next;
		refreshStage();
	}

	function commit(next: MixerState, origin?: Socket): void {
		const house = houseValues(next.live);
		const isHouseChanged = JSON.stringify(house) !== JSON.stringify(houseValues(current().live));
		const song = guestSong(stage);
		// Any host move of an echo or reverb control takes the room back for the rest of the song,
		// even from a singer who hasn't saved anything yet.
		if (isHouseChanged && song) resetSongId = song.id;
		state = next;
		unsaved = next;
		(origin ? origin.to('control') : io.to('control')).emit('mixer', next);
		if (isHouseChanged) io.emit('singer:house', house);
		refreshStage();
	}

	function saveSinger(owner: string, sound: SingerSound): boolean {
		try {
			store.saveSinger(owner, sound);
		} catch {
			return false;
		}
		singerSounds.set(owner, sound);
		refreshStage();
		return true;
	}

	// Each phone reads and writes only its own record, so the owner always comes from the caller.
	function attachSinger(socket: Socket, caller: Caller): void {
		const owner = caller.ownerTag;
		socket.on('singer:get', (_raw: unknown, ack?: unknown) => {
			if (!mayDo('singer', caller)) return reply(ack, { ok: false, error: 'forbidden' });
			const snapshot: SingerSnapshot = { sound: soundOf(owner), house: houseValues(current().live), stage: onStage() };
			reply(ack, { ok: true, data: snapshot });
		});
		socket.on('singer:set', (raw: unknown, ack?: unknown) => {
			if (!mayDo('singer', caller)) return reply(ack, { ok: false, error: 'forbidden' });
			const { id, value } = (raw ?? {}) as { id?: unknown; value?: unknown };
			if (!isSingerControlId(id) || typeof value !== 'number') return reply(ack, { ok: false, error: 'invalid' });
			const sound = toSingerSound({ ...soundOf(owner), [id]: value });
			if (!saveSinger(owner, sound)) return reply(ack, { ok: false, error: 'failed' });
			reply(ack, { ok: true, data: sound });
		});
		socket.on('singer:replace', (raw: unknown, ack?: unknown) => {
			if (!mayDo('singer', caller)) return reply(ack, { ok: false, error: 'forbidden' });
			const sound = toSingerSound(raw);
			if (!saveSinger(owner, sound)) return reply(ack, { ok: false, error: 'failed' });
			reply(ack, { ok: true, data: sound });
		});
	}

	function attachWatch(socket: Socket, caller: Caller): void {
		// Asked for when the Sound tab opens, so a host phone that never opens it costs nothing.
		socket.on('mixer:get', (_raw: unknown, ack?: unknown) => {
			if (!mayDo('mixer', caller)) return reply(ack, { ok: false, error: 'forbidden' });
			reply(ack, { ok: true, data: current() });
		});

		socket.on('mixer:watch', () => {
			if (!mayDo('mixer', caller)) return;
			socket.join(WATCHERS);
			watchers.add(socket.id);
			socket.emit('mixer:agent', isAgentConnected);
			socket.emit('mixer:stage', onStage());
			relay.start();
		});
		socket.on('mixer:unwatch', () => unwatch(socket));
		socket.on('mixer:reset-singer', (_raw: unknown, ack?: unknown) => {
			if (!mayDo('mixer', caller)) return reply(ack, { ok: false, error: 'forbidden' });
			const singer = onStage();
			if (!singer || singer.isReset) return reply(ack, { ok: false, error: 'stale' });
			resetSongId = singer.songId;
			refreshStage();
			reply(ack, { ok: true, data: undefined });
		});
		socket.on('disconnect', () => unwatch(socket));
	}

	function attachHost(socket: Socket, caller: Caller): void {
		const act = (event: string, change: (raw: unknown) => MixerState | null | 'invalid', isEcho = false) => {
			socket.on(event, (raw: unknown, ack?: unknown) => {
				if (!mayDo('mixer', caller)) return reply(ack, { ok: false, error: 'forbidden' });
				const next = change(raw);
				if (next === 'invalid') return reply(ack, { ok: false, error: 'invalid' });
				if (!next) return reply(ack, { ok: false, error: 'stale' });
				// A fader's own phone already shows its value; echoing it back would fight the drag.
				commit(next, isEcho ? socket : undefined);
				reply(ack, { ok: true, data: next });
			});
		};

		act(
			'mixer:set',
			(raw) => {
				const { id, value } = (raw ?? {}) as { id?: unknown; value?: unknown };
				if (!isControlId(id) || typeof value !== 'number') return 'invalid';
				return { ...current(), live: { ...current().live, [id]: clampControl(id, value) } };
			},
			true
		);
		act('mixer:load', (raw) => (isId(raw) ? loadPreset(current(), raw) : 'invalid'));
		act('mixer:save', (raw) => (isId(raw) ? saveToPreset(current(), raw) : 'invalid'));
		act('mixer:delete', (raw) => (isId(raw) ? deletePreset(current(), raw) : 'invalid'));
		act('mixer:add', (raw) => {
			const name = cleanPresetName(raw);
			return name ? addPreset(current(), name, newPresetId()) : 'invalid';
		});
		act('mixer:rename', (raw) => {
			const { id, name } = (raw ?? {}) as { id?: unknown; name?: unknown };
			const clean = cleanPresetName(name);
			return isId(id) && clean ? renamePreset(current(), id, clean) : 'invalid';
		});
	}

	function attach(socket: Socket, caller: Caller): void {
		attachSinger(socket, caller);
		attachWatch(socket, caller);
		attachHost(socket, caller);
	}

	return { attach, close: relay.stop, setStage };
}

export const mixerFileContents = (params: MixerParams) => ({ params, apply: toPipewire(params) });
