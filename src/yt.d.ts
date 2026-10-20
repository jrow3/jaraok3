interface YtPlayer {
	playVideo(): void;
	pauseVideo(): void;
	destroy(): void;
	getCurrentTime(): number;
	getDuration(): number;
	setVolume(volume: number): void;
}

interface YtPlayerCtor {
	new (
		el: HTMLElement,
		opts: {
			videoId: string;
			playerVars?: Record<string, number>;
			events?: {
				onReady?: (e: { target: YtPlayer }) => void;
				onStateChange?: (e: { data: number; target: YtPlayer }) => void;
				onError?: (e: { data: number }) => void;
			};
		}
	): YtPlayer;
}

interface Window {
	YT?: { Player: YtPlayerCtor };
	onYouTubeIframeAPIReady?: () => void;
}
