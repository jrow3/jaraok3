import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { COOKIE_NAME, checkPin, tokenFor } from '$lib/server/auth';

// Exchanges the admin PIN for a signed session cookie. Not guarded (it's how
// you get the cookie). `secure` is off so the same cookie works over the http
// LAN URL and the https tunnel.
export const POST: RequestHandler = async ({ request, cookies }) => {
	const pin = env.ADMIN_PIN ?? '';
	if (!pin) return json({ ok: true }); // gate disabled

	// A body of `null` parses fine but has no fields to read.
	const body = (await request.json().catch(() => null)) ?? {};
	const candidate = typeof body.pin === 'string' ? body.pin : '';
	if (!checkPin(candidate, pin)) throw error(401, 'Wrong PIN');

	cookies.set(COOKIE_NAME, tokenFor(pin), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: false,
		maxAge: 60 * 60 * 24 * 30
	});
	return json({ ok: true });
};
