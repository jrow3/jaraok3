import { existsSync } from 'node:fs';
import type { Features } from '../types';
import { BRAND_NAME } from '../components/ui/wordmark';

// The parts of the app that need particular hardware or services, switched in .env so a
// setup without them never shows controls that do nothing. Reads process.env (not $env)
// because the socket server, loaded outside SvelteKit, reads it too.
const MAX_APP_NAME = 24;

type Env = Record<string, string | undefined>;

function flag(value: string | undefined, fallback: boolean): boolean {
	const normal = value?.trim().toLowerCase();
	if (normal === 'on' || normal === 'true' || normal === '1') return true;
	if (normal === 'off' || normal === 'false' || normal === '0') return false;
	return fallback;
}

export function readFeatures(env: Env = process.env, isFolder: (path: string) => boolean = existsSync): Features {
	const isYoutubeOn = flag(env.YOUTUBE, true);
	// Without a say-so, downloads are on exactly when a downloads folder was mounted.
	const hasDownloadsFolder = isFolder(env.DOWNLOADS_DIR || '/library/downloads');
	return {
		isMixerOn: flag(env.MIXER, false),
		isKioskOn: flag(env.KIOSK, false),
		isYoutubeOn,
		isDownloadsOn: isYoutubeOn && flag(env.DOWNLOADS, hasDownloadsFolder),
		micInputs: env.MIC_INPUTS?.trim() === '1' ? 1 : 2,
		appName: env.PUBLIC_APP_NAME?.trim().slice(0, MAX_APP_NAME) || BRAND_NAME
	};
}
