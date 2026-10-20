import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { io as connect, type Socket } from 'socket.io-client';
import type { Server } from 'socket.io';
import type { QueueItem } from '../types';
import { attachSocket } from './socket';
import { tokenFor, COOKIE_NAME } from './auth';

const PIN = '4321';

// Only the refusals: an accepted report starts a real yt-dlp download. The host stands in
// for the TV, which may send it too, because a display connection reads the settings database.
describe('playback:embed-blocked, the TV reporting a YouTube song it cannot embed', () => {
	let http: HttpServer;
	let io: Server;
	let host: Socket;
	let guest: Socket;
	let onStage: QueueItem;

	beforeAll(async () => {
		process.env.ADMIN_PIN = PIN;
		// These tests are about moving a blocked song to a download, so downloads are on
		// whatever folders this machine has.
		process.env.DOWNLOADS = 'on';
		// A database that doesn't exist, so the play log of the test's adds never reaches the real one.
		process.env.DB_PATH = join(tmpdir(), 'karaoke-socket-test-missing.db');
		http = createServer();
		io = attachSocket(http);
		await new Promise<void>((resolve) => http.listen(0, resolve));
		const url = `http://localhost:${(http.address() as AddressInfo).port}`;
		const options = { path: '/ws', transports: ['websocket'] };
		host = connect(url, { ...options, query: { role: 'control' }, extraHeaders: { cookie: `${COOKIE_NAME}=${tokenFor(PIN)}` } });
		guest = connect(url, { ...options, query: { role: 'guest' } });
		await Promise.all([host, guest].map((client) => new Promise((resolve) => client.on('hello', resolve))));
		const added = await host.emitWithAck('queue:add', {
			source: 'local',
			songId: 1,
			artist: 'Abba',
			title: 'Waterloo',
			singer: 'Priya'
		});
		onStage = added.data;
	});

	afterAll(() => {
		[host, guest].forEach((client) => client.close());
		io.close();
	});

	test('a guest may not report it', async () => {
		expect(await guest.emitWithAck('playback:embed-blocked', onStage.id)).toEqual({ ok: false, error: 'forbidden' });
	});

	test('a payload that is not an id is refused', async () => {
		expect(await host.emitWithAck('playback:embed-blocked', { id: 42 })).toEqual({ ok: false, error: 'invalid' });
	});

	test('a song no longer on stage is stale', async () => {
		expect(await host.emitWithAck('playback:embed-blocked', 'q000000000000')).toEqual({ ok: false, error: 'stale' });
	});

	test('a song on stage that is not from YouTube is stale', async () => {
		expect(await host.emitWithAck('playback:embed-blocked', onStage.id)).toEqual({ ok: false, error: 'stale' });
	});
});
