import { describe, test, expect } from 'vitest';
import { parseTrack } from './filename';

describe('parseTrack', () => {
	test('parses artist, title, and disc tag', () => {
		expect(parseTrack('10 Years - Beautiful [CB Karaoke]')).toEqual({
			artist: '10 Years',
			title: 'Beautiful',
			discTag: 'CB Karaoke'
		});
	});

	test('keeps commas in the artist name', () => {
		expect(parseTrack('10,000 Maniacs - Candy Everybody Wants [DK Karaoke]')).toEqual({
			artist: '10,000 Maniacs',
			title: 'Candy Everybody Wants',
			discTag: 'DK Karaoke'
		});
	});

	test('keeps parentheses inside the title', () => {
		expect(parseTrack('10 Years - Fix Me (Acoustic) [SGK Karaoke]')).toEqual({
			artist: '10 Years',
			title: 'Fix Me (Acoustic)',
			discTag: 'SGK Karaoke'
		});
	});

	test('splits on the first " - " only, keeping later ones in the title', () => {
		expect(parseTrack('Aloe Blacc - I Nee - Dollar [SBI Karaoke]')).toEqual({
			artist: 'Aloe Blacc',
			title: 'I Nee - Dollar',
			discTag: 'SBI Karaoke'
		});
	});

	test('handles special characters in the disc tag', () => {
		expect(parseTrack("10CC - Donna [#Z Karaoke]")).toEqual({
			artist: '10CC',
			title: 'Donna',
			discTag: '#Z Karaoke'
		});
	});

	test('returns a null disc tag when there is no trailing bracket', () => {
		expect(parseTrack('5 Seconds Of Summer - Lie To Me')).toEqual({
			artist: '5 Seconds Of Summer',
			title: 'Lie To Me',
			discTag: null
		});
	});

	test('trims a stray trailing " - " left before the disc tag', () => {
		expect(parseTrack('ABBA - He Is Your Brother - [KV Karaoke]')).toEqual({
			artist: 'ABBA',
			title: 'He Is Your Brother',
			discTag: 'KV Karaoke'
		});
	});

	test('keeps a leading parenthetical group in the title', () => {
		expect(parseTrack('ABBA - (Medley) Waterloo+Dancing Queen+Take A Chance')).toEqual({
			artist: 'ABBA',
			title: '(Medley) Waterloo+Dancing Queen+Take A Chance',
			discTag: null
		});
	});

	test('keeps ampersands and parentheses in the artist before the split', () => {
		expect(parseTrack('2Pac & Dr Dre (Duet) - California Love [#Z Karaoke]')).toEqual({
			artist: '2Pac & Dr Dre (Duet)',
			title: 'California Love',
			discTag: '#Z Karaoke'
		});
	});

	test('treats a name with no " - " as a title with an empty artist', () => {
		expect(parseTrack('Instrumental Track [X Karaoke]')).toEqual({
			artist: '',
			title: 'Instrumental Track',
			discTag: 'X Karaoke'
		});
	});

	test('strips a trailing audio/graphics file extension', () => {
		expect(parseTrack('10 Years - Beautiful [CB Karaoke].cdg')).toEqual({
			artist: '10 Years',
			title: 'Beautiful',
			discTag: 'CB Karaoke'
		});
		expect(parseTrack('10 Years - Beautiful [CB Karaoke].mp3').title).toBe('Beautiful');
	});
});
