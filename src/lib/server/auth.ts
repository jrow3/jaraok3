import { createHmac, timingSafeEqual } from 'node:crypto';

// Cookie name for a signed admin session, and the fixed message the token signs.
export const COOKIE_NAME = 'karaoke_admin';
const MESSAGE = 'karaoke-admin-v1';

// A stateless session token: HMAC of a fixed message keyed by the admin PIN.
// The PIN is the secret, so a valid token can only be minted by someone who
// knows it, and it can be verified without any server-side session store.
export function tokenFor(pin: string): string {
	return createHmac('sha256', pin).update(MESSAGE).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
	const ab = Buffer.from(a);
	const bb = Buffer.from(b);
	return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function verifyToken(cookieValue: string | null | undefined, pin: string): boolean {
	if (!pin || !cookieValue) return false;
	return safeEqual(cookieValue, tokenFor(pin));
}

export function checkPin(candidate: string, pin: string): boolean {
	if (!pin) return false;
	return safeEqual(candidate, pin);
}
