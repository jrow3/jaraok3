import { describe, test, expect } from 'vitest';
import type { QueueItem } from '../../types';
import { sungLabel, downloadingLabel } from './idleText';

const song = (id: string, status?: QueueItem['status']): QueueItem => ({
	id,
	source: 'youtube',
	ytId: 'abc123',
	artist: 'Artist',
	title: 'Title',
	singer: 'Sam',
	status
});

describe('sungLabel', () => {
	test('counts songs sung, singular and plural', () => {
		expect(sungLabel(1)).toBe('1 song sung');
		expect(sungLabel(12)).toBe('12 songs sung');
	});
});

describe('downloadingLabel', () => {
	test('counts only songs still downloading', () => {
		expect(downloadingLabel([song('a', 'downloading')])).toBe('1 song downloading\u2026');
		expect(downloadingLabel([song('a', 'downloading'), song('b', 'failed'), song('c', 'downloading')])).toBe('2 songs downloading\u2026');
	});

	test('says nothing when no download is pending', () => {
		expect(downloadingLabel([song('a', 'ready'), song('b', 'failed')])).toBeNull();
	});
});
