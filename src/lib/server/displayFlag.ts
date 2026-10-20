import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The app only writes a one-word flag; a watcher on the host machine
// (deploy/kiosk/karaoke-kiosk-watch.sh) starts or stops the TV kiosk to match.
const controlDir = () => process.env.CONTROL_DIR ?? '/control';

export function readDisplayFlag(): boolean {
	try {
		return readFileSync(join(controlDir(), 'display'), 'utf8').trim() === 'on';
	} catch {
		// No flag yet: the TV has never been turned on from this server.
		return false;
	}
}

export function writeDisplayFlag(isOn: boolean): void {
	mkdirSync(controlDir(), { recursive: true });
	writeFileSync(join(controlDir(), 'display'), isOn ? 'on' : 'off');
}
