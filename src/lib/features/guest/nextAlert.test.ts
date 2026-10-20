import { describe, test, expect } from 'vitest';
import { checkNext } from './nextAlert';
import type { MySong, MySongStatus } from './mySongs';

const song = (id: string, status: MySongStatus): MySong => ({ id, title: 'T', artist: 'A', status, position: 1 });

describe('checkNext', () => {
	test('a phone that opens while already next does not buzz, then or later', () => {
		const first = checkNext(undefined, [song('a', 'next')]);
		expect(first).toEqual({ buzzedIds: new Set(['a']), shouldBuzz: false });
		const waiting = checkNext(first.buzzedIds, [song('a', 'waiting')]);
		expect(checkNext(waiting.buzzedIds, [song('a', 'next')]).shouldBuzz).toBe(false);
	});

	test('buzzes once when a song becomes next, not on later updates', () => {
		const first = checkNext(new Set(), [song('a', 'next')]);
		expect(first.shouldBuzz).toBe(true);
		expect(checkNext(first.buzzedIds, [song('a', 'next')]).shouldBuzz).toBe(false);
	});

	test('a song that goes next, back to waiting, then next again buzzes once', () => {
		const looks = [[song('a', 'next')], [song('a', 'waiting')], [song('a', 'next')]];
		let buzzedIds: ReadonlySet<string> = new Set();
		let buzzes = 0;
		for (const songs of looks) {
			const result = checkNext(buzzedIds, songs);
			buzzedIds = result.buzzedIds;
			if (result.shouldBuzz) buzzes += 1;
		}
		expect(buzzes).toBe(1);
	});

	test('buzzes again when another of your songs becomes next', () => {
		expect(checkNext(new Set(['a']), [song('a', 'singing'), song('b', 'next')]).shouldBuzz).toBe(true);
	});

	test('stays quiet when none of your songs is next', () => {
		expect(checkNext(new Set(), [song('a', 'waiting')]).shouldBuzz).toBe(false);
	});
});
