import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { controlDir } from './env';

// The host's mixer agent (deploy/audio/karaoke-mixer-agent.py) watches this file and
// applies it to PipeWire; the rename means it never reads a half-written file mid-drag.
export function writeMixerFile(params: object): void {
	mkdirSync(controlDir(), { recursive: true });
	const target = join(controlDir(), 'mixer.json');
	const temp = `${target}.tmp`;
	writeFileSync(temp, JSON.stringify(params));
	renameSync(temp, target);
}
