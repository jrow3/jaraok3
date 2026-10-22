import type { Server as HttpServer } from 'node:http';
import type { Http2SecureServer } from 'node:http2';
import { Server, type Socket } from 'socket.io';
import { PartyState, type QueueItem } from './party';
import { completeDownload } from './downloads';
import { recordPlay } from './playlog';
import { findDownloaded } from './ytindex';
import { getDb } from './db';
import { songHoldMs, getSettings, displaySettings } from './settings';
import { onSettingsSaved } from './settingsSaved';
import { verifyToken, COOKIE_NAME } from './auth';
import { mayDo, cookieValue, ownerTagFor, grantedRole, type Caller, type PartyAction } from './permissions';
import { toAddInput, toRequeueInput, toIdList, toId, toSinger, toUndoRemoval, toProgress } from './validate';
import { reply } from './reply';
import { attachSystem } from './system';
import { readFeatures } from './features';
import { createMixer, MIXER_EVENTS } from './mixer';
import { mixerStore } from './mixerStore';
import { holdTimer } from './holdTimer';

// One party per running server. Every view connects here; the server owns the
// truth and broadcasts a fresh snapshot on each change.
let io: Server | null = null;
// Read at every song change, because the settings API saves it from another module instance.
const party = new PartyState({ holdMs: () => songHoldMs(getDb()) });

const currentDisplaySettings = () => displaySettings(getSettings(getDb()));

// A feature switched off in .env still answers its events, so a page opened before the
// switch gets a clear "disabled" instead of waiting out a timeout.
function refuseAll(socket: Socket, events: readonly string[]): void {
	for (const event of events) socket.on(event, (_raw: unknown, ack?: unknown) => reply(ack, { ok: false, error: 'disabled' }));
}

function identify(socket: Socket): Caller {
	const pin = process.env.ADMIN_PIN ?? '';
	const isHost = !pin || verifyToken(cookieValue(socket.handshake.headers.cookie, COOKIE_NAME), pin);
	const role = grantedRole(String(socket.handshake.query.role ?? 'guest'), isHost, {
		configured: process.env.DISPLAY_TOKEN,
		sent: socket.handshake.auth?.displayToken
	});
	const raw = socket.handshake.auth?.clientId;
	const clientId = typeof raw === 'string' && raw.length >= 16 && raw.length <= 128 ? raw : socket.id;
	return { role, isHost, ownerTag: ownerTagFor(clientId) };
}

// Play-log: record every add for the recommender. A new `session` starts after a
// >6h gap (delimits parties on a long-running server). Logging never breaks the party.
const SESSION_GAP_MS = 6 * 60 * 60 * 1000;
let session = `s${Date.now()}`;
let lastAddAt = 0;
function currentSession(): string {
	const now = Date.now();
	if (now - lastAddAt > SESSION_GAP_MS) session = `s${now}`;
	lastAddAt = now;
	return session;
}
function logAdd(item: Pick<QueueItem, 'songId' | 'artist' | 'title' | 'singer'>): void {
	try {
		recordPlay(getDb(), {
			songId: item.songId ?? null,
			artist: item.artist,
			title: item.title,
			singer: item.singer,
			session: currentSession()
		});
	} catch (error) {
		// Logging must never disrupt playback.
		console.error('[karaoke] could not record a play:', error);
	}
}

async function safely(label: string, run: () => unknown, onError?: () => void): Promise<void> {
	try {
		await run();
	} catch (error) {
		console.error(`[karaoke] ${label} failed:`, error);
		onError?.();
	}
}

