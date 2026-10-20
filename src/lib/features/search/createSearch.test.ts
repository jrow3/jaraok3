import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSearch, TYPING_PAUSE_MS, type SearchState } from './createSearch';
import { fetchLibrary, NO_LIBRARY_RESULTS, type LibraryResults } from './api';
import type { SearchResult } from './types';

const song = (id: number, title: string): SearchResult => ({
	id,
	title,
	artist: 'Artist',
	discTag: null,
	hasLyrics: true,
	tier: 'green',
	isStarred: false,
	source: 'local'
});
const reply = (results: SearchResult[], status = 200) =>
	({ ok: status < 400, status, json: async () => ({ results, suggestions: [] }) }) as Response;
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));
const titles = (state: SearchState<LibraryResults>) => state.results.results.map((result) => result.title);

function setup(fakeFetch: typeof fetch) {
	const state: SearchState<LibraryResults> = { results: NO_LIBRARY_RESULTS, isLoading: false, hasError: false };
	const search = createSearch(state, (query) => fetchLibrary(query, fakeFetch), NO_LIBRARY_RESULTS);
	return { state, search };
}

describe('createSearch', () => {
	beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }));
	afterEach(() => vi.useRealTimers());

	test('waits for a pause in typing, then searches once for the latest text', async () => {
		const fakeFetch = vi.fn<typeof fetch>(async () => reply([song(1, 'Love Shack')]));
		const { state, search } = setup(fakeFetch);
		search.search('lo');
		search.search('lov');
		search.search(' love ');
		vi.advanceTimersByTime(TYPING_PAUSE_MS - 1);
		expect(fakeFetch).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		await settle();
		expect(fakeFetch).toHaveBeenCalledTimes(1);
		expect(fakeFetch).toHaveBeenCalledWith('/api/search?q=love');
		expect(titles(state)).toEqual(['Love Shack']);
		expect(state.isLoading).toBe(false);
	});

	test('a slow older response never replaces a newer one', async () => {
		let answerSlow: (response: Response) => void = () => {};
		const fakeFetch = vi.fn<typeof fetch>((input) =>
			String(input).endsWith('q=lo')
				? new Promise<Response>((resolve) => (answerSlow = resolve))
				: Promise.resolve(reply([song(2, 'Lovely')]))
		);
		const { state, search } = setup(fakeFetch);
		const slow = search.refresh('lo');
		expect(state.isLoading).toBe(true);
		await search.refresh('lovely');
		expect(titles(state)).toEqual(['Lovely']);
		answerSlow(reply([song(3, 'Lo-Fi')]));
		await slow;
		expect(titles(state)).toEqual(['Lovely']);
		expect(state.isLoading).toBe(false);
	});

	test('a server error shows as an error instead of throwing', async () => {
		const { state, search } = setup(vi.fn<typeof fetch>(async () => reply([], 500)));
		await search.refresh('love');
		expect(state.hasError).toBe(true);
		expect(titles(state)).toEqual([]);
		expect(state.isLoading).toBe(false);
	});

	test('a dropped connection is an error too, and the next good search clears it', async () => {
		const fakeFetch = vi
			.fn<typeof fetch>()
			.mockRejectedValueOnce(new TypeError('Failed to fetch'))
			.mockResolvedValue(reply([song(1, 'Love Shack')]));
		const { state, search } = setup(fakeFetch);
		await search.refresh('love');
		expect(state.hasError).toBe(true);
		await search.refresh('love');
		expect(state.hasError).toBe(false);
		expect(titles(state)).toEqual(['Love Shack']);
	});

	test('clearing while a search is in flight keeps the results empty when it lands', async () => {
		let answerSlow: (response: Response) => void = () => {};
		const fakeFetch = vi.fn<typeof fetch>(() => new Promise<Response>((resolve) => (answerSlow = resolve)));
		const { state, search } = setup(fakeFetch);
		const slow = search.refresh('love');
		search.clear();
		answerSlow(reply([song(1, 'Love Shack')]));
		await slow;
		expect(titles(state)).toEqual([]);
		expect(state.isLoading).toBe(false);
	});

	test('an older request failing after a newer success shows no error', async () => {
		let failSlow: (error: Error) => void = () => {};
		const fakeFetch = vi.fn<typeof fetch>((input) =>
			String(input).endsWith('q=lo')
				? new Promise<Response>((_, reject) => (failSlow = reject))
				: Promise.resolve(reply([song(2, 'Lovely')]))
		);
		const { state, search } = setup(fakeFetch);
		const slow = search.refresh('lo');
		await search.refresh('lovely');
		failSlow(new TypeError('Failed to fetch'));
		await slow;
		expect(state.hasError).toBe(false);
		expect(titles(state)).toEqual(['Lovely']);
	});

	test('typing again hides the last error right away', async () => {
		const { state, search } = setup(vi.fn<typeof fetch>(async () => reply([], 500)));
		await search.refresh('love');
		search.search('lover');
		expect(state.hasError).toBe(false);
	});

	test('searching now replaces a search still waiting for the typing pause', async () => {
		const fakeFetch = vi.fn<typeof fetch>(async (input) =>
			reply([song(1, String(input).endsWith('q=xyz') ? 'Xyz' : 'Abc')])
		);
		const { state, search } = setup(fakeFetch);
		search.search('abc');
		await search.refresh('xyz');
		vi.advanceTimersByTime(TYPING_PAUSE_MS);
		await settle();
		expect(fakeFetch).toHaveBeenCalledTimes(1);
		expect(titles(state)).toEqual(['Xyz']);
	});

	test('text under two characters clears the results and cancels a waiting search', async () => {
		const fakeFetch = vi.fn<typeof fetch>(async () => reply([song(1, 'Love Shack')]));
		const { state, search } = setup(fakeFetch);
		await search.refresh('love');
		search.search('lov');
		search.search('l');
		vi.advanceTimersByTime(TYPING_PAUSE_MS);
		await settle();
		expect(fakeFetch).toHaveBeenCalledTimes(1);
		expect(titles(state)).toEqual([]);
	});

	test('counts as loading from the first keystroke, so nothing reads as "not found" too early', async () => {
		const { state, search } = setup(vi.fn<typeof fetch>(async () => reply([])));
		search.search('love');
		expect(state.isLoading).toBe(true);
		vi.advanceTimersByTime(TYPING_PAUSE_MS);
		await settle();
		expect(state.isLoading).toBe(false);
	});
});
