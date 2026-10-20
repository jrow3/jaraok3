import { describe, expect, test } from 'vitest';
import { parseUpdateOutput, updateYtdlp } from './ytdlpUpdate';

// Samples as yt-dlp's update.py prints them (stdout, then stderr for ERROR lines).
const UP_TO_DATE = `Latest version: stable@2026.08.19 from yt-dlp/yt-dlp
yt-dlp is up to date (stable@2026.08.19 from yt-dlp/yt-dlp)
`;

const UPDATED = `Current version: stable@2026.08.19 from yt-dlp/yt-dlp
Latest version: stable@2026.09.25 from yt-dlp/yt-dlp
Current Build Hash: 5f1e3c0d6a0b1c9e2f4a7d8b3c6e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e
Updating to stable@2026.09.25 from yt-dlp/yt-dlp ...
Updated yt-dlp to stable@2026.09.25 from yt-dlp/yt-dlp
`;

const PERMISSION_DENIED = `Current version: stable@2026.08.19 from yt-dlp/yt-dlp
Latest version: stable@2026.09.25 from yt-dlp/yt-dlp
Current Build Hash: 5f1e3c0d6a0b1c9e2f4a7d8b3c6e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e
Updating to stable@2026.09.25 from yt-dlp/yt-dlp ...
ERROR: Insufficient permissions to write to /usr/local/bin/yt-dlp
`;

const PIP = `Current version: stable@2026.08.19 from yt-dlp/yt-dlp
Latest version: stable@2026.09.25 from yt-dlp/yt-dlp
ERROR: You installed yt-dlp with pip or using the wheel from PyPi; Use that to update
`;

const OFFLINE = `ERROR: Unable to obtain version info (<urlopen error [Errno -3] Temporary failure in name resolution>); Please try again later or visit  https://github.com/yt-dlp/yt-dlp/releases/latest
`;

describe('parseUpdateOutput', () => {
	test('reads the version when yt-dlp is already current', () => {
		expect(parseUpdateOutput(UP_TO_DATE)).toEqual({ kind: 'up-to-date', version: '2026.08.19' });
	});

	test('reads both versions after an update', () => {
		expect(parseUpdateOutput(UPDATED)).toEqual({ kind: 'updated', from: '2026.08.19', to: '2026.09.25' });
	});

	test('reads a nightly tag', () => {
		const nightly = 'Latest version: nightly@2026.09.25.232812 from yt-dlp/yt-dlp-nightly-builds\n'
			+ 'yt-dlp is up to date (nightly@2026.09.25.232812 from yt-dlp/yt-dlp-nightly-builds)\n';
		expect(parseUpdateOutput(nightly)).toEqual({ kind: 'up-to-date', version: '2026.09.25.232812' });
	});

	test('a download that started but could not be written is a failure', () => {
		expect(parseUpdateOutput(PERMISSION_DENIED)).toEqual({
			kind: 'failed',
			reason: 'Insufficient permissions to write to /usr/local/bin/yt-dlp'
		});
	});

	test('drops the advice after the semicolon', () => {
		expect(parseUpdateOutput(PIP)).toEqual({
			kind: 'failed',
			reason: 'You installed yt-dlp with pip or using the wheel from PyPi'
		});
		expect(parseUpdateOutput(OFFLINE)).toEqual({
			kind: 'failed',
			reason: 'Unable to obtain version info (<urlopen error [Errno -3] Temporary failure in name resolution>)'
		});
	});

	test('output it does not recognise is a failure, not a silent success', () => {
		expect(parseUpdateOutput('Something new\n')).toEqual({ kind: 'failed', reason: 'Something new' });
		expect(parseUpdateOutput('')).toEqual({ kind: 'failed', reason: 'no output from yt-dlp' });
	});
});

describe('updateYtdlp', () => {
	test('a missing binary comes back as a failure instead of throwing', async () => {
		const outcome = await updateYtdlp('no-such-yt-dlp-binary');
		expect(outcome.kind).toBe('failed');
	});
});
