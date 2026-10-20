import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { rescan, runJob } from './rescan';

// Each test starts a real child process through tsx, which takes a moment.
const CHILD_MS = 20_000;

describe('rescan', () => {
	let dir: string;
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'karaoke-rescan-'));
		writeFileSync(join(dir, 'Abba - Waterloo [SC Karaoke].mp3'), '');
		writeFileSync(join(dir, 'Abba - Waterloo [SC Karaoke].cdg'), '');
	});
	afterEach(() => rmSync(dir, { recursive: true, force: true }));

	test('scans the library in a separate process and reports what it found', async () => {
		const stats = await rescan(dir, join(dir, 'index.db'));
		expect(stats).toMatchObject({ songs: 1, withLyrics: 1 });
	}, CHILD_MS);

	test('a second rescan while one runs joins it instead of starting another', async () => {
		const first = rescan(dir, join(dir, 'index.db'));
		expect(rescan(dir, join(dir, 'index.db'))).toBe(first);
		await first;
	}, CHILD_MS);

	test('a scan that fails rejects with its error, not the Node version line', async () => {
		await expect(rescan(join(dir, 'missing'), join(dir, 'index.db'))).rejects.toThrow(
			'Rescan failed (exit 1): Error: ENOENT: no such file or directory'
		);
	}, CHILD_MS);

	test('a job that exits cleanly without stats rejects instead of crashing the server', async () => {
		await expect(runJob(['-e', 'process.stdout.write("not json")'])).rejects.toThrow(SyntaxError);
	}, CHILD_MS);

	test('a job that hangs is stopped at the time limit, so later rescans are not stuck behind it', async () => {
		await expect(runJob(['-e', 'setTimeout(() => {}, 60_000)'], 500)).rejects.toThrow('Rescan failed');
	}, CHILD_MS);

	// A child stuck in uninterruptible I/O on the USB drive never closes, whatever it is sent.
	test('a job that ignores being stopped still settles at the time limit', async () => {
		const ignoreStop = () => {};
		await expect(runJob(['-e', 'setTimeout(() => {}, 3_000)'], 500, ignoreStop)).rejects.toThrow(
			'Rescan failed (timed out)'
		);
	}, CHILD_MS);
});
