import { afterEach, describe, expect, test, vi } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

const calls = vi.hoisted(() => [] as string[][]);
vi.mock('node:child_process', () => ({
	execFile: (_bin: string, args: string[], _options: unknown, done: (e: Error | null, out?: { stdout: string; stderr: string }) => void) => {
		calls.push(args);
		done(null, { stdout: '{"entries":[]}\n/library/downloads/A - B [YouTube].mp4\n', stderr: '' });
	}
}));

const { searchYouTube, checkEmbeddable } = await import('./youtube');
const { downloadVideo } = await import('./download');

const folder = mkdtempSync(join(tmpdir(), 'karaoke-cookie-calls-'));
const cookieFile = join(folder, 'youtube.txt');
writeFileSync(cookieFile, '# Netscape HTTP Cookie File\n');
process.env.TEMP_DIR = folder;

const lastArgs = () => calls.at(-1) ?? [];

afterEach(() => {
	delete process.env.YT_COOKIES;
});

describe('yt-dlp calls that reach YouTube', () => {
	const runs = {
		search: (query: string) => searchYouTube(query),
		'embed check': () => checkEmbeddable('Sd7sMCA9H3Y'),
		download: () => downloadVideo('Sd7sMCA9H3Y', { artist: 'Adele', title: 'Hello' })
	};

	test.each(Object.entries(runs))('%s passes the cookie file when there is one', async (name, call) => {
		process.env.YT_COOKIES = cookieFile;
		await call(`${name} with cookies`);
		expect(lastArgs().join(' ')).toContain(`--cookies ${cookieFile}`);
	});

	test.each(Object.entries(runs))('%s runs signed out when there is none', async (name, call) => {
		await call(`${name} without cookies`);
		expect(lastArgs()).not.toContain('--cookies');
	});
});

describe('a downloaded video', () => {
	test('is tagged with the channel it came from, so its versions read by channel', async () => {
		await downloadVideo('Sd7sMCA9H3Y', { artist: 'Adele', title: 'Hello' });
		const args = lastArgs();
		expect(args[args.indexOf('-o') + 1]).toBe('Adele - Hello [%(channel|YouTube)s].%(ext)s');
		expect(args).not.toContain('--parse-metadata');
	});
});
