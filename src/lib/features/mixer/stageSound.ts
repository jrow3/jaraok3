import type { PartyHold, QueueItem } from '../../types';
import type { MixerParams } from './controls';
import type { SingerSound, SingerValues } from './singerSound';

export interface StageSong {
	current: QueueItem | null;
	hold: PartyHold | null;
}

export interface SingerStage {
	songId: string;
	singer: string;
	owner: string;
	isReset: boolean;
}

export interface SingerSnapshot {
	sound: SingerSound;
	house: SingerValues;
	stage: SingerStage | null;
}

export const guestSong = ({ current, hold }: StageSong): (QueueItem & { owner: string }) | null =>
	current && !hold && !current.isHouseSound && current.owner ? { ...current, owner: current.owner } : null;

export function singerOnStage(
	stage: StageSong,
	resetSongId: string | null,
	soundOf: (owner: string) => SingerSound
): SingerStage | null {
	const song = guestSong(stage);
	if (!song) return null;
	const isReset = resetSongId === song.id;
	if (!isReset && Object.keys(soundOf(song.owner)).length === 0) return null;
	return { songId: song.id, singer: song.singer, owner: song.owner, isReset };
}

export function stageParams(
	house: MixerParams,
	singer: SingerStage | null,
	sound: SingerSound
): MixerParams {
	if (!singer || singer.isReset) return house;
	return { ...house, ...sound };
}
