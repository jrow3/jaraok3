import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import Database from 'better-sqlite3';
import { join } from 'node:path';
import { io as connect, type Socket } from 'socket.io-client';
import type { Server } from 'socket.io';
import { attachSocket } from './socket';

// A fresh install: no MIXER, KIOSK or downloads folder in its .env. The host still asks,
// say from a page opened before the switch, and gets a clear answer instead of a timeout.
describe('features switched off in .env', () => {
	let http: HttpServer;
	let io: Server;
	let host: Socket;

	beforeAll(async () => {
		delete process.env.ADMIN_PIN;
		for (const name of ['MIXER', 'KIOSK', 'DOWNLOADS']) delete process.env[name];
		process.env.DOWNLOADS_DIR = join(tmpdir(), 'karaoke-no-downloads-folder');
		// An empty database of its own, so nothing reaches the real one. Left in the temp
		// folder: the server keeps it open, and Windows won't delete an open file.
		const dir = mkdtempSync(join(tmpdir(), 'karaoke-features-'));
		process.env.DB_PATH = join(dir, 'index.db');
		new Database(process.env.DB_PATH).close();
		http = createServer();
		io = attachSocket(http);
		await new Promise<void>((resolve) => http.listen(0, resolve));
		const url = `http://localhost:${(http.address() as AddressInfo).port}`;
		host = connect(url, { path: '/ws', transports: ['websocket'], query: { role: 'control' } });
		await new Promise((resolve) => host.on('hello', resolve));
	});

	afterAll(() => {
		host.close();
		io.close();
		delete process.env.DOWNLOADS_DIR;
	});

	test('the Sound tab and singer sound answer disabled', async () => {
		expect(await host.emitWithAck('mixer:get', null)).toEqual({ ok: false, error: 'disabled' });
		expect(await host.emitWithAck('singer:get', null)).toEqual({ ok: false, error: 'disabled' });
	});

	test('the System button answers disabled', async () => {
		expect(await host.emitWithAck('system:power', true)).toEqual({ ok: false, error: 'disabled' });
	});

	test('a video that would need downloading answers disabled', async () => {
		const pick = { source: 'youtube', ytId: 'Sd7sMCA9H3Y', artist: 'Adele', title: 'Hello', singer: 'Priya' };
		expect(await host.emitWithAck('queue:add-download', pick)).toEqual({ ok: false, error: 'disabled' });
	});

	test('a blocked-embed report for anything but the YouTube song on stage is stale', async () => {
		expect(await host.emitWithAck('playback:embed-blocked', 'q000000000000')).toEqual({ ok: false, error: 'stale' });
	});
});
