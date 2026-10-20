import { afterEach, describe, expect, test } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { youtubeCookieArgs } from './youtubeCookies';

const folder = mkdtempSync(join(tmpdir(), 'karaoke-cookies-'));

afterEach(() => {
	delete process.env.YT_COOKIES;
});

describe('youtubeCookieArgs', () => {
	test('adds nothing when YT_COOKIES is unset', () => {
		expect(youtubeCookieArgs()).toEqual([]);
	});
	test('adds nothing when the cookie file is missing', () => {
		process.env.YT_COOKIES = join(folder, 'missing.txt');
		expect(youtubeCookieArgs()).toEqual([]);
	});
	test('passes the cookie file once it exists, without a restart', () => {
		const path = join(folder, 'youtube.txt');
		process.env.YT_COOKIES = path;
		expect(youtubeCookieArgs()).toEqual([]);
		writeFileSync(path, '# Netscape HTTP Cookie File\n');
		expect(youtubeCookieArgs()).toEqual(['--cookies', path]);
	});
});
