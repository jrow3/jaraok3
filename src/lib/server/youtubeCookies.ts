import { accessSync, constants } from 'node:fs';

// YouTube asks flagged IPs to sign in, so yt-dlp can pass a spare account's cookies.txt.
// Checked on every call so the owner can drop in or refresh the file without a restart.
export function youtubeCookieArgs(): string[] {
	const path = process.env.YT_COOKIES;
	if (!path) return [];
	try {
		accessSync(path, constants.R_OK);
		return ['--cookies', path];
	} catch {
		return [];
	}
}

export function logYoutubeCookies(): void {
	if (youtubeCookieArgs().length > 0) console.log('[karaoke] YouTube cookies in use.');
	else console.log('[karaoke] No YouTube cookies; yt-dlp runs signed out.');
}
