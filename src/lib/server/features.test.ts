import { describe, expect, test } from 'vitest';
import { readFeatures } from './features';

const noFolder = () => false;
const hasFolder = () => true;

describe('readFeatures', () => {
	test('a fresh install has no mixer or kiosk, and YouTube on', () => {
		expect(readFeatures({}, noFolder)).toEqual({
			isMixerOn: false,
			isKioskOn: false,
			isYoutubeOn: true,
			isDownloadsOn: false,
			micInputs: 2,
			appName: 'jaraok3'
		});
	});

	test('downloads follow the downloads folder unless set', () => {
		expect(readFeatures({}, hasFolder).isDownloadsOn).toBe(true);
		expect(readFeatures({ DOWNLOADS: 'off' }, hasFolder).isDownloadsOn).toBe(false);
		expect(readFeatures({ DOWNLOADS: 'on' }, noFolder).isDownloadsOn).toBe(true);
	});

	test('downloads need YouTube', () => {
		expect(readFeatures({ YOUTUBE: 'off', DOWNLOADS: 'on' }, hasFolder).isDownloadsOn).toBe(false);
	});

	test('reads on/off, true/false and 1/0 in any case, and ignores anything else', () => {
		expect(readFeatures({ MIXER: 'ON', KIOSK: 'true' }, noFolder)).toMatchObject({ isMixerOn: true, isKioskOn: true });
		expect(readFeatures({ YOUTUBE: '0' }, noFolder).isYoutubeOn).toBe(false);
		expect(readFeatures({ MIXER: 'maybe', YOUTUBE: 'maybe' }, noFolder)).toMatchObject({ isMixerOn: false, isYoutubeOn: true });
	});

	test('has one or two mic inputs, two unless set to 1', () => {
		expect(readFeatures({ MIC_INPUTS: '1' }, noFolder).micInputs).toBe(1);
		expect(readFeatures({ MIC_INPUTS: '7' }, noFolder).micInputs).toBe(2);
	});

	test('takes the app name from PUBLIC_APP_NAME, trimmed and kept short', () => {
		expect(readFeatures({ PUBLIC_APP_NAME: '  Encore  ' }, noFolder).appName).toBe('Encore');
		expect(readFeatures({ PUBLIC_APP_NAME: '   ' }, noFolder).appName).toBe('jaraok3');
		expect(readFeatures({ PUBLIC_APP_NAME: 'x'.repeat(60) }, noFolder).appName).toHaveLength(24);
	});
});
