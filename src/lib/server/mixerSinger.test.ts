import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Server } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import type { QueueItem } from '../types';
import type { MixerParams } from '../features/mixer/controls';
import { DEFAULT_MIXER } from '../features/mixer/presets';
import { houseValues, type SingerSound } from '../features/mixer/singerSound';
import type { SingerStage } from '../features/mixer/stageSound';
import { createMixer } from './mixer';

// A host or a guest, decided by the test's own handshake flag instead of a PIN cookie.
describe('guests set their own sound', () => {
	let http: HttpServer;
	let io: Server;
	let host: Socket;
	let maya: Socket;
	let ben: Socket;
	let mixer: ReturnType<typeof createMixer>;
	let house: MixerParams;
	let applied: MixerParams[];
	let stages: (SingerStage | null)[];
	let isSingerSaveBroken: boolean;
	const singerSounds = new Map<string, SingerSound>();
	const mayaSong = (id: string) =>
		({ id, source: 'local', artist: 'A', title: 'T', singer: 'Maya', owner: maya.id }) as QueueItem;
	const onStage = (current: QueueItem | null) => mixer.setStage({ current, hold: null });
	const settle = () => new Promise((resolve) => setTimeout(resolve, 120));

	beforeAll(async () => {
		http = createServer();
		io = new Server(http, { path: '/ws' });
		mixer = createMixer(io, {
			load: () => DEFAULT_MIXER,
			save: () => {},
			apply: (params) => applied.push(params),
			loadSinger: (owner) => singerSounds.get(owner) ?? {},
			saveSinger: (owner, sound) => {
				if (isSingerSaveBroken) throw new Error('disk full');
				singerSounds.set(owner, sound);
			},
			levelPath: () => join(tmpdir(), `karaoke-mixer-singer-${process.pid}.sock`)
		});
		io.on('connection', (socket) => {
			const isHost = socket.handshake.query.host === '1';
			const role = isHost ? 'control' : 'guest';
			socket.join(role);
			mixer.attach(socket, { role, isHost, ownerTag: socket.id });
		});
		await new Promise<void>((resolve) => http.listen(0, resolve));
		const url = `http://localhost:${(http.address() as AddressInfo).port}`;
		const as = (query: Record<string, string>) => connect(url, { path: '/ws', transports: ['websocket'], query });
		host = as({ host: '1' });
		maya = as({});
		ben = as({});
		host.on('mixer:stage', (stage: SingerStage | null) => stages.push(stage));
		await Promise.all([host, maya, ben].map((client) => new Promise<void>((resolve) => client.on('connect', () => resolve()))));
	});

	afterAll(() => {
		[host, maya, ben].forEach((client) => client.close());
		mixer.close();
		io.close();
	});

	beforeEach(async () => {
		isSingerSaveBroken = false;
		applied = [];
		onStage(null);
		house = (await host.emitWithAck('mixer:load', 'party')).data.live;
		await maya.emitWithAck('singer:replace', { reverbTail: -8 });
		await settle();
		applied = [];
		stages = [];
	});

	test('only echo and reverb controls can be set', async () => {
		expect(await maya.emitWithAck('singer:set', { id: 'compRatio', value: 6 })).toEqual({ ok: false, error: 'invalid' });
	});

	test("another guest's change is saved but not heard during someone else's song", async () => {
		onStage(mayaSong('g1'));
		await settle();
		applied = [];
		expect(await ben.emitWithAck('singer:set', { id: 'reverbTail', value: -20 })).toEqual({ ok: true, data: { reverbTail: -20 } });
		await settle();
		expect(singerSounds.get(ben.id as string)).toEqual({ reverbTail: -20 });
		expect(applied).toEqual([]);
	});

	test('the singer on stage hears their own change', async () => {
		onStage(mayaSong('g2'));
		await maya.emitWithAck('singer:set', { id: 'reverbTail', value: -12 });
		await settle();
		expect(applied.at(-1)).toEqual({ ...house, reverbTail: -12 });
	});

	test('after a reset the singer still saves but the room keeps the house sound', async () => {
		onStage(mayaSong('g3'));
		await settle();
		await host.emitWithAck('mixer:reset-singer', null);
		await maya.emitWithAck('singer:set', { id: 'reverbTail', value: -14 });
		await settle();
		expect(singerSounds.get(maya.id as string)).toEqual({ reverbTail: -14 });
		expect(applied.at(-1)).toEqual(house);
	});

	test('a save that fails is refused and the room keeps its sound', async () => {
		onStage(mayaSong('g5'));
		await settle();
		applied = [];
		isSingerSaveBroken = true;
		expect(await maya.emitWithAck('singer:set', { id: 'reverbTail', value: -12 })).toEqual({ ok: false, error: 'failed' });
		await settle();
		expect(applied).toEqual([]);
		expect((await maya.emitWithAck('singer:get', null)).data.sound).toEqual({ reverbTail: -8 });
	});

	test('a host reverb change resets the song of a singer with nothing saved yet', async () => {
		await maya.emitWithAck('singer:replace', {});
		onStage(mayaSong('g6'));
		await host.emitWithAck('mixer:set', { id: 'reverbTail', value: -30 });
		await maya.emitWithAck('singer:set', { id: 'reverbTail', value: -12 });
		await settle();
		expect(stages.at(-1)?.isReset).toBe(true);
		expect(applied.at(-1)).toEqual({ ...house, reverbTail: -30 });
	});

	test('partial settings follow a house change', async () => {
		await maya.emitWithAck('singer:replace', { echoLevel: -20 });
		await host.emitWithAck('mixer:set', { id: 'reverbTail', value: -30 });
		onStage(mayaSong('g7'));
		await settle();
		expect(applied.at(-1)).toEqual({ ...house, echoLevel: -20, reverbTail: -30 });
	});

	test('phones hear a house echo or reverb change but not other host changes', async () => {
		const houses: unknown[] = [];
		maya.on('singer:house', (values: unknown) => houses.push(values));
		await host.emitWithAck('mixer:set', { id: 'compRatio', value: 6 });
		await host.emitWithAck('mixer:set', { id: 'reverbTail', value: -30 });
		await settle();
		maya.off('singer:house');
		expect(houses).toEqual([{ ...houseValues(house), reverbTail: -30 }]);
	});

	test('replacing with nothing clears the sound', async () => {
		expect(await maya.emitWithAck('singer:replace', {})).toEqual({ ok: true, data: {} });
		expect((await maya.emitWithAck('singer:get', null)).data.sound).toEqual({});
	});

	test('a phone reads its own sound, the house sound and the stage', async () => {
		onStage(mayaSong('g4'));
		expect((await maya.emitWithAck('singer:get', null)).data).toEqual({
			sound: { reverbTail: -8 },
			house: houseValues(DEFAULT_MIXER.live),
			stage: { songId: 'g4', singer: 'Maya', owner: maya.id, isReset: false }
		});
	});
});
