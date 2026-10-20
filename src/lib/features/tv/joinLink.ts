import QRCode from 'qrcode';

export interface JoinLink {
	address: string;
	qrSvg: string;
}

// A transparent light color leaves the background to the TV's QR plate token.
export async function joinLink(url: URL): Promise<JoinLink> {
	// A scheme-less JOIN_URL such as localhost:3001 parses with an empty host, which would
	// show a blank address and a QR code no phone can follow.
	if (url.protocol !== 'http:' && url.protocol !== 'https:') {
		throw new Error(`JOIN_URL must start with http:// or https://, got ${url.href}`);
	}
	const qrSvg = await QRCode.toString(url.href, {
		type: 'svg',
		errorCorrectionLevel: 'M',
		color: { dark: '#000000', light: '#ffffff00' }
	});
	return { address: url.host, qrSvg };
}
