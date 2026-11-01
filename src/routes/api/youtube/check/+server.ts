import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkEmbeddable, oembedEmbeddable } from '$lib/server/youtube';
import { YOUTUBE_ID } from '$lib/server/validate';

// Called when a guest picks a YouTube result. A video that blocks embedding (KaraFun
// etc.) can't play on the display, so the client downloads it up front. When
// yt-dlp can't answer, oEmbed is asked; only when both fail does the pick fail open.
export const GET: RequestHandler = async ({ url }) => {
	const id = url.searchParams.get('id')?.trim() ?? '';
	if (!YOUTUBE_ID.test(id)) return json({ embeddable: true });
	try {
		return json({ embeddable: await checkEmbeddable(id) });
	} catch (error) {
		console.error(`[youtube] embed check failed for ${id}:`, error instanceof Error ? error.message : error);
	}
	try {
		return json({ embeddable: await oembedEmbeddable(id) });
	} catch (error) {
		// Logged because failing open sends an embed-blocked pick to the TV, which only finds out
		// when it fails there and then has to download it, costing the singer their turn.
		console.error(`[youtube] oEmbed check failed for ${id}, failing open:`, error instanceof Error ? error.message : error);
		return json({ embeddable: true });
	}
};
