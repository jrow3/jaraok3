const YOUTUBE_TAG = /\[YouTube\](\.\w+)$/;

// Brackets would end a [tag] early; the rest are characters exFAT (and Windows) refuse in names.
export const fileSafe = (text: string) => text.replace(/[[\]/\\:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();

// An on-demand download saved before downloads were tagged with their channel, renamed
// so its [tag] names the channel. Null when there's nothing to rename.
export function renamedRel(rel: string, channel: string): string | null {
	const tag = fileSafe(channel);
	if (!tag || !YOUTUBE_TAG.test(rel)) return null;
	return rel.replace(YOUTUBE_TAG, `[${tag}]$1`);
}
