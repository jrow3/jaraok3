import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { writeMixerFile } from './mixerFile';

describe('mixer file', () => {
	let dir: string;
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'karaoke-control-'));
		process.env.CONTROL_DIR = join(dir, 'control');
	});
	afterEach(() => {
		delete process.env.CONTROL_DIR;
		rmSync(dir, { recursive: true, force: true });
	});

	test('writes the params the host agent reads, creating its folder', () => {
		writeMixerFile({ masterVolume: 0.8 });
		const written = JSON.parse(readFileSync(join(dir, 'control', 'mixer.json'), 'utf8'));
		expect(written).toEqual({ masterVolume: 0.8 });
	});

	test('leaves no temp file behind, so the agent only ever sees whole files', () => {
		writeMixerFile({ masterVolume: 0.5 });
		writeMixerFile({ masterVolume: 0.6 });
		expect(readdirSync(join(dir, 'control'))).toEqual(['mixer.json']);
	});
});
