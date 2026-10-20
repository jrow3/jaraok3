import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { ADDED_HOLD_MS, createAddTracker, type AddPhase } from './addTracker';

function setup() {
	const phases: Record<string, AddPhase> = {};
	return { phases, tracker: createAddTracker(phases) };
}

describe('createAddTracker', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	test('a second tap while the first add is in flight does nothing', async () => {
		const { tracker } = setup();
		let finish: (id: string) => void = () => {};
		const add = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)));
		const first = tracker.run('song:1', add);
		expect(await tracker.run('song:1', add)).toBeNull();
		finish('q1');
		expect(await first).toBe('q1');
		expect(add).toHaveBeenCalledTimes(1);
	});

	test('shows adding, then added, and frees the row after the hold', async () => {
		const { phases, tracker } = setup();
		const pending = tracker.run('song:1', async () => 'q1');
		expect(phases['song:1']).toBe('adding');
		await pending;
		expect(phases['song:1']).toBe('added');
		expect(await tracker.run('song:1', async () => 'q2')).toBeNull();
		vi.advanceTimersByTime(ADDED_HOLD_MS);
		expect(phases['song:1']).toBeUndefined();
		expect(await tracker.run('song:1', async () => 'q2')).toBe('q2');
	});

	test('a failed add frees the row at once and passes the error on', async () => {
		const { phases, tracker } = setup();
		const failing = tracker.run('song:1', async () => {
			throw new Error('offline');
		});
		await expect(failing).rejects.toThrow('offline');
		expect(phases['song:1']).toBeUndefined();
	});
});
