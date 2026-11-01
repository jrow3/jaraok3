// Search-as-you-type. It waits for a pause in typing, and only the newest request
// may write results, so a slow earlier response can't replace a newer one.
const MIN_QUERY_LENGTH = 2;
export const TYPING_PAUSE_MS = 180;

export interface SearchState<T> {
	results: T;
	isLoading: boolean;
	hasError: boolean;
}

export function createSearch<T>(state: SearchState<T>, load: (query: string) => Promise<T>, empty: T) {
	let latest = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;

	async function run(query: string) {
		const ticket = ++latest;
		state.isLoading = true;
		let results = empty;
		let hasError = false;
		try {
			results = await load(query);
		} catch {
			hasError = true;
		}
		if (ticket !== latest) return;
		state.results = results;
		state.hasError = hasError;
		state.isLoading = false;
	}

	function search(text: string) {
		clearTimeout(timer);
		latest++;
		state.hasError = false;
		const query = text.trim();
		if (query.length >= MIN_QUERY_LENGTH) {
			state.isLoading = true;
			timer = setTimeout(() => run(query), TYPING_PAUSE_MS);
			return;
		}
		state.results = empty;
		state.isLoading = false;
	}

	function refresh(text: string): Promise<void> {
		clearTimeout(timer);
		const query = text.trim();
		return query.length >= MIN_QUERY_LENGTH ? run(query) : Promise.resolve();
	}

	return { search, refresh, clear: () => search('') };
}
