import { writeFileSync } from 'node:fs';

// Saves a Google Fonts family's latin files and its license into static/fonts, so the
// kiosk (which may have no internet) serves every theme font itself.
// Usage: npx tsx scripts/fetch-font.ts <slug> <css2 family spec> <google/fonts ofl folder> [text]
// Example: npx tsx scripts/fetch-font.ts chivo "Chivo:wght@400;500;700;800" chivo
// With text, it saves only the glyphs that text needs, as <slug>.woff2.
const [slug, family, licenseFolder, text] = process.argv.slice(2);
if (!slug || !family || !licenseFolder) {
	console.error('usage: tsx scripts/fetch-font.ts <slug> <family spec> <ofl folder>');
	process.exit(1);
}

// Google serves woff2 with unicode-range subsets only to a modern browser.
const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

async function download(url: string): Promise<Buffer> {
	const response = await fetch(url, { headers: { 'user-agent': CHROME } });
	if (!response.ok) throw new Error(`${response.status} for ${url}`);
	return Buffer.from(await response.arrayBuffer());
}

const query = text ? `&text=${encodeURIComponent(text)}` : '';
const css = (await download(`https://fonts.googleapis.com/css2?family=${family}${query}&display=swap`)).toString();
// A text subset comes back as one unlabelled face; a whole family, as one face per script.
const faces = text ? /@font-face \{([^}]*)\}/g : /\/\* latin \*\/\s*@font-face \{([^}]*)\}/g;
const latin = [...css.matchAll(faces)].map((block) => ({
	weight: block[1].match(/font-weight: ([^;]+);/)![1].replace(' ', '-'),
	url: block[1].match(/url\(([^)]+)\)/)![1]
}));
const urls = [...new Set(latin.map((block) => block.url))];
for (const url of urls) {
	const weight = latin.find((block) => block.url === url)!.weight;
	const subset = text ? '' : '-latin';
	const name = urls.length === 1 ? `${slug}${subset}.woff2` : `${slug}-${weight}${subset}.woff2`;
	const file = await download(url);
	writeFileSync(`static/fonts/${name}`, file);
	console.log(`static/fonts/${name}  ${Math.round(file.length / 1024)} KB`);
}
// A 404 here means the family is not under ofl/ (so not SIL OFL): stop and ask before using it.
const license = await download(`https://raw.githubusercontent.com/google/fonts/main/ofl/${licenseFolder}/OFL.txt`);
writeFileSync(`static/fonts/${slug}.OFL.txt`, license);
console.log(`static/fonts/${slug}.OFL.txt  ${license.toString().split('\n')[0].trim()}`);
