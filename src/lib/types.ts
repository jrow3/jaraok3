import type { ThemeId } from './themes/themes';

export type Tier = 'green' | 'yellow' | 'red';

export interface QueueItem {
	id: string;
	source: 'local' | 'youtube' | 'local-video';
	songId?: number;
	ytId?: string;
	discTag?: string | null;
	artist: string;
	title: string;
	singer: string;
	status?: 'downloading' | 'ready' | 'failed';
	/** Owner tag of the phone that added it (a hash, not the phone's secret id). Set by the server. */
	owner?: string;
	/** The theme the adding phone wore, so the TV can wear it while this song is up. */
	theme?: ThemeId;
	/** Added from the host page: plays with the house sound, never a singer's. */
	isHouseSound?: boolean;
}

export type AddInput = Omit<QueueItem, 'id' | 'owner'>;

/** What happened to a song once it left the lineup. */
export type SongOutcome = 'sung' | 'skipped' | 'removed' | 'failed';

export type EndedItem = QueueItem & { outcome: SongOutcome };

/** Who's up next while their song waits before it starts (the host's pause between songs). */
export interface PartyHold {
	/** When the server starts the song: server time, epoch ms. */
	until: number;
	next: Pick<QueueItem, 'singer' | 'title' | 'artist' | 'theme'>;
}

export interface PartySnapshot {
	current: QueueItem | null;
	isPlaying: boolean;
	queue: QueueItem[];
	history: QueueItem[];
	/** Bumps whenever the current song should (re)start from the top: new song, restart, or its media changed. */
	playKey: number;
	/** Songs finished or skipped this party (not capped like history); one that couldn't play doesn't count. */
	sungCount: number;
	/** songKey()s of every song that has been current this party. */
	sung: string[];
	/** The last 50 songs that left the party, newest first, with what happened to each. */
	ended: EndedItem[];
	/** Set while `current` waits, paused, for the host's pause between songs; the server ends it. */
	hold: PartyHold | null;
}

/** Which setup-specific parts this install has switched on in .env (src/lib/server/features.ts). */
export interface Features {
	/** The Sound tab and guests' Your sound: needs PipeWire and the mixer agent (deploy/audio). */
	isMixerOn: boolean;
	/** The System on/off button: needs the TV kiosk and its watcher (deploy/kiosk). */
	isKioskOn: boolean;
	/** YouTube search results, and the yt-dlp updater. */
	isYoutubeOn: boolean;
	/** On-demand downloads of videos that won't embed (deploy/downloads). */
	isDownloadsOn: boolean;
	/** Mic inputs into the mixer: 2 (one per line-in channel) or 1 (summed). Matches deploy/audio/audio.env. */
	micInputs: 1 | 2;
	appName: string;
}

export type AckResult<T = unknown> =
	| { ok: true; data: T }
	| { ok: false; error: 'forbidden' | 'stale' | 'invalid' | 'failed' | 'disabled' };

/** The host settings any phone may read, through GET /api/party-settings. */
export interface PartySettings {
	isVibrationOn: boolean;
}

/** How a CDG song fills the TV: centered lyrics under the overlays, or lyrics beside a side panel. */
export type LyricsLayout = 'full' | 'panel';

/** The host's TV choices, pushed to every TV page as they change. */
export interface DisplaySettings {
	lyricsLayout: LyricsLayout;
	isJoinCodeShown: boolean;
	isTimeLeftShown: boolean;
	/** Over a video, Up next stays the whole song; off, only at the start and near the end. */
	isUpNextAlwaysShown: boolean;
	/** The TV wears the theme of the phone that added the song on stage, or up next. */
	isSingerThemeShown: boolean;
	tvTheme: ThemeId;
	/** The Sound tab's Music fader, 0..100: the song's volume on the TV. */
	musicLevel: number;
}

/** What every host phone's System button shows. */
export interface SystemState {
	/** The host asked for the TV to be on (the kiosk flag file). */
	isOn: boolean;
	/** A TV screen is connected to the party right now. */
	isTvConnected: boolean;
}
