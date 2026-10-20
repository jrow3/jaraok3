import { describe, test, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import { createServer as createAgent, type AddressInfo, type Server as AgentServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Server } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import type { QueueItem } from '../types';
import type { MixerParams } from '../features/mixer/controls';
import { DEFAULT_MIXER, type MixerState } from '../features/mixer/presets';
import type { SingerSound } from '../features/mixer/singerSound';
import type { SingerStage } from '../features/mixer/stageSound';
import { createMixer } from './mixer';

// A host or a guest, decided by the test's own handshake flag instead of a PIN cookie.
describe('mixer socket events', () => {
	let http: HttpServer;
	let io: Server;
	let host: Socket;
	let otherHost: Socket;
	let guest: Socket;
	let saved: MixerState[];
	let applied: MixerParams[];
	let isSaveBroken: boolean;
	const singerSounds = new Map<string, SingerSound>([['maya', { reverbTail: -5 }]]);
	let otherSees: MixerState | null;
	let agent: AgentServer;
	let mixer: ReturnType<typeof createMixer>;
	let url: string;
	const levelPath =
		process.platform === 'win32' ? `\\\\?\\pipe\\karaoke-mixer-${process.pid}` : join(tmpdir(), `karaoke-mixer-${process.pid}.sock`);

	beforeAll(async () => {
		// A stand-in host agent that sends one meter reading to whoever connects.
		agent = createAgent((client) => client.write('{"inL":-12,"inR":-90,"room":-6}\n'));
		await new Promise<void>((resolve) => agent.listen(levelPath, resolve));
		http = createServer();
		io = new Server(http, { path: '/ws' });
		mixer = createMixer(io, {
			load: () => DEFAULT_MIXER,
			save: (state) => {
				if (isSaveBroken) throw new Error('disk full');
				saved.push(state);
			},
			apply: (params) => applied.push(params),
			loadSinger: (owner) => singerSounds.get(owner) ?? {},
			saveSinger: (owner, sound) => singerSounds.set(owner, sound),
			levelPath: () => levelPath
		});
		io.on('connection', (socket) => {
			const isHost = socket.handshake.query.host === '1';
			const role = isHost ? 'control' : 'guest';
			socket.join(role);
			mixer.attach(socket, { role, isHost, ownerTag: socket.id });
		});
		await new Promise<void>((resolve) => http.listen(0, resolve));
		url = `http://localhost:${(http.address() as AddressInfo).port}`;
		const as = (query: Record<string, string>) => connect(url, { path: '/ws', transports: ['websocket'], query });
		host = as({ host: '1' });
		otherHost = as({ host: '1' });
		guest = as({});
		otherHost.on('mixer', (state: MixerState) => (otherSees = state));
		await Promise.all([host, otherHost, guest].map((client) => new Promise<void>((resolve) => client.on('connect', () => resolve()))));
	});

	beforeEach(() => {
		saved = [];
		applied = [];
		otherSees = null;
		isSaveBroken = false;
	});

	afterAll(() => {
		[host, otherHost, guest].forEach((client) => client.close());
		mixer.close();
		io.close();
		agent.close();
	});

	const settle = () => new Promise((resolve) => setTimeout(resolve, 120));

	test('the Sound tab reads the current mixer when it opens', async () => {
		expect((await host.emitWithAck('mixer:get', null)).data.activePresetId).toBe('party');
		expect(await guest.emitWithAck('mixer:get', null)).toEqual({ ok: false, error: 'forbidden' });
	});

	test('guests cannot touch the mixer', async () => {
		expect(await guest.emitWithAck('mixer:set', { id: 'reverbTail', value: -5 })).toEqual({ ok: false, error: 'forbidden' });
	});

	test('a change reaches the other host phones and is clamped', async () => {
		const answer = await host.emitWithAck('mixer:set', { id: 'compRatio', value: 99 });
		expect(answer.data.live.compRatio).toBe(20);
		await settle();
		expect(otherSees?.live.compRatio).toBe(20);
	});

	test('a fader drag is saved and applied once, at the value it settles on', async () => {
		for (const value of [-20, -15, -10, -5]) host.emit('mixer:set', { id: 'reverbTail', value });
		await host.emitWithAck('mixer:set', { id: 'reverbTail', value: -4 });
		await settle();
		expect(applied).toHaveLength(1);
		expect(applied[0].reverbTail).toBe(-4);
		expect(saved).toHaveLength(1);
	});

	test('unknown controls and bad values are refused', async () => {
		expect(await host.emitWithAck('mixer:set', { id: 'toString', value: 1 })).toEqual({ ok: false, error: 'invalid' });
		expect(await host.emitWithAck('mixer:set', { id: 'reverbTail', value: '1' })).toEqual({ ok: false, error: 'invalid' });
		expect(await host.emitWithAck('mixer:add', '   ')).toEqual({ ok: false, error: 'invalid' });
	});

	test('presets load, save as, rename and delete', async () => {
		const loaded = await host.emitWithAck('mixer:load', 'dry');
		expect(loaded.data.live.reverbTail).toBe(-70);
		const added = await host.emitWithAck('mixer:add', 'Basement');
		const id = added.data.activePresetId;
		expect((await host.emitWithAck('mixer:rename', { id, name: 'Garage' })).data.presets.at(-1).name).toBe('Garage');
		expect((await host.emitWithAck('mixer:delete', id)).data.activePresetId).toBeNull();
		expect(await host.emitWithAck('mixer:load', id)).toEqual({ ok: false, error: 'stale' });
	});

	test('a host with the Sound tab open hears the agent and its meters', async () => {
		const agentSeen = new Promise((resolve) => host.once('mixer:agent', resolve));
		const levels = new Promise((resolve) => host.once('mixer:levels', resolve));
		host.emit('mixer:watch');
		expect(await agentSeen).toBe(false);
		expect(await levels).toEqual({ inL: -12, inR: -90, room: -6 });
		host.emit('mixer:unwatch');
	});

	describe('the sound on stage', () => {
		let house: MixerParams;
		let stages: (SingerStage | null)[];
		const song = (id: string, extra: Partial<QueueItem> = {}) =>
			({ id, source: 'local', artist: 'A', title: 'T', singer: 'Maya', owner: 'maya', ...extra }) as QueueItem;
		const onStage = (current: QueueItem | null) => mixer.setStage({ current, hold: null });

		beforeAll(() => host.on('mixer:stage', (stage: SingerStage | null) => stages.push(stage)));

		beforeEach(async () => {
			onStage(null);
			house = (await host.emitWithAck('mixer:load', 'party')).data.live;
			await settle();
			applied = [];
			stages = [];
		});

		test("a guest's song plays the house sound with their saved echo and reverb", async () => {
			onStage(song('s1'));
			await settle();
			expect(applied).toEqual([{ ...house, reverbTail: -5 }]);
			expect(stages.at(-1)).toEqual({ songId: 's1', singer: 'Maya', owner: 'maya', isReset: false });
		});

		test('a song added from the host page plays the house sound', async () => {
			onStage(song('s2'));
			await settle();
			onStage(song('h1', { isHouseSound: true }));
			await settle();
			expect(applied.at(-1)).toEqual(house);
			expect(stages.at(-1)).toBeNull();
		});

		test('the hold before a song plays the house sound', async () => {
			onStage(song('s3'));
			await settle();
			mixer.setStage({ current: song('s3'), hold: { until: Date.now() + 5000, next: { singer: 'Maya', title: 'T', artist: 'A' } } });
			await settle();
			expect(applied.at(-1)).toEqual(house);
		});

		test('a host echo or reverb change during the song resets it to the house sound', async () => {
			onStage(song('s4'));
			await host.emitWithAck('mixer:set', { id: 'reverbTail', value: -30 });
			await settle();
			expect(stages.at(-1)?.isReset).toBe(true);
			expect(applied.at(-1)).toEqual({ ...house, reverbTail: -30 });
		});

		test('loading a preset during the song resets it', async () => {
			onStage(song('s5'));
			const arena = (await host.emitWithAck('mixer:load', 'arena')).data.live;
			await settle();
			expect(stages.at(-1)?.isReset).toBe(true);
			expect(applied.at(-1)).toEqual(arena);
		});

		test('a host change outside echo and reverb keeps the singer sound', async () => {
			onStage(song('s6'));
			await host.emitWithAck('mixer:set', { id: 'compRatio', value: 6 });
			await settle();
			expect(stages.at(-1)?.isReset).toBe(false);
			expect(applied.at(-1)).toEqual({ ...house, compRatio: 6, reverbTail: -5 });
		});

		test('the host can reset the singer sound; guests cannot', async () => {
			expect(await host.emitWithAck('mixer:reset-singer', null)).toEqual({ ok: false, error: 'stale' });
			onStage(song('s7'));
			await settle();
			expect(await guest.emitWithAck('mixer:reset-singer', null)).toEqual({ ok: false, error: 'forbidden' });
			expect(await host.emitWithAck('mixer:reset-singer', null)).toEqual({ ok: true, data: undefined });
			await settle();
			expect(stages.at(-1)?.isReset).toBe(true);
			expect(applied.at(-1)).toEqual(house);
			expect(await host.emitWithAck('mixer:reset-singer', null)).toEqual({ ok: false, error: 'stale' });
		});

		test('a settings write that fails still changes the sound in the room', async () => {
			isSaveBroken = true;
			await host.emitWithAck('mixer:set', { id: 'compRatio', value: 6 });
			await settle();
			onStage(song('s9'));
			await settle();
			expect(applied.at(-1)).toEqual({ ...house, compRatio: 6, reverbTail: -5 });
		});

		test('the same singer gets their sound back on their next song', async () => {
			onStage(song('s8'));
			await host.emitWithAck('mixer:reset-singer', null);
			await settle();
			onStage(song('s8b'));
			await settle();
			expect(applied.at(-1)).toEqual({ ...house, reverbTail: -5 });
			expect(stages.at(-1)).toEqual({ songId: 's8b', singer: 'Maya', owner: 'maya', isReset: false });
		});
	});
});
