import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { updateYtdlp, ytdlpVersion } from '$lib/server/ytdlpUpdate';
import { youtubeCookieArgs } from '$lib/server/youtubeCookies';

const binary = () => env.YT_DLP || 'yt-dlp';

export const GET: RequestHandler = async () => {
	const version = await ytdlpVersion(binary()).catch((failure) => {
		console.error('[karaoke] yt-dlp --version failed:', failure);
		throw error(500, 'yt-dlp did not answer');
	});
	return json({ version, hasCookies: youtubeCookieArgs().length > 0 });
};

// A failed update is still a 200: the outcome carries yt-dlp's reason for the host to read.
export const POST: RequestHandler = async () => json(await updateYtdlp(binary()));
