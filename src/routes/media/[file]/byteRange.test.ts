import { describe, expect, test } from 'vitest';
import { parseByteRange } from './byteRange';

describe('parseByteRange', () => {
	test('reads a start and an end', () => {
		expect(parseByteRange('bytes=100-199', 1000)).toEqual({ start: 100, end: 199 });
	});
	test('runs an open range to the end of the file', () => {
		expect(parseByteRange('bytes=900-', 1000)).toEqual({ start: 900, end: 999 });
	});
	test('a suffix range is the last bytes of the file', () => {
		expect(parseByteRange('bytes=-500', 1000)).toEqual({ start: 500, end: 999 });
		expect(parseByteRange('bytes=-5000', 1000)).toEqual({ start: 0, end: 999 });
	});
	test('an end past the file is cut to it', () => {
		expect(parseByteRange('bytes=0-5000', 1000)).toEqual({ start: 0, end: 999 });
	});
	test('a range the file cannot serve is refused', () => {
		expect(parseByteRange('bytes=1000-', 1000)).toBeNull();
		expect(parseByteRange('bytes=-', 1000)).toBeNull();
		expect(parseByteRange('bytes=-0', 1000)).toBeNull();
		expect(parseByteRange('bytes=5-2', 1000)).toBeNull();
	});
	test('a header in another form is ignored', () => {
		expect(parseByteRange('items=0-1', 1000)).toBeUndefined();
		expect(parseByteRange('bytes=0-1,5-9', 1000)).toBeUndefined();
	});
});
