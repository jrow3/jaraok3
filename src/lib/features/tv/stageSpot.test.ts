import { describe, test, expect } from 'vitest';
import { stageSpot, isUpNextFull } from './stageSpot';

describe('stageSpot', () => {
	test('a CDG song follows the lyrics layout', () => {
		expect(stageSpot('local', 'panel')).toBe('rail');
		expect(stageSpot('local', 'full')).toBe('band');
	});

	test('a video fills the screen in either layout', () => {
		expect(stageSpot('youtube', 'panel')).toBe('video');
		expect(stageSpot('local-video', 'full')).toBe('video');
	});
});

describe('isUpNextFull', () => {
	const midSong = { isAlwaysShown: false, isNameShown: false, isNearEnd: false };

	test('mid-song it goes faint when the host turned it off', () => {
		expect(isUpNextFull(midSong)).toBe(false);
		expect(isUpNextFull({ ...midSong, isAlwaysShown: true })).toBe(true);
	});

	test('it comes back to full with the name and near the end', () => {
		expect(isUpNextFull({ ...midSong, isNameShown: true })).toBe(true);
		expect(isUpNextFull({ ...midSong, isNearEnd: true })).toBe(true);
	});
});
