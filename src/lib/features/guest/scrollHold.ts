export const SCROLL_SETTLE_MS = 600;

// Holds a list update until the page has stopped scrolling, so suggestions never
// reshuffle under a thumb that is mid-scroll.
export function createScrollHold() {
	let lastScrollAt = Number.NEGATIVE_INFINITY;
	let timer: ReturnType<typeof setTimeout> | undefined;

	function runWhenStill(run: () => void) {
		clearTimeout(timer);
		const wait = lastScrollAt + SCROLL_SETTLE_MS - Date.now();
		if (wait <= 0) {
			run();
			return;
		}
		timer = setTimeout(() => runWhenStill(run), wait);
	}

	return {
		noteScroll: () => {
			lastScrollAt = Date.now();
		},
		runWhenStill,
		cancel: () => clearTimeout(timer)
	};
}
