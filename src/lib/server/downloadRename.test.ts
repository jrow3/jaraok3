import { describe, expect, test } from 'vitest';
import { renamedRel } from './downloadRename';

describe('renamedRel', () => {
	test('swaps the [YouTube] tag for the channel', () => {
		expect(renamedRel('downloads/Queen - Bohemian Rhapsody [YouTube].mp4', 'Sing King')).toBe(
			'downloads/Queen - Bohemian Rhapsody [Sing King].mp4'
		);
	});

	test('drops characters that would break the path or the tag', () => {
		expect(renamedRel('downloads/A - B [YouTube].mp4', ' Karaoke [HD] / Hits ')).toBe('downloads/A - B [Karaoke HD Hits].mp4');
		expect(renamedRel('downloads/A - B [YouTube].mp4', 'Hits: Live? "Now" <1|2>*')).toBe('downloads/A - B [Hits Live Now 12].mp4');
	});

	test('leaves files that are already tagged, or a channel with nothing usable', () => {
		expect(renamedRel('downloads/A - B [KaraFun].mp4', 'KaraFun')).toBeNull();
		expect(renamedRel('downloads/A - B [YouTube].mp4', ' [] ')).toBeNull();
	});
});
