import { describe, test, expect, vi } from 'vitest';
import { startMedia } from './autoplay';

describe('startMedia', () => {
	test('a refused autoplay asks for a tap', async () => {
		const onblocked = vi.fn();
		await startMedia({ play: () => Promise.reject(new DOMException('no gesture', 'NotAllowedError')) }, onblocked);
		expect(onblocked).toHaveBeenCalledOnce();
	});

	test('a broken file or a normal start does not', async () => {
		const onblocked = vi.fn();
		await startMedia({ play: () => Promise.reject(new DOMException('no source', 'NotSupportedError')) }, onblocked);
		await startMedia({ play: () => Promise.resolve() }, onblocked);
		expect(onblocked).not.toHaveBeenCalled();
	});
});
