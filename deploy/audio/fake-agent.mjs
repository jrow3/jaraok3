// Dev only: stands in for karaoke_mixer_agent.py's meter stream, so the Sound tab can be
// worked on without PipeWire. Run the app with the same MIXER_SOCKET, e.g. on Windows:
//   MIXER_SOCKET=\\?\pipe\karaoke-mixer node deploy/audio/fake-agent.mjs
import { createServer } from 'node:net';

const path = process.env.MIXER_SOCKET ?? 'control/mixer.sock';
const started = Date.now();

const level = (seconds, speed, offset) => -40 + 34 * Math.abs(Math.sin(seconds * speed + offset));

createServer((client) => {
	const timer = setInterval(() => {
		const seconds = (Date.now() - started) / 1000;
		const line = { inL: level(seconds, 1.7, 0), inR: level(seconds, 1.1, 1), room: level(seconds, 0.6, 2) + 4 };
		client.write(JSON.stringify(line) + '\n');
	}, 66);
	client.on('close', () => clearInterval(timer));
	client.on('error', () => clearInterval(timer));
}).listen(path, () => console.log(`fake mixer agent on ${path}`));
