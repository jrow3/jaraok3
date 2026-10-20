import { clampControl, type ControlId, type MixerParams } from './controls';

export const SINGER_CONTROL_IDS = [
	'echoTime',
	'echoLevel',
	'reverbSize',
	'reverbTime',
	'reverbDamping',
	'reverbEarly',
	'reverbTail'
] as const satisfies readonly ControlId[];

export type SingerControlId = (typeof SINGER_CONTROL_IDS)[number];
// Only what the singer moved; anything absent follows the house setting.
export type SingerSound = Partial<Record<SingerControlId, number>>;
export type SingerValues = Record<SingerControlId, number>;

export const isSingerControlId = (value: unknown): value is SingerControlId =>
	(SINGER_CONTROL_IDS as readonly unknown[]).includes(value);

export function toSingerSound(raw: unknown): SingerSound {
	const source = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
	const sound: SingerSound = {};
	for (const id of SINGER_CONTROL_IDS) {
		const value = source[id];
		// clampControl turns NaN into the default, which would pose as a choice the singer made.
		if (typeof value === 'number' && Number.isFinite(value)) sound[id] = clampControl(id, value);
	}
	return sound;
}

export const houseValues = (params: MixerParams): SingerValues =>
	Object.fromEntries(SINGER_CONTROL_IDS.map((id) => [id, params[id]])) as SingerValues;

export const withSinger = (house: SingerValues, sound: SingerSound): SingerValues => ({ ...house, ...sound });

export const SINGER_HELP: Record<SingerControlId, string> = {
	echoTime: 'How long before your voice repeats. Short sounds like a 50s slapback, long like a canyon.',
	echoLevel: 'How loud the repeat is. All the way down turns the echo off.',
	reverbSize: 'How big the space sounds, from a closet to an arena.',
	reverbTime: 'How long the room keeps ringing after you stop.',
	reverbDamping: 'Higher softens the bright ring of the reverb, like a room full of curtains.',
	reverbEarly: 'The first quick bounces off nearby walls. More makes you sound closer to them.',
	reverbTail: 'The long wash after the first bounces. More makes the room sound bigger and wetter.'
};

export type StartingPointId = 'dry' | 'room' | 'hall' | 'slapback';

// Starting values to tune by ear; each one sets all seven knobs so they never depend on the house setting.
export const STARTING_POINTS: { id: StartingPointId; name: string; values: SingerValues }[] = [
	{
		id: 'dry',
		name: 'Dry',
		values: { echoTime: 0.25, echoLevel: -60, reverbSize: 30, reverbTime: 1.5, reverbDamping: 0.5, reverbEarly: -70, reverbTail: -70 }
	},
	{
		id: 'room',
		name: 'Room',
		values: { echoTime: 0.25, echoLevel: -60, reverbSize: 12, reverbTime: 0.8, reverbDamping: 0.6, reverbEarly: -12, reverbTail: -20 }
	},
	{
		id: 'hall',
		name: 'Hall',
		values: { echoTime: 0.25, echoLevel: -60, reverbSize: 80, reverbTime: 3, reverbDamping: 0.4, reverbEarly: -14, reverbTail: -10 }
	},
	{
		id: 'slapback',
		name: 'Slapback',
		values: { echoTime: 0.12, echoLevel: -12, reverbSize: 15, reverbTime: 0.8, reverbDamping: 0.6, reverbEarly: -18, reverbTail: -24 }
	}
];

export const currentStartingPoint = (values: SingerValues): StartingPointId | null =>
	STARTING_POINTS.find((point) => SINGER_CONTROL_IDS.every((id) => point.values[id] === values[id]))?.id ?? null;
