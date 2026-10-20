import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db';
import { getSettings, setSettings, getBrands } from '$lib/server/settings';
import { toSettingsPatch } from '$lib/server/settingsPatch';
import { announceSettingsSaved } from '$lib/server/settingsSaved';

export const GET: RequestHandler = () => {
	const db = getDb();
	return json({ settings: getSettings(db), brands: getBrands(db) });
};

export const POST: RequestHandler = async ({ request }) => {
	const settings = setSettings(getDb(), toSettingsPatch(await request.json()));
	announceSettingsSaved();
	return json({ settings });
};
