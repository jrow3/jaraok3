type Rgb = [number, number, number];

function parse(color: string): { rgb: Rgb; alpha: number } {
	const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
	if (hex) {
		const digits = hex[1].length === 3 ? [...hex[1]].map((digit) => digit + digit).join('') : hex[1];
		return { rgb: [0, 2, 4].map((at) => parseInt(digits.slice(at, at + 2), 16)) as Rgb, alpha: 1 };
	}
	const rgba = color.match(/^rgba?\(([^)]+)\)$/);
	if (!rgba) throw new Error(`not a flat color: ${color}`);
	const [red, green, blue, alpha = 1] = rgba[1].split(',').map(Number);
	return { rgb: [red, green, blue], alpha };
}

// A see-through surface is only as readable as what shows through it, layer by layer.
function flatten(color: string, beneath: string[]): Rgb {
	const top = parse(color);
	if (beneath.length === 0) return top.rgb;
	const under = flatten(beneath[0], beneath.slice(1));
	return top.rgb.map((channel, at) => channel * top.alpha + under[at] * (1 - top.alpha)) as Rgb;
}

function luminance(rgb: Rgb): number {
	const [red, green, blue] = rgb.map((channel) => {
		const value = channel / 255;
		return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast of solid text on a background, which may be translucent over the layers `beneath` it, top first. */
export function contrastRatio(text: string, background: string, ...beneath: string[]): number {
	const [light, dark] = [luminance(parse(text).rgb), luminance(flatten(background, beneath))].sort((a, b) => b - a);
	return (light + 0.05) / (dark + 0.05);
}
