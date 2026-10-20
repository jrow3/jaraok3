import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';
import { joinLink } from '$lib/features/tv/joinLink';
import { getDb } from '$lib/server/db';
import { displaySettings, getSettings } from '$lib/server/settings';

// The kiosk opens the TV on localhost, so the address guests need can't come from the
// request; JOIN_URL names it. A dev server with none set shows its own address.
export const load: PageServerLoad = async ({ url }) => ({
	join: await joinLink(new URL(env.JOIN_URL || url.origin)),
	display: displaySettings(getSettings(getDb()))
});
