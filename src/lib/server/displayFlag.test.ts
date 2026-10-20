import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readDisplayFlag, writeDisplayFlag } from './displayFlag';

describe('display flag', () => {
	let dir: string;
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'karaoke-control-'));
		process.env.CONTROL_DIR = join(dir, 'control');
	});
	afterEach(() => {
		delete process.env.CONTROL_DIR;
		rmSync(dir, { recursive: true, force: true });
	});

	test('reads as off before anything was written', () => {
		expect(readDisplayFlag()).toBe(false);
	});

	test('writes the flag the kiosk watcher reads, creating its folder', () => {
		writeDisplayFlag(true);
		expect(readDisplayFlag()).toBe(true);
		writeDisplayFlag(false);
		expect(readDisplayFlag()).toBe(false);
	});
});
