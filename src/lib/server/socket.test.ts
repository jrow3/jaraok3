import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io as connect, type Socket } from 'socket.io-client';
import type { Server } from 'socket.io';
import type { PartySnapshot, QueueItem } from '../types';
import { attachSocket } from './socket';
import { tokenFor, COOKIE_NAME } from './auth';
import { ownerTagFor } from './permissions';

const PIN = '4321';
const GUEST_ID = 'guest-phone-0123456789';

const song = (title: string) => ({ source: 'local', songId: 1, artist: 'Abba', title, singer: 'Priya' });

// attachSocket is a singleton, so every describe shares one server.
let http: HttpServer;
let io: Server;
let url: string;

beforeAll(async () => {
	process.env.ADMIN_PIN = PIN;
	// A database that doesn't exist, so the play log of the test's adds never reaches the real one.
	process.env.DB_PATH = join(tmpdir(), 'karaoke-socket-test-missing.db');
	http = createServer();
	io = attachSocket(http);
	await new Promise<void>((resolve) => http.listen(0, resolve));
	url = `http://localhost:${(http.address() as AddressInfo).port}`;
});

afterAll(() => {
	io.close();
});

describe('queue:unrequeue, the Undo after Again', () => {
	let host: Socket;
	let guest: Socket;
	let latest: PartySnapshot;

	beforeAll(async () => {
		const options = { path: '/ws', transports: ['websocket'], query: { role: 'guest' } };
		host = connect(url, { ...options, extraHeaders: { cookie: `${COOKIE_NAME}=${tokenFor(PIN)}` } });
		guest = connect(url, { ...options, auth: { clientId: GUEST_ID } });
		host.on('state', (snapshot: PartySnapshot) => (latest = snapshot));
		await Promise.all([host, guest].map((client) => new Promise((resolve) => client.on('hello', resolve))));
		await host.emitWithAck('queue:add', song('On stage'));
	});

	afterAll(() => {
		host.close();
		guest.close();
	});

	async function requeueGuestSong(): Promise<QueueItem> {
		const answer = await host.emitWithAck('queue:requeue', { ...song('Waterloo'), owner: ownerTagFor(GUEST_ID) });
		return answer.data;
	}

	test('only the host may take back a copy', async () => {
		const copy = await requeueGuestSong();
		expect(await guest.emitWithAck('queue:unrequeue', copy.id)).toEqual({ ok: false, error: 'forbidden' });
	});

	test('a payload that is not an id is refused', async () => {
		expect(await host.emitWithAck('queue:unrequeue', { id: 42 })).toEqual({ ok: false, error: 'invalid' });
	});

	test('the copy leaves the line without telling its guest it was removed by the host', async () => {
		const copy = await requeueGuestSong();
		expect(await host.emitWithAck('queue:unrequeue', copy.id)).toMatchObject({ ok: true });
		expect(latest.queue.some((item) => item.id === copy.id)).toBe(false);
		expect(latest.ended.some((ended) => ended.id === copy.id)).toBe(false);
	});

	test('a copy already gone is too late to take back', async () => {
		expect(await host.emitWithAck('queue:unrequeue', 'q000000000000')).toEqual({ ok: false, error: 'stale' });
	});

	test('a guest may not end a song on stage that is not theirs', async () => {
		expect(await guest.emitWithAck('playback:next', latest.current?.id)).toEqual({ ok: false, error: 'forbidden' });
	});
});

describe('songs added from the host page', () => {
	let hostPage: Socket;
	let hostOnGuestPage: Socket;
	let guestPosingAsHost: Socket;

	beforeAll(async () => {
		const extraHeaders = { cookie: `${COOKIE_NAME}=${tokenFor(PIN)}` };
		const options = { path: '/ws', transports: ['websocket'], extraHeaders };
		hostPage = connect(url, { ...options, query: { role: 'control' } });
		hostOnGuestPage = connect(url, { ...options, query: { role: 'guest' } });
		guestPosingAsHost = connect(url, { path: '/ws', transports: ['websocket'], query: { role: 'control' } });
		await Promise.all([hostPage, hostOnGuestPage, guestPosingAsHost].map((client) => new Promise((resolve) => client.on('hello', resolve))));
	});

	afterAll(() => {
		hostPage.close();
		hostOnGuestPage.close();
		guestPosingAsHost.close();
	});

	test('a host-page add plays with the house sound', async () => {
		const { data } = await hostPage.emitWithAck('queue:add', song('Dancing Queen'));
		expect(data.isHouseSound).toBe(true);
	});

	test('a guest-page add, even by the host, does not', async () => {
		const { data } = await hostOnGuestPage.emitWithAck('queue:add', song('Fernando'));
		expect(data).not.toHaveProperty('isHouseSound');
	});

	test('a control connection without the PIN does not', async () => {
		const { data } = await guestPosingAsHost.emitWithAck('queue:add', song('Chiquitita'));
		expect(data).not.toHaveProperty('isHouseSound');
	});
});

describe('the sound on stage without a database', () => {
	let guest: Socket;

	beforeAll(async () => {
		guest = connect(url, { path: '/ws', transports: ['websocket'], query: { role: 'guest' }, auth: { clientId: 'stage-phone-0123456789' } });
		await new Promise((resolve) => guest.on('hello', resolve));
	});

	afterAll(() => {
		guest.close();
	});

	test('a song settling on stage keeps the server up', async () => {
		await guest.emitWithAck('queue:add', song('Mamma Mia'));
		// Past the mixer's settle delay, so its timer has run.
		await new Promise((resolve) => setTimeout(resolve, 200));
		expect((await guest.emitWithAck('queue:add', song('SOS'))).ok).toBe(true);
	});
});

describe('the display token', () => {
	const options = { path: '/ws', transports: ['websocket'], query: { role: 'display' } };
	const join = async (auth: Record<string, string>) => {
		const client = connect(url, { ...options, auth });
		await new Promise((resolve) => client.on('hello', resolve));
		return client;
	};

	beforeAll(() => {
		process.env.DISPLAY_TOKEN = 'tv-secret';
	});
	afterAll(() => {
		delete process.env.DISPLAY_TOKEN;
	});

	test('a phone posing as the TV cannot fail the song on stage', async () => {
		const phone = await join({ clientId: 'posing-phone-0123456789' });
		const answer = await phone.emitWithAck('playback:failed', 'no-such-song');
		phone.close();
		expect(answer).toEqual({ ok: false, error: 'forbidden' });
	});

	test('the TV with the token may report a failure', async () => {
		const tv = await join({ clientId: 'the-tv-0123456789abcd', displayToken: 'tv-secret' });
		const answer = await tv.emitWithAck('playback:failed', 'no-such-song');
		tv.close();
		expect(answer).toEqual({ ok: false, error: 'stale' });
	});
});
