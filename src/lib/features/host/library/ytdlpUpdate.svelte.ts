import { YTDLP_SESSION_ENDED } from '$lib/messages';
import type { UpdateOutcome } from '$lib/server/ytdlpUpdate';
import type { HostSettings } from '../hostSettings.svelte';

function describe(outcome: UpdateOutcome): string {
	if (outcome.kind === 'up-to-date') return `Up to date (${outcome.version})`;
	if (outcome.kind === 'updated') return `Updated ${outcome.from} \u2192 ${outcome.to}`;
	return `Couldn\u2019t update: ${outcome.reason}`;
}

// The page owns this, like the rescan, so an update still running when the host switches
// tabs keeps its spinner and its result.
export function createYtdlpUpdate(settings: HostSettings) {
	const status = $state({
		version: '',
		hasCookies: null as boolean | null,
		isUpdating: false,
		hasFailed: false,
		message: ''
	});

	async function loadVersion() {
		const response = await fetch('/api/ytdlp').catch(() => null);
		const answer = response?.ok ? await response.json() : { version: 'unknown', hasCookies: null };
		status.version = answer.version;
		status.hasCookies = answer.hasCookies;
	}

	async function run() {
		Object.assign(status, { isUpdating: true, hasFailed: false, message: '' });
		const response = await fetch('/api/ytdlp', { method: 'POST' }).catch(() => null);
		status.isUpdating = false;
		if (response?.status === 401) {
			settings.expire(YTDLP_SESSION_ENDED);
			return;
		}
		if (!response?.ok) {
			status.hasFailed = true;
			status.message = 'Couldn\u2019t update. Check your connection and try again.';
			return;
		}
		const outcome: UpdateOutcome = await response.json();
		status.hasFailed = outcome.kind === 'failed';
		status.message = describe(outcome);
		if (outcome.kind !== 'failed') status.version = outcome.kind === 'updated' ? outcome.to : outcome.version;
	}

	return { status, loadVersion, run };
}

export type YtdlpUpdate = ReturnType<typeof createYtdlpUpdate>;
