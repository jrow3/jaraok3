import type { Tier } from '../../types';

export interface SearchResult {
	id: number;
	artist: string;
	title: string;
	discTag: string | null;
	hasLyrics: boolean;
	tier: Tier;
	isStarred: boolean;
	source: 'local' | 'local-video';
	versions?: SearchResult[];
}

export interface YtResult {
	ytId: string;
	title: string;
	channel: string;
	durationSec: number | null;
}
