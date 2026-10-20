import { describe, test, expect } from 'vitest';
import { mayDo, cookieValue, ownerTagFor, type Caller } from './permissions';

const guest: Caller = { role: 'guest', isHost: false, ownerTag: 'tagA' };
const display: Caller = { role: 'display', isHost: false, ownerTag: 'tagD' };
const host: Caller = { role: 'control', isHost: true, ownerTag: 'tagH' };

describe('mayDo', () => {
	test('anyone can add', () => {
		expect(mayDo('add', guest)).toBe(true);
		expect(mayDo('add', display)).toBe(true);
	});
	test('a guest can remove only their own song', () => {
		expect(mayDo('remove', guest, { owner: 'tagA' })).toBe(true);
		expect(mayDo('remove', guest, { owner: 'tagB' })).toBe(false);
		expect(mayDo('remove', guest, {})).toBe(false);
		expect(mayDo('remove', guest, null)).toBe(false);
	});
	test('the display and the host can advance, and a guest only past their own song', () => {
		expect(mayDo('next', guest)).toBe(false);
		expect(mayDo('next', guest, { owner: 'tagA' })).toBe(true);
		expect(mayDo('next', guest, { owner: 'tagB' })).toBe(false);
		expect(mayDo('next', display)).toBe(true);
		expect(mayDo('next', host)).toBe(true);
	});
	test('only the display and the host can report a song that could not play', () => {
		expect(mayDo('fail', guest)).toBe(false);
		expect(mayDo('fail', display)).toBe(true);
		expect(mayDo('fail', host)).toBe(true);
		expect(mayDo('progress', guest)).toBe(false);
		expect(mayDo('progress', display)).toBe(true);
	});
	test('host-only actions are refused to guests and the display', () => {
		for (const action of ['requeue', 'reorder', 'restart', 'play', 'pause', 'undo', 'power'] as const) {
			expect(mayDo(action, guest)).toBe(false);
			expect(mayDo(action, display)).toBe(false);
			expect(mayDo(action, host)).toBe(true);
		}
	});
	test('a requeue carries its owner from the client, so a guest may not send one', () => {
		expect(mayDo('requeue', guest)).toBe(false);
		expect(mayDo('requeue', host)).toBe(true);
	});
	test('the host can remove anyone’s song', () => {
		expect(mayDo('remove', host, { owner: 'tagA' })).toBe(true);
	});
	test('renaming is personal: guests and the host rename only their own songs', () => {
		expect(mayDo('rename', guest, { owner: 'tagA' })).toBe(true);
		expect(mayDo('rename', guest, { owner: 'tagB' })).toBe(false);
		expect(mayDo('rename', guest, {})).toBe(false);
		expect(mayDo('rename', host, { owner: 'tagA' })).toBe(false);
		expect(mayDo('rename', host, { owner: 'tagH' })).toBe(true);
	});
	test('every phone but the display sets its own singer sound', () => {
		expect(mayDo('singer', guest)).toBe(true);
		expect(mayDo('singer', host)).toBe(true);
		expect(mayDo('singer', display)).toBe(false);
	});
});

describe('cookieValue', () => {
	test('reads one cookie out of a header', () => {
		expect(cookieValue('a=1; karaoke_admin=abc%3D; b=2', 'karaoke_admin')).toBe('abc=');
	});
	test('missing header or cookie gives undefined', () => {
		expect(cookieValue(undefined, 'karaoke_admin')).toBeUndefined();
		expect(cookieValue('a=1', 'karaoke_admin')).toBeUndefined();
	});
	test('a value that fails to decode gives undefined instead of throwing', () => {
		expect(cookieValue('karaoke_admin=%E0%A4%A', 'karaoke_admin')).toBeUndefined();
	});
});

describe('ownerTagFor', () => {
	test('is stable per client id and does not reveal it', () => {
		const tag = ownerTagFor('secret-client-id');
		expect(tag).toBe(ownerTagFor('secret-client-id'));
		expect(tag).not.toContain('secret');
		expect(tag).toHaveLength(16);
		expect(ownerTagFor('other')).not.toBe(tag);
	});
});
