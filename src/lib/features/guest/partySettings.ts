import type { PartySettings } from '../../types';

export async function fetchPartySettings(fetcher: typeof fetch = fetch): Promise<PartySettings> {
	try {
		const response = await fetcher('/api/party-settings');
		return await response.json();
	} catch {
		// A missed buzz is harmless: the card still says "You're next".
		return { isVibrationOn: false };
	}
}
