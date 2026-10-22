export type AddPhase = 'adding' | 'added';

// Long enough to see the check, short enough not to hold up the next pick.
export const ADDED_HOLD_MS = 900;

export const songAddKey = (songId: number) => `song:${songId}`;
export const videoAddKey = (ytId: string) => `yt:${ytId}`;

// One add per row at a time: a tap while the row is adding, or while its check
// still shows, does nothing and resolves to null.
export function createAddTracker(phases: Record<string, AddPhase>) {
	async function run<T>(key: string, add: () => Promise<T>): Promise<T | null> {
		if (phases[key]) return null;
		phases[key] = 'adding';
		try {
			const result = await add();
			phases[key] = 'added';
			setTimeout(() => delete phases[key], ADDED_HOLD_MS);
			return result;
		} catch (error) {
			delete phases[key];
			throw error;
		}
	}

	return { run };
}
