import type { PartySnapshot } from '../../types';
import type { SingerStage } from '../mixer/stageSound';

export type SoundStatus = 'live' | 'reset' | 'saved';

export function soundStatus(
	snapshot: Pick<PartySnapshot, 'current' | 'hold'>,
	ownerTag: string,
	stage: SingerStage | null
): SoundStatus {
	const { current, hold } = snapshot;
	if (stage && stage.songId === current?.id && stage.isReset && stage.owner === ownerTag) return 'reset';
	if (current?.owner === ownerTag && !hold && !current.isHouseSound) return 'live';
	return 'saved';
}
