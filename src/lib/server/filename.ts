export interface ParsedTrack {
	artist: string;
	title: string;
	discTag: string | null;
}

const EXTENSION = /\.(cdg|mp3|mp2|zip)$/i;
const TRAILING_TAG = /\s*\[([^\]]*)\]\s*$/;
const TRAILING_SEPARATORS = /[\s-]+$/;
const SEPARATOR = ' - ';

export function parseTrack(filename: string): ParsedTrack {
	let name = filename.replace(EXTENSION, '');

	let discTag: string | null = null;
	const tagMatch = name.match(TRAILING_TAG);
	if (tagMatch) {
		discTag = tagMatch[1].trim();
		name = name.slice(0, tagMatch.index).trim();
	}

	const separatorIndex = name.indexOf(SEPARATOR);
	let artist = '';
	let title = name;
	if (separatorIndex !== -1) {
		artist = name.slice(0, separatorIndex).trim();
		title = name.slice(separatorIndex + SEPARATOR.length).trim();
	}

	title = title.replace(TRAILING_SEPARATORS, '').trim();

	return { artist, title, discTag };
}
