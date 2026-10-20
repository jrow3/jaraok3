import { describe, test, expect } from 'vitest';
import { parseYoutubeTitle } from './youtubeTitle';

describe('parseYoutubeTitle', () => {
	test('reads KaraFun’s "Title - Artist | Karaoke Version | KaraFun"', () => {
		expect(parseYoutubeTitle('Perfect - Ed Sheeran | Karaoke Version | KaraFun')).toEqual({
			title: 'Perfect',
			artist: 'Ed Sheeran'
		});
	});

	test('anchors on the pipe, so a translated middle part still works', () => {
		expect(parseYoutubeTitle('Perfect - Ed Sheeran | Versión Karaoke | KaraFun')).toEqual({
			title: 'Perfect',
			artist: 'Ed Sheeran'
		});
	});

	test('keeps a dash that belongs to the KaraFun title', () => {
		expect(parseYoutubeTitle("Don't Stop Me Now - Live - Queen | Karaoke Version | KaraFun")).toEqual({
			title: "Don't Stop Me Now - Live",
			artist: 'Queen'
		});
	});

	test('reads "Artist - Title (Karaoke Version)" and drops the karaoke tag', () => {
		expect(parseYoutubeTitle('Ed Sheeran - Perfect (Karaoke Version)')).toEqual({
			artist: 'Ed Sheeran',
			title: 'Perfect'
		});
	});

	test('accepts an en dash and a bracketed tag', () => {
		expect(parseYoutubeTitle('Queen \u2013 Bohemian Rhapsody [Karaoke]')).toEqual({
			artist: 'Queen',
			title: 'Bohemian Rhapsody'
		});
	});

	test('a pipe from another channel keeps the "Artist - Title" order', () => {
		expect(parseYoutubeTitle('Ed Sheeran - Perfect | Karaoke Version')).toEqual({
			artist: 'Ed Sheeran',
			title: 'Perfect'
		});
	});

	test('reads KaraFun titles written with a full-width pipe', () => {
		expect(parseYoutubeTitle('Perfect - Ed Sheeran \uFF5C Karaoke Version \uFF5C KaraFun')).toEqual({
			title: 'Perfect',
			artist: 'Ed Sheeran'
		});
	});

	test('a title with no spaced dash names no artist', () => {
		expect(parseYoutubeTitle('Twenty-One Pilots Stressed Out Karaoke')).toBeNull();
	});

	test('a KaraFun title without an artist names none', () => {
		expect(parseYoutubeTitle('Perfect | Karaoke Version | KaraFun')).toBeNull();
	});
});
