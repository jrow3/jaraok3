import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createToaster, type ToastMsg } from './toastQueue';

describe('createToaster', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	test('a plain toast shows as ok and clears after 3.2 s', () => {
		const list: ToastMsg[] = [];
		createToaster(list).show('Saved');
		expect(list).toMatchObject([{ text: 'Saved', kind: 'ok' }]);
		vi.advanceTimersByTime(3199);
		expect(list).toHaveLength(1);
		vi.advanceTimersByTime(1);
		expect(list).toHaveLength(0);
	});

	test('a toast with an action stays up longer, and a custom duration wins', () => {
		const list: ToastMsg[] = [];
		const toaster = createToaster(list);
		toaster.show('Removed', { action: { label: 'Undo', run: () => {} } });
		toaster.show('Quick', { duration: 1000 });
		vi.advanceTimersByTime(1000);
		expect(list.map((t) => t.text)).toEqual(['Removed']);
		vi.advanceTimersByTime(5000);
		expect(list).toHaveLength(0);
	});

	test('running the action dismisses the toast and runs it once', () => {
		const list: ToastMsg[] = [];
		const toaster = createToaster(list);
		const run = vi.fn();
		const id = toaster.show('Removed', { action: { label: 'Undo', run } });
		toaster.runAction(id);
		toaster.runAction(id);
		expect(run).toHaveBeenCalledTimes(1);
		expect(list).toHaveLength(0);
	});

	test('an error toast keeps its kind', () => {
		const list: ToastMsg[] = [];
		createToaster(list).show('Nope', { kind: 'err' });
		expect(list[0].kind).toBe('err');
	});
});
