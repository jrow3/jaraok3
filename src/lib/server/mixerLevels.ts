import { connect, type Socket } from 'node:net';
import { join } from 'node:path';

export interface Levels {
	inL: number;
	inR: number;
	room: number;
}

const RETRY_MS = 3000;

export const levelSocketPath = () =>
	process.env.MIXER_SOCKET ?? join(process.env.CONTROL_DIR ?? '/control', 'mixer.sock');

const isLevels = (value: unknown): value is Levels =>
	!!value &&
	typeof value === 'object' &&
	['inL', 'inR', 'room'].every((key) => typeof (value as Record<string, unknown>)[key] === 'number');

function parseLevels(line: string): Levels | null {
	try {
		const value = JSON.parse(line);
		return isLevels(value) ? value : null;
	} catch {
		// A garbled line is one missed meter frame.
		return null;
	}
}

// Listens to the host agent's meter stream only while someone has the Sound tab open:
// the agent runs its PipeWire taps only while something is connected.
export function createLevelRelay(options: {
	path: () => string;
	onLevels: (levels: Levels) => void;
	onAgent: (isConnected: boolean) => void;
}) {
	let socket: Socket | null = null;
	let retry: ReturnType<typeof setTimeout> | null = null;
	let isWanted = false;

	function open(): void {
		let buffered = '';
		const next = connect(options.path());
		socket = next;
		next.setEncoding('utf8');
		next.on('connect', () => options.onAgent(true));
		next.on('data', (chunk: string) => {
			const lines = (buffered + chunk).split('\n');
			buffered = lines.pop() ?? '';
			const latest = lines.map(parseLevels).findLast((levels) => levels !== null);
			if (latest) options.onLevels(latest);
		});
		// "close" follows "error" too, so a missing agent and a dropped one are handled once, here.
		next.on('error', () => {});
		next.on('close', () => {
			if (socket !== next) return;
			socket = null;
			options.onAgent(false);
			if (isWanted) retry = setTimeout(open, RETRY_MS);
		});
	}

	return {
		start(): void {
			if (isWanted) return;
			isWanted = true;
			open();
		},
		stop(): void {
			isWanted = false;
			if (retry) clearTimeout(retry);
			retry = null;
			const current = socket;
			socket = null;
			current?.destroy();
		}
	};
}
