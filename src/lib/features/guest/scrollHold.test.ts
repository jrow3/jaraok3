import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createScrollHold, SCROLL_SETTLE_MS } from './scrollHold';

describe('createScrollHold', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	test('applies at once when the page is still', () => {
		const run = vi.fn();
		createScrollHold().runWhenStill(run);
		expect(run).toHaveBeenCalledTimes(1);
	});

	test('waits until scrolling has stopped for the settle time', () => {
		const hold = createScrollHold();
		const run = vi.fn();
		hold.noteScroll();
		hold.runWhenStill(run);
		vi.advanceTimersByTime(SCROLL_SETTLE_MS - 100);
		hold.noteScroll();
		vi.advanceTimersByTime(SCROLL_SETTLE_MS - 1);
		expect(run).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(run).toHaveBeenCalledTimes(1);
	});

	test('a newer update replaces one that is still waiting', () => {
		const hold = createScrollHold();
		const older = vi.fn();
		const newer = vi.fn();
		hold.noteScroll();
		hold.runWhenStill(older);
		hold.runWhenStill(newer);
		vi.advanceTimersByTime(SCROLL_SETTLE_MS);
		expect(older).not.toHaveBeenCalled();
		expect(newer).toHaveBeenCalledTimes(1);
	});

	test('cancel drops a waiting update', () => {
		const hold = createScrollHold();
		const run = vi.fn();
		hold.noteScroll();
		hold.runWhenStill(run);
		hold.cancel();
		vi.advanceTimersByTime(SCROLL_SETTLE_MS);
		expect(run).not.toHaveBeenCalled();
	});
});
