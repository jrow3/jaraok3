import { describe, test, expect } from 'vitest';
import { toAddInput, toRequeueInput, toIdList, toId, toSinger, toUndoRemoval, toProgress } from './validate';

const validLocal = {
	artist: 'Artist',
	title: 'Title',
	singer: 'Singer',
	source: 'local'
};

describe('toAddInput', () => {
	test('never takes isHouseSound from a client', () => {
		expect(toAddInput({ ...validLocal, isHouseSound: true })).not.toHaveProperty('isHouseSound');
	});

	test('accepts a valid local input and returns a clean object', () => {
		expect(toAddInput(validLocal)).toEqual({
			artist: 'Artist',
			title: 'Title',
			singer: 'Singer',
			source: 'local'
		});
	});

	test('drops client-sent status, owner, and id', () => {
		const result = toAddInput({ ...validLocal, status: 'downloading', owner: 'sneaky', id: 'q123' });
		expect(result).toEqual({
			artist: 'Artist',
			title: 'Title',
			singer: 'Singer',
			source: 'local'
		});
	});

	test('accepts a valid ytId with the optional fields', () => {
		const result = toAddInput({ ...validLocal, source: 'youtube', ytId: 'abc123', songId: 5, discTag: 'disc-1' });
		expect(result).toEqual({
			artist: 'Artist',
			title: 'Title',
			singer: 'Singer',
			source: 'youtube',
			ytId: 'abc123',
			songId: 5,
			discTag: 'disc-1'
		});
	});

	test('accepts a null discTag', () => {
		expect(toAddInput({ ...validLocal, discTag: null })?.discTag).toBeNull();
	});

	test('rejects non-object input', () => {
		expect(toAddInput('nope')).toBeNull();
		expect(toAddInput(42)).toBeNull();
		expect(toAddInput(undefined)).toBeNull();
	});

	test('rejects null', () => {
		expect(toAddInput(null)).toBeNull();
	});

	test('rejects a numeric artist', () => {
		expect(toAddInput({ ...validLocal, artist: 123 })).toBeNull();
	});

	test('rejects an empty title', () => {
		expect(toAddInput({ ...validLocal, title: '' })).toBeNull();
	});

	test('rejects a too-long singer', () => {
		expect(toAddInput({ ...validLocal, singer: 'x'.repeat(61) })).toBeNull();
	});

	test('rejects an unknown source', () => {
		expect(toAddInput({ ...validLocal, source: 'cd' })).toBeNull();
	});

	test('rejects a NaN songId', () => {
		expect(toAddInput({ ...validLocal, songId: NaN })).toBeNull();
	});

	test('rejects a malformed ytId', () => {
		expect(toAddInput({ ...validLocal, source: 'youtube', ytId: '!!' })).toBeNull();
	});
});

describe('toAddInput: the phone theme', () => {
	test('keeps a theme the app has', () => {
		expect(toAddInput({ ...validLocal, theme: 'disco' })).toEqual({ ...validLocal, theme: 'disco' });
	});

	test('drops an unknown, missing or non-string theme and still takes the add', () => {
		for (const theme of ['nonsense', 'DISCO', '', 42, null, { id: 'disco' }, undefined]) {
			expect(toAddInput({ ...validLocal, theme })).toEqual(validLocal);
		}
		expect(toAddInput(validLocal)).toEqual(validLocal);
	});

	test('a requeue keeps the song’s theme', () => {
		expect(toRequeueInput({ ...validLocal, theme: 'onair' })).toEqual({ ...validLocal, theme: 'onair' });
	});
});

describe('toIdList', () => {
	test('accepts an array of short strings', () => {
		expect(toIdList(['a', 'b'])).toEqual(['a', 'b']);
	});
	test('rejects a non-array', () => {
		expect(toIdList('a')).toBeNull();
		expect(toIdList(null)).toBeNull();
	});
	test('rejects an array with a non-string entry', () => {
		expect(toIdList(['a', 5])).toBeNull();
	});
	test('rejects a too-long entry', () => {
		expect(toIdList(['a'.repeat(65)])).toBeNull();
	});
	test('rejects more than 500 entries', () => {
		expect(toIdList(new Array(501).fill('a'))).toBeNull();
	});
});

describe('toId', () => {
	test('accepts a short string', () => {
		expect(toId('abc')).toBe('abc');
	});
	test('rejects non-strings', () => {
		expect(toId(5)).toBeNull();
		expect(toId(null)).toBeNull();
		expect(toId(undefined)).toBeNull();
	});
	test('rejects a too-long string', () => {
		expect(toId('a'.repeat(65))).toBeNull();
	});
});

describe('toSinger', () => {
	test('trims a name and refuses blanks, overlong names and non-strings', () => {
		expect(toSinger('  Sam  ')).toBe('Sam');
		expect(toSinger('   ')).toBeNull();
		expect(toSinger('x'.repeat(61))).toBeNull();
		expect(toSinger({ singer: 'Sam' })).toBeNull();
	});
});

describe('toRequeueInput', () => {
	test('keeps a requeued song on the house sound', () => {
		expect(toRequeueInput({ ...validLocal, isHouseSound: true })).toEqual({ ...validLocal, isHouseSound: true });
	});

	test('keeps an owner tag shaped like ownerTagFor gives', () => {
		expect(toRequeueInput({ ...validLocal, owner: '0123456789abcdef' })).toEqual({ ...validLocal, owner: '0123456789abcdef' });
	});

	test('leaves the owner out when none is sent', () => {
		expect(toRequeueInput(validLocal)).toEqual(validLocal);
	});

	test('refuses an owner of the wrong shape', () => {
		for (const owner of ['sneaky', '0123456789ABCDEF', '0123456789abcdef0', 42, null]) {
			expect(toRequeueInput({ ...validLocal, owner })).toBeNull();
		}
	});

	test('refuses what an add would refuse', () => {
		expect(toRequeueInput({ ...validLocal, title: '', owner: '0123456789abcdef' })).toBeNull();
	});
});

describe('toUndoRemoval', () => {
	test('takes a song id and a place in line, and nothing else', () => {
		expect(toUndoRemoval({ id: 'q1', index: 2, owner: 'x' })).toEqual({ id: 'q1', index: 2 });
		expect(toUndoRemoval({ id: 'q1', index: -1 })).toBeNull();
		expect(toUndoRemoval({ id: 'q1', index: 1.5 })).toBeNull();
		expect(toUndoRemoval({ id: 7, index: 0 })).toBeNull();
		expect(toUndoRemoval('q1')).toBeNull();
	});

	test('refuses a place far past any real line, and a missing place', () => {
		expect(toUndoRemoval({ id: 'q1', index: 500 })).toEqual({ id: 'q1', index: 500 });
		expect(toUndoRemoval({ id: 'q1', index: 501 })).toBeNull();
		expect(toUndoRemoval({ id: 'q1' })).toBeNull();
	});
});

describe('toProgress', () => {
	test('takes a song id, seconds in and the song length', () => {
		expect(toProgress({ id: 'a1', time: 12.5, duration: 200, extra: 1 })).toEqual({ id: 'a1', time: 12.5, duration: 200 });
	});

	test('refuses anything that is not a place in a song', () => {
		expect(toProgress(null)).toBeNull();
		expect(toProgress({ id: 'a1', time: -1, duration: 200 })).toBeNull();
		expect(toProgress({ id: 'a1', time: 1, duration: Number.POSITIVE_INFINITY })).toBeNull();
		expect(toProgress({ id: 'a1', time: '1', duration: 200 })).toBeNull();
		expect(toProgress({ time: 1, duration: 200 })).toBeNull();
	});
});
