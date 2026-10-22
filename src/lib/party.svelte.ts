import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';
import type { PartySnapshot, AddInput, QueueItem, AckResult, SystemState, DisplaySettings, SongOutcome } from './types';
import { DEFAULT_TV_THEME } from './themes/themes';

export type { PartySnapshot, AddInput, QueueItem };
export type Role = 'display' | 'control' | 'guest';

const EMPTY: PartySnapshot = {
	current: null,
	isPlaying: false,
	queue: [],
	history: [],
	playKey: 0,
	sungCount: 0,
	sung: [],
	ended: [],
	hold: null
};
const ACK_TIMEOUT_MS = 8000;
const DEFAULT_DISPLAY: DisplaySettings = {
	lyricsLayout: 'full',
	isJoinCodeShown: true,
	isTimeLeftShown: true,
	isUpNextAlwaysShown: true,
	isSingerThemeShown: false,
	tvTheme: DEFAULT_TV_THEME,
	musicLevel: 100
};

// A guest's phone theme goes with each add, so the TV can wear it for the song. The
// server keeps only an id it knows. The host's adds carry none: those songs keep the
// TV theme the host chose.
const withPhoneTheme = (role: Role, input: AddInput) =>
	role === 'guest' ? { ...input, theme: document.documentElement.dataset.theme } : input;

type PartyErrorCode = 'offline' | 'timeout' | 'forbidden' | 'stale' | 'invalid' | 'failed' | 'disabled';
export class PartyActionError extends Error {
	constructor(readonly code: PartyErrorCode) {
		super(code);
	}
}

// A secret per-phone id; the server only ever shows a hash of it. getRandomValues
// (not randomUUID) because the TV and LAN guests use plain http, which is not a
// secure context.
function clientId(): string {
	const fresh = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, '0')).join('');
	try {
		let id = localStorage.getItem('karaoke:client');
		if (!id) {
			id = fresh();
			localStorage.setItem('karaoke:client', id);
		}
		return id;
	} catch {
		return fresh();
	}
}

// Connects to the party server as a given role and exposes the live snapshot as
// reactive state. Actions return promises that reject (PartyActionError) instead of
// being buffered while offline, so a tap made during a dropout never replays later.
// Safe to call during SSR (the socket only opens in the browser). A TV passes the display
// choices its page loaded with, so it never shows the defaults while the socket connects,
// and the display token from its URL, which lets it act as the TV.
export function connectParty(role: Role, initialDisplay: DisplaySettings = DEFAULT_DISPLAY, displayToken?: string) {
	let state = $state<PartySnapshot>(EMPTY);
	let connected = $state(false);
	let received = $state(false);
	let ownerTag = $state('');
	let isHost = $state(false);
	let system = $state<SystemState | null>(null);
	let display = $state<DisplaySettings>(initialDisplay);
	let socket: Socket | null = null;

	if (browser) {
		socket = io({ path: '/ws', query: { role }, auth: { clientId: clientId(), displayToken } });
		socket.on('connect', () => (connected = true));
		socket.on('disconnect', () => {
			connected = false;
			// Offline, the last TV state may be stale; the server sends it again on reconnect.
			system = null;
		});
		socket.on('hello', (hello: { ownerTag: string; isHost: boolean }) => {
			ownerTag = hello.ownerTag;
			isHost = hello.isHost;
		});
		socket.on('system', (next: SystemState) => (system = next));
		socket.on('display-settings', (next: DisplaySettings) => (display = next));
		socket.on('state', (next: PartySnapshot) => {
			state = next;
			received = true;
		});
	}

	function call<T = undefined>(event: string, payload?: unknown): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			if (!socket?.connected) return reject(new PartyActionError('offline'));
			socket.timeout(ACK_TIMEOUT_MS).emit(event, payload, (err: Error | null, res: AckResult<T>) => {
				if (err) return reject(new PartyActionError('timeout'));
				if (!res.ok) return reject(new PartyActionError(res.error));
				resolve(res.data);
			});
		});
	}

	return {
		get state() {
			return state;
		},
		/** Socket is connected right now. */
		get connected() {
			return connected;
		},
		/** At least one real snapshot has arrived (the initial EMPTY placeholder is not real). */
		get received() {
			return received;
		},
		get ownerTag() {
			return ownerTag;
		},
		get isHost() {
			return isHost;
		},
		/** The TV's power state, sent to host (`control`) pages only; null until the server says. */
		get system() {
			return system;
		},
		/** The host's TV choices, sent to TV (`display`) pages only; the defaults until the server says. */
		get display() {
			return display;
		},
		isMine: (item: QueueItem | null | undefined) => !!item && !!ownerTag && item.owner === ownerTag,
		add: (input: AddInput) => call<QueueItem>('queue:add', withPhoneTheme(role, input)),
		addDownload: (input: AddInput) => call<QueueItem>('queue:add-download', withPhoneTheme(role, input)),
		remove: (id: string) => call('queue:remove', id),
		/** Renames this phone's waiting songs; resolves to how many changed. */
		rename: (singer: string) => call<number>('queue:rename', singer),
		requeue: (input: AddInput & { owner?: string }) => call<QueueItem>('queue:requeue', input),
		reorder: (ids: string[]) => call('queue:reorder', ids),
		/** Resolves to how the song was recorded: a host's Next near the end counts as sung. */
		next: (currentId: string) => call<SongOutcome>('playback:next', currentId),
		/** TV only, fire-and-forget: where the song on stage is, so the server can tell a finish from a skip.
		 * Volatile: offline, a burst of old positions would replay on reconnect. */
		progress: (id: string, time: number, duration: number) =>
			socket?.volatile.emit('playback:progress', { id, time, duration }),
		/** The TV couldn't play this song: the server skips it and records it as failed. */
		failed: (currentId: string) => call('playback:failed', currentId),
		/** The TV couldn't embed this YouTube song: the server moves it to a download at the front of the line. */
		embedBlocked: (currentId: string) => call('playback:embed-blocked', currentId),
		restart: () => call('playback:restart'),
		play: () => call('playback:play'),
		pause: () => call('playback:pause'),
		/** Host only: puts a song removed from the line back at `index`. */
		unremove: (id: string, index: number) => call<QueueItem>('queue:unremove', { id, index }),
		/** Host only: takes back a copy "Again" just added, without reporting it to its guest. */
		unrequeue: (id: string) => call('queue:unrequeue', id),
		/** Host only: brings a song the host skipped back on stage. */
		unskip: (id: string) => call('playback:unskip', id),
		/** Host only: turns the TV kiosk on or off. */
		setPower: (isOn: boolean) => call('system:power', isOn),
		/** Host only: a Sound tab request (see src/lib/server/mixer.ts); resolves to the new mixer. */
		mixer: <T>(event: `mixer:${string}`, payload: unknown = null) => call<T>(event, payload),
		/** This phone's own echo and reverb (see src/lib/server/mixer.ts). */
		singer: <T>(event: `singer:${string}`, payload: unknown = null) => call<T>(event, payload),
		/** Fire-and-forget, for events with no answer (the Sound tab's meter subscription).
		 * Dropped while offline: the Sound tab subscribes again on reconnect. */
		send: (event: string) => socket?.volatile.emit(event),
		/** Subscribes to a server event; returns the unsubscribe. */
		listen: <T>(event: string, handler: (payload: T) => void) => {
			socket?.on(event, handler);
			return () => void socket?.off(event, handler);
		},
		close: () => socket?.close(),
		reconnect: () => {
			socket?.disconnect();
			socket?.connect();
		}
	};
}

export type Party = ReturnType<typeof connectParty>;
