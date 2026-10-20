import { describe, test, expect, afterEach } from 'vitest';
import { createServer, type Server, type Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLevelRelay, type Levels } from './mixerLevels';

// Windows (dev) has named pipes where Linux has unix socket files; net speaks both.
const socketPath = (name: string) =>
	process.platform === 'win32' ? `\\\\?\\pipe\\karaoke-${name}-${process.pid}` : join(tmpdir(), `karaoke-${name}-${process.pid}.sock`);

const waitFor = async (check: () => boolean) => {
	for (let tries = 0; tries < 100 && !check(); tries++) await new Promise((resolve) => setTimeout(resolve, 10));
	expect(check()).toBe(true);
};

describe('level relay', () => {
	let agent: Server | null = null;
	let relay: ReturnType<typeof createLevelRelay> | null = null;
	afterEach(() => {
		relay?.stop();
		agent?.close();
	});

	test('passes on the latest whole reading and reports the agent', async () => {
		const path = socketPath('levels');
		agent = createServer((client: Socket) => {
			client.write('{"inL":-20,"inR":-30,"room":-12}\n{"inL":-6,');
			setTimeout(() => client.write('"inR":-7,"room":-3}\nnot json\n'), 20);
		});
		await new Promise<void>((resolve) => agent!.listen(path, resolve));
		const seen: Levels[] = [];
		const agentStates: boolean[] = [];
		relay = createLevelRelay({ path: () => path, onLevels: (levels) => seen.push(levels), onAgent: (is) => agentStates.push(is) });
		relay.start();
		await waitFor(() => seen.length === 2);
		expect(seen[1]).toEqual({ inL: -6, inR: -7, room: -3 });
		expect(agentStates).toEqual([true]);
	});

	test('says the agent is missing when nothing is listening', async () => {
		const agentStates: boolean[] = [];
		relay = createLevelRelay({ path: () => socketPath('nobody'), onLevels: () => {}, onAgent: (is) => agentStates.push(is) });
		relay.start();
		await waitFor(() => agentStates.length === 1);
		expect(agentStates).toEqual([false]);
	});
});
