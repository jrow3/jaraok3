export interface ParsedTitle {
	title: string;
	artist: string;
}

const SEPARATOR = /\s+[-\u2013\u2014]\s+/;
const KARAOKE_TAG = /\s*[([][^)\]]*karaoke[^)\]]*[)\]]\s*$/i;
const PIPE = /[|\uFF5C]/;

// Karaoke channels put the real artist in the video title. KaraFun writes
// "Title - Artist | Karaoke Version | KaraFun", with the middle part translated,
// so the pipe is the anchor; most other channels write "Artist - Title (Karaoke Version)",
// and some of them use pipes too, so only a KaraFun tail flips the order.
export function parseYoutubeTitle(videoTitle: string): ParsedTitle | null {
	const [head, ...afterPipe] = videoTitle.split(PIPE);
	const parts = head.trim().split(SEPARATOR);
	if (parts.length < 2) return null;
	const isKaraFun = afterPipe.some((part) => /karafun/i.test(part));
	const parsed =
		isKaraFun
			? { title: parts.slice(0, -1).join(' - '), artist: parts[parts.length - 1] }
			: { artist: parts[0], title: parts.slice(1).join(' - ').replace(KARAOKE_TAG, '') };
	return parsed.title && parsed.artist ? parsed : null;
}