export function attachSocket(httpServer: HttpServer | Http2SecureServer): Server {
	if (io) return io;
	const features = readFeatures();
	const server = new Server(httpServer, { path: '/ws', serveClient: false });
	io = server;
	// Every change goes through here, so whichever event started a hold (a song that
	// ended, a skip, a song that failed) also schedules its end.
	const broadcast = () => {
		const snapshot = party.snapshot();
		io?.emit('state', snapshot);
		mixer?.setStage(snapshot);
		if (snapshot.hold) endHoldLater(snapshot.hold.until);
	};
	const endHoldLater = holdTimer(party, broadcast);
	// TVs follow the host's display choices as they're saved, without a reload.
	onSettingsSaved(() =>
		safely('display-settings', () => server.to('display').emit('display-settings', currentDisplaySettings()))
	);
	const mixer = features.isMixerOn ? createMixer(server, mixerStore) : null;

	io.on('connection', (socket) => {
		const caller = identify(socket);
		socket.join(caller.role);
		socket.emit('hello', { ownerTag: caller.ownerTag, isHost: caller.isHost });
		socket.emit('state', party.snapshot());
		if (caller.role === 'display') safely('display-settings', () => socket.emit('display-settings', currentDisplaySettings()));
		if (features.isKioskOn) attachSystem(server, socket, caller);
		else refuseAll(socket, ['system:power']);
		if (mixer) mixer.attach(socket, caller);
		else refuseAll(socket, MIXER_EVENTS);

		const houseSound = caller.role === 'control' && caller.isHost ? { isHouseSound: true } : {};

		// A throw inside a handler (a locked database, say) answers that one call with
		// 'failed' instead of taking the whole party down with an uncaught exception.
		type Handler = (raw: unknown, ack?: unknown) => unknown;
		const on = (event: string, handler: Handler) =>
			socket.on(event, (raw: unknown, ack?: unknown) =>
				safely(event, () => handler(raw, ack), () => reply(ack, { ok: false, error: 'failed' }))
			);

		const guard = (action: PartyAction, ack: unknown, item?: { owner?: string } | null) => {
			if (mayDo(action, caller, item)) return true;
			reply(ack, { ok: false, error: 'forbidden' });
			return false;
		};

		on('queue:add', (raw: unknown, ack?: unknown) => {
			if (!guard('add', ack)) return;
			const input = toAddInput(raw);
			if (!input || party.isFull) return reply(ack, { ok: false, error: 'invalid' });
			if (input.source === 'youtube' && !features.isYoutubeOn) return reply(ack, { ok: false, error: 'disabled' });
			const item = party.addOrStart({ ...input, ...houseSound, owner: caller.ownerTag });
			logAdd(item);
			broadcast();
			reply(ack, { ok: true, data: item });
		});
		on('queue:add-download', async (raw: unknown, ack?: unknown) => {
			if (!guard('add', ack)) return;
			const input = toAddInput(raw);
			if (!input || !input.ytId || party.isFull) return reply(ack, { ok: false, error: 'invalid' });
			// Off, earlier downloads are still in the library, and found by a local search.
			if (!features.isDownloadsOn) return reply(ack, { ok: false, error: 'disabled' });
			// Already pulled this exact video before? Queue the local copy instead of
			// downloading it again.
			const have = findDownloaded(getDb(), input.ytId);
			if (have) {
				const ready = party.addOrStart({
					...input,
					source: 'local-video',
					songId: have.songId,
					artist: have.artist,
					title: have.title,
					discTag: have.discTag,
					status: 'ready',
					...houseSound,
					owner: caller.ownerTag
				});
				logAdd(ready);
				broadcast();
				return reply(ack, { ok: true, data: ready });
			}
			const item = party.add({
				...input,
				...houseSound,
				source: 'youtube',
				status: 'downloading',
				owner: caller.ownerTag
			});
			broadcast();
			reply(ack, { ok: true, data: item });
			const video = await completeDownload(party, { id: item.id, ytId: input.ytId, artist: item.artist, title: item.title }, broadcast);
			if (video) logAdd({ ...video, singer: item.singer });
		});
		on('queue:remove', (raw: unknown, ack?: unknown) => {
			const id = toId(raw);
			if (id === null) return reply(ack, { ok: false, error: 'invalid' });
			const item = party.queued(id);
			if (!item) return reply(ack, { ok: false, error: 'stale' });
			if (!guard('remove', ack, item)) return;
			// Taking back your own song is no news to you; only someone else's removal
			// (the host's) is reported to the owner.
			party.remove(id, item.owner === caller.ownerTag ? undefined : 'removed');
			broadcast();
			reply(ack, { ok: true, data: undefined });
		});
		on('queue:rename', (raw: unknown, ack?: unknown) => {
			const singer = toSinger(raw);
			if (singer === null) return reply(ack, { ok: false, error: 'invalid' });
			const renamed = party.rename((item) => mayDo('rename', caller, item), singer);
			if (renamed > 0) broadcast();
			reply(ack, { ok: true, data: renamed });
		});
		on('queue:requeue', (raw: unknown, ack?: unknown) => {
			if (!guard('requeue', ack)) return;
			const input = toRequeueInput(raw);
			if (!input) return reply(ack, { ok: false, error: 'invalid' });
			// Requeue is host-only, so the owner sent here is trusted: the song stays the guest's.
			const item = party.requeueToFront({ ...input, owner: input.owner ?? caller.ownerTag });
			broadcast();
			reply(ack, { ok: true, data: item });
		});
		on('queue:reorder', (raw: unknown, ack?: unknown) => {
			if (!guard('reorder', ack)) return;
			const ids = toIdList(raw);
			if (!ids) return reply(ack, { ok: false, error: 'invalid' });
			party.reorder(ids);
			broadcast();
			reply(ack, { ok: true, data: undefined });
		});
		on('playback:restart', (_: unknown, ack?: unknown) => {
			if (!guard('restart', ack)) return;
			party.restartCurrent();
			broadcast();
			reply(ack, { ok: true, data: undefined });
		});
		on('playback:next', (raw: unknown, ack?: unknown) => {
			const { current } = party.snapshot();
			if (!guard('next', ack, current)) return;
			const id = toId(raw);
			if (id === null) return reply(ack, { ok: false, error: 'invalid' });
			// Only the TV knows a song played to the end; a "next" from anyone else is a skip,
			// unless it comes in the song's last stretch, when the singing is already done, or
			// the singer ends their own song, which they still sang.
			const isSingerEnding = caller.role === 'guest' && current?.owner === caller.ownerTag;
			const outcome = caller.role === 'display' || party.isNearEnd() || isSingerEnding ? 'sung' : 'skipped';
			if (!party.nextFrom(id, outcome)) return reply(ack, { ok: false, error: 'stale' });
			broadcast();
			reply(ack, { ok: true, data: outcome });
		});
		// No answer and no broadcast: it only lets a later host Next tell a finish from a skip.
		on('playback:progress', (raw: unknown) => {
			if (!mayDo('progress', caller)) return;
			const progress = toProgress(raw);
			if (progress) party.noteProgress(progress.id, progress.time, progress.duration);
		});
		on('playback:failed', (raw: unknown, ack?: unknown) => {
			if (!guard('fail', ack)) return;
			const id = toId(raw);
			if (id === null) return reply(ack, { ok: false, error: 'invalid' });
			if (!party.nextFrom(id, 'failed')) return reply(ack, { ok: false, error: 'stale' });
			broadcast();
			reply(ack, { ok: true, data: undefined });
		});
		// Its owner turned off embedding, but a download of it can still be sung, so it is
		// not recorded as failed: it waits at the front of the line until the download is ready.
		on('playback:embed-blocked', (raw: unknown, ack?: unknown) => {
			if (!guard('fail', ack)) return;
			const id = toId(raw);
			if (id === null) return reply(ack, { ok: false, error: 'invalid' });
			// With downloads off there's nothing to wait for: it fails like any song that can't play.
			if (!features.isDownloadsOn) {
				if (!party.failBlockedYoutube(id)) return reply(ack, { ok: false, error: 'stale' });
				broadcast();
				return reply(ack, { ok: true, data: undefined });
			}
			const download = party.moveToDownload(id);
			if (!download?.ytId) return reply(ack, { ok: false, error: 'stale' });
			broadcast();
			reply(ack, { ok: true, data: undefined });
			void completeDownload(
				party,
				{ id: download.id, ytId: download.ytId, artist: download.artist, title: download.title },
				broadcast
			);
		});
		on('playback:play', (_: unknown, ack?: unknown) => {
			if (!guard('play', ack)) return;
			party.play();
			broadcast();
			reply(ack, { ok: true, data: undefined });
		});
		on('playback:pause', (_: unknown, ack?: unknown) => {
			if (!guard('pause', ack)) return;
			party.pause();
			broadcast();
			reply(ack, { ok: true, data: undefined });
		});
		on('queue:unremove', (raw: unknown, ack?: unknown) => {
			if (!guard('undo', ack)) return;
			const input = toUndoRemoval(raw);
			if (!input) return reply(ack, { ok: false, error: 'invalid' });
			const item = party.unremove(input.id, input.index);
			if (!item) return reply(ack, { ok: false, error: 'stale' });
			broadcast();
			reply(ack, { ok: true, data: item });
		});
		// Undo after Again. A requeue keeps the guest as owner, so queue:remove would tell
		// them "Removed by the host" about a copy they never asked for.
		on('queue:unrequeue', (raw: unknown, ack?: unknown) => {
			if (!guard('undo', ack)) return;
			const id = toId(raw);
			if (id === null) return reply(ack, { ok: false, error: 'invalid' });
			if (!party.queued(id)) return reply(ack, { ok: false, error: 'stale' });
			party.remove(id);
			broadcast();
			reply(ack, { ok: true, data: undefined });
		});
		on('playback:unskip', (raw: unknown, ack?: unknown) => {
			if (!guard('undo', ack)) return;
			const id = toId(raw);
			if (id === null) return reply(ack, { ok: false, error: 'invalid' });
			if (!party.unskip(id)) return reply(ack, { ok: false, error: 'stale' });
			broadcast();
			reply(ack, { ok: true, data: undefined });
		});
	});

	return io;
}
