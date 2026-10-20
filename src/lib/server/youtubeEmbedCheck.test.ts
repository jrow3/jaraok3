import { describe, test, expect, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: {} }));

// Stands in for yt-dlp when none of its clients returns formats for the video (seen with
// the web clients and no JS runtime): the metadata is there, but without
// --ignore-no-formats-error the run fails with "Requested format is not available".
const fakeYtDlp = vi.hoisted(() => ({ embed: 'False', hasFormats: false, isDown: false }));
vi.mock('node:child_process', () => ({
	execFile: (_bin: string, args: string[], _options: unknown, done: (e: Error | null, out?: { stdout: string; stderr: string }) => void) => {
		if (fakeYtDlp.isDown) return done(new Error('ERROR: Unable to download API page'));
		if (!fakeYtDlp.hasFormats && !args.includes('--ignore-no-formats-error')) {
			return done(new Error('ERROR: [youtube] pi-Odu9CDmw: Requested format is not available'));
		}
		done(null, { stdout: `${fakeYtDlp.embed}\n`, stderr: '' });
	}
}));

const { checkEmbeddable } = await import('./youtube');

describe('checkEmbeddable', () => {
	test('reads a KaraFun video as not embeddable even when yt-dlp finds no formats', async () => {
		Object.assign(fakeYtDlp, { embed: 'False', hasFormats: false, isDown: false });
		expect(await checkEmbeddable('pi-Odu9CDmw')).toBe(false);
	});
	test('reads an embeddable video as embeddable', async () => {
		Object.assign(fakeYtDlp, { embed: 'True', hasFormats: true, isDown: false });
		expect(await checkEmbeddable('Sd7sMCA9H3Y')).toBe(true);
	});
	test('treats NA as embeddable', async () => {
		Object.assign(fakeYtDlp, { embed: 'NA', hasFormats: true, isDown: false });
		expect(await checkEmbeddable('Sd7sMCA9H3Y')).toBe(true);
	});
	test('rejects when yt-dlp itself fails, so the route can report it', async () => {
		Object.assign(fakeYtDlp, { isDown: true });
		await expect(checkEmbeddable('pi-Odu9CDmw')).rejects.toThrow();
	});
});

const { oembedEmbeddable } = await import('./youtube');

describe('oembedEmbeddable, asked when yt-dlp cannot answer', () => {
	const answer = (status: number) => vi.fn(async (_url: string) => new Response('{}', { status }));

	test('reads 401 as embedding disabled', async () => {
		vi.stubGlobal('fetch', answer(401));
		expect(await oembedEmbeddable('pi-Odu9CDmw')).toBe(false);
	});
	test('reads 200 as embeddable', async () => {
		vi.stubGlobal('fetch', answer(200));
		expect(await oembedEmbeddable('Sd7sMCA9H3Y')).toBe(true);
	});
	test('asks oEmbed about the watch page of that video', async () => {
		const fetch = answer(200);
		vi.stubGlobal('fetch', fetch);
		await oembedEmbeddable('Sd7sMCA9H3Y');
		expect(String(fetch.mock.calls[0][0])).toBe(
			'https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=Sd7sMCA9H3Y&format=json'
		);
	});
	test.each([404, 500])('rejects on %i, so the route fails open and logs it', async (status) => {
		vi.stubGlobal('fetch', answer(status));
		await expect(oembedEmbeddable('pi-Odu9CDmw')).rejects.toThrow(String(status));
	});
	test('rejects on a network error', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
		await expect(oembedEmbeddable('pi-Odu9CDmw')).rejects.toThrow('fetch failed');
	});
});
