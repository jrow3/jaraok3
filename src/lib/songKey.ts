// "The same song" across karaoke brands and versions: artist + title, case- and
// punctuation-insensitive. Shared by the server (suggestions, sung list) and the
// client (building exclusions), so both sides agree.
export function songKey(artist: string, title: string): string {
	const norm = (text: string) =>
		text
			.toLowerCase()
			.replace(/['’]/g, '')
			.replace(/[^a-z0-9]+/g, ' ')
			.trim();
	return `${norm(artist)}|${norm(title)}`;
}
