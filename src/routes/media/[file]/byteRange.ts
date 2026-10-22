export interface ByteRange {
	start: number;
	end: number;
}

// One HTTP byte range, inclusive at both ends. null means the request can't be served
// from this file (answer 416); a header this doesn't read is treated as no range.
export function parseByteRange(header: string, size: number): ByteRange | null | undefined {
	const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
	if (!match || (!match[1] && !match[2])) return match ? null : undefined;
	// "bytes=-500" asks for the last 500 bytes.
	if (!match[1]) {
		const length = Number(match[2]);
		return length > 0 && size > 0 ? { start: Math.max(0, size - length), end: size - 1 } : null;
	}
	const start = Number(match[1]);
	const end = match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
	return start <= end ? { start, end } : null;
}
