import { describe, test, expect } from 'vitest';
import { joinLink } from './joinLink';

describe('joinLink', () => {
	test('the address is what a guest types: the host, without the scheme', async () => {
		expect((await joinLink(new URL('https://karaoke.example.com'))).address).toBe('karaoke.example.com');
		expect((await joinLink(new URL('http://192.168.0.10:3000/'))).address).toBe('192.168.0.10:3000');
	});

	test('the QR code is an SVG with no background of its own, so the TV plate shows through', async () => {
		const { qrSvg } = await joinLink(new URL('https://karaoke.example.com'));
		expect(qrSvg.startsWith('<svg')).toBe(true);
		expect(qrSvg).toContain('stroke="#000000"');
		expect(qrSvg).not.toContain('fill="#ffffff"');
	});

	test('a join address without http or https is refused, since it has no host to show', async () => {
		await expect(joinLink(new URL('localhost:3001'))).rejects.toThrow(/http/);
	});
});
