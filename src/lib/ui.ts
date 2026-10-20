// Deterministic visual identity for songs and singers: same seed, same gradient.
const HUES = [258, 330, 210, 165, 24, 288, 195, 345];

function hash(seed: string): number {
	let h = 0;
	for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
	return Math.abs(h);
}

export function tileGradient(seed: string): string {
	const h = HUES[hash(seed) % HUES.length];
	const h2 = (h + 52) % 360;
	return `linear-gradient(135deg, hsl(${h} 68% 56%), hsl(${h2} 64% 42%))`;
}

export function initial(text: string): string {
	const ch = [...text].find((c) => /[a-z0-9]/i.test(c));
	return (ch ?? '♪').toUpperCase();
}
