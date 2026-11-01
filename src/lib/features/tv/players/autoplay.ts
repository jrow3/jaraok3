// play() also rejects for a broken file, but the media element's error event reports that
// one, and a pause during loading rejects too; only a refused autoplay needs a tap.
export async function startMedia(media: Pick<HTMLMediaElement, 'play'>, onblocked: () => void): Promise<void> {
	try {
		await media.play();
	} catch (error) {
		if (error instanceof DOMException && error.name === 'NotAllowedError') onblocked();
	}
}
