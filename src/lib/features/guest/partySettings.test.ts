import { describe, test, expect } from 'vitest';
import { fetchPartySettings } from './partySettings';

describe('fetchPartySettings', () => {
	test('reads the host’s switch', async () => {
		const reply = { ok: true, status: 200, json: async () => ({ isVibrationOn: true }) } as Response;
		expect(await fetchPartySettings(async () => reply)).toEqual({ isVibrationOn: true });
	});

	test('a failed read counts as off', async () => {
		const offline = async () => {
			throw new TypeError('Failed to fetch');
		};
		expect(await fetchPartySettings(offline)).toEqual({ isVibrationOn: false });
	});
});
