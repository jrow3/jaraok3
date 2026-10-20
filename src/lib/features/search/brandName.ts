// Library file names carry a short disc code. Only codes whose company is certain are
// spelled out; a wrong name would be worse than the code.
const NAMES: Record<string, string> = {
	'SF Karaoke': 'Sunfly',
	'SC Karaoke': 'Sound Choice',
	'CB Karaoke': 'Chartbuster',
	'Z Karaoke': 'Zoom Karaoke',
	'#Z Karaoke': 'Zoom Karaoke',
	'ME Karaoke': 'Mr Entertainer',
	'PS Karaoke': 'Pocket Songs'
};

export function brandName(discTag: string): string {
	return NAMES[discTag] ?? discTag;
}
