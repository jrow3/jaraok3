import { describe, expect, test } from 'vitest';
import { parseYoutubeTitle } from '../features/search/youtubeTitle';
import { outputTemplate } from './download';

// The queue item carries the artist and title the search already worked out, so every
// channel's video is filed the way the library reads it: "Artist - Title [Channel]".
const nameFrom = (videoTitle: string) => parseYoutubeTitle(videoTitle)!;

describe('outputTemplate', () => {
	test('a KaraFun title is filed artist first', () => {
		expect(outputTemplate(nameFrom('Dancing Queen - ABBA | Karaoke Version | KaraFun'))).toBe(
			'ABBA - Dancing Queen [%(channel|YouTube)s].%(ext)s'
		);
	});

	test('a Sing King or plain "Artist - Title (Karaoke)" title is filed the same way', () => {
		expect(outputTemplate(nameFrom('Adele - Hello (Karaoke Version)'))).toBe('Adele - Hello [%(channel|YouTube)s].%(ext)s');
		expect(outputTemplate(nameFrom('Queen - Bohemian Rhapsody [Karaoke]'))).toBe(
			'Queen - Bohemian Rhapsody [%(channel|YouTube)s].%(ext)s'
		);
	});

	test('keeps names that would break the file, the tag or the yt-dlp template out', () => {
		expect(outputTemplate({ artist: 'AC/DC', title: 'Hells Bells [Live] 100%: "Remix"?' })).toBe(
			'ACDC - Hells Bells Live 100%% Remix [%(channel|YouTube)s].%(ext)s'
		);
	});

	test('an empty artist is filed as Unknown, as before', () => {
		expect(outputTemplate({ artist: ' ', title: 'Song' })).toBe('Unknown - Song [%(channel|YouTube)s].%(ext)s');
	});
});
