import type { Handle } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { COOKIE_NAME, verifyToken } from '$lib/server/auth';
import { getDb } from '$lib/server/db';
import { displaySettings, getSettings } from '$lib/server/settings';
import { DEFAULT_PHONE_THEME } from '$lib/themes/themes';
import { fillThemePlaceholders } from '$lib/themes/htmlTheme';
import { logYoutubeCookies } from '$lib/server/youtubeCookies';
import { readFeatures } from '$lib/server/features';

// Endpoints that change host settings, rescan the library or update yt-dlp; the TV's
// power switch is a socket event that permissions.ts guards. Everything guests need (/,
// /display, /api/search, /api/song, /api/youtube*, /api/party-settings, /media) stays open.
const GUARDED = ['/api/settings', '/api/reindex', '/api/ytdlp'];
// Everything that runs yt-dlp; gone when YOUTUBE=off.
const YOUTUBE_ROUTES = ['/api/youtube', '/api/ytdlp'];

const isUnder = (path: string, prefixes: string[]) => prefixes.some((p) => path === p || path.startsWith(p + '/'));

if (!env.ADMIN_PIN) {
	console.warn('[karaoke] ADMIN_PIN is not set — the admin page and its actions are UNPROTECTED.');
}
logYoutubeCookies();

export const handle: Handle = async ({ event, resolve }) => {
	const pin = env.ADMIN_PIN ?? '';
	// The route id, not the raw pathname: routing decodes the path, so /api/%73ettings
	// would reach /api/settings while slipping past a check on the encoded string.
	const route = event.route.id ?? '';
	if (pin && isUnder(route, GUARDED) && !verifyToken(event.cookies.get(COOKIE_NAME), pin)) {
		return json({ error: 'unauthorized' }, { status: 401 });
	}
	if (isUnder(route, YOUTUBE_ROUTES) && !readFeatures().isYoutubeOn) {
		return json({ error: 'disabled' }, { status: 404 });
	}
	const isTv = event.url.pathname === '/display';
	// The host page wears the TV theme: one picker themes the TV and the host together.
	const isHostTheme = isTv || event.url.pathname === '/admin';
	const page = {
		theme: isHostTheme ? displaySettings(getSettings(getDb())).tvTheme : DEFAULT_PHONE_THEME,
		screen: isTv ? 'tv' : 'phone',
		themeFrom: isHostTheme ? 'host' : 'phone'
	} as const;
	return resolve(event, {
		transformPageChunk: ({ html }) => fillThemePlaceholders(html, page)
	});
};
