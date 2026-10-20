import { RESCAN_SESSION_ENDED } from '$lib/messages';
import type { HostSettings } from '../hostSettings.svelte';

// The page owns this, not the Library tab, which unmounts on a tab switch: coming back
// mid-scan still shows the spinner, and the result is still there to read.
export function createRescan(settings: HostSettings) {
	const status = $state({ isRescanning: false, hasFailed: false, message: '' });

	async function run() {
		Object.assign(status, { isRescanning: true, hasFailed: false, message: '' });
		const response = await fetch('/api/reindex', { method: 'POST' }).catch(() => null);
		status.isRescanning = false;
		if (response?.status === 401) {
			settings.expire(RESCAN_SESSION_ENDED);
			return;
		}
		if (!response?.ok) {
			status.hasFailed = true;
			status.message = 'Couldn\u2019t rescan. Check the library drive and try again.';
			return;
		}
		const { stats } = await response.json();
		status.message = `Done: ${stats.songs.toLocaleString()} songs`;
		// A rescan can add or drop brands.
		await settings.reloadBrands();
	}

	return { status, run };
}

export type Rescan = ReturnType<typeof createRescan>;
