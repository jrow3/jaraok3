import { afterEach, describe, expect, test, vi } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('$env/dynamic/private', () => ({ env: {} }));
vi.mock('$lib/server/ytdlpUpdate', () => ({
	ytdlpVersion: async () => '2026.09.25',
	updateYtdlp: async () => ({ kind: 'up-to-date', version: '2026.09.25' })
}));

const { GET } = await import('./+server');

const cookieFile = join(mkdtempSync(join(tmpdir(), 'karaoke-ytdlp-route-')), 'youtube.txt');
writeFileSync(cookieFile, '# Netscape HTTP Cookie File\n');

const answer = async () => {
	const response = await GET({} as Parameters<typeof GET>[0]);
	return response.json();
};

afterEach(() => {
	delete process.env.YT_COOKIES;
});

describe('GET /api/ytdlp', () => {
	test('says cookies are in use without revealing where they are', async () => {
		process.env.YT_COOKIES = cookieFile;
		const body = await answer();
		expect(body).toEqual({ version: '2026.09.25', hasCookies: true });
		expect(JSON.stringify(body)).not.toContain('youtube.txt');
	});
	test('says there are no cookies when the file is missing', async () => {
		process.env.YT_COOKIES = join(tmpdir(), 'no-such-cookies.txt');
		expect(await answer()).toEqual({ version: '2026.09.25', hasCookies: false });
	});
});
