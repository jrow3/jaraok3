import { describe, test, expect, vi } from 'vitest';
import { fetchLibrary, fetchYoutube, isEmbeddable, libraryInput, youtubeInput } from './api';
import type { SearchResult, YtResult } from './types';

const reply = (body: unknown, status = 200) =>
	({ ok: status < 400, status, json: async () => body }) as Response;

describe('fetchLibrary', () => {
	test('encodes the query and treats missing suggestions as none', async () => {
		const fakeFetch = vi.fn<typeof fetch>(async () => reply({ results: [] }));
		expect(await fetchLibrary('rock & roll', fakeFetch)).toEqual({ results: [], suggestions: [] });
		expect(fakeFetch).toHaveBeenCalledWith('/api/search?q=rock%20%26%20roll');
	});

	test('a server error rejects instead of returning broken data', async () => {
		await expect(fetchLibrary('love', async () => reply({}, 500))).rejects.toThrow();
	});
});

describe('fetchYoutube', () => {
	test('a failed YouTube search rejects', async () => {
		await expect(fetchYoutube('love', async () => reply({}, 503))).rejects.toThrow();
	});
});

describe('isEmbeddable', () => {
	test('answers from the check, and lets the video through when the check itself fails', async () => {
		expect(await isEmbeddable('abc', async () => reply({ embeddable: false }))).toBe(false);
		expect(
			await isEmbeddable('abc', async () => {
				throw new TypeError('Failed to fetch');
			})
		).toBe(true);
	});
});

describe('libraryInput', () => {
	test('turns a result into a lineup add for the given singer', () => {
		const song: SearchResult = {
			id: 7,
			artist: 'ABBA',
			title: 'Waterloo',
			discTag: 'SF Karaoke',
			hasLyrics: true,
			tier: 'green',
			isStarred: false,
			source: 'local'
		};
		expect(libraryInput(song, 'Sam')).toEqual({
			source: 'local',
			songId: 7,
			discTag: 'SF Karaoke',
			artist: 'ABBA',
			title: 'Waterloo',
			singer: 'Sam'
		});
	});
});

describe('youtubeInput', () => {
	test('uses the artist from the video title, or the channel when it names none', () => {
		const video = (title: string): YtResult => ({ ytId: 'abc123', title, channel: 'KaraFun', durationSec: 200 });
		expect(youtubeInput(video('Perfect - Ed Sheeran | Karaoke Version | KaraFun'), 'Sam')).toEqual({
			source: 'youtube',
			ytId: 'abc123',
			artist: 'Ed Sheeran',
			title: 'Perfect',
			singer: 'Sam'
		});
		expect(youtubeInput(video('Perfect karaoke'), 'Sam')).toMatchObject({ artist: 'KaraFun', title: 'Perfect karaoke' });
	});
});
