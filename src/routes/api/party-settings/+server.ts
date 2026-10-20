import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { getSettings, partySettings } from '$lib/server/settings';

// /api/settings needs the host PIN (hooks.server.ts guards it and everything under
// it); this path sits outside that guard on purpose.
export const GET: RequestHandler = () => json(partySettings(getSettings(getDb())));
