import { describe, expect, test, vi } from 'vitest';

vi.mock('$env/dynamic/private', () => ({ env: { ADMIN_PIN: '1234' } }));

const { handle } = await import('./hooks.server');

type HandleInput = Parameters<typeof handle>[0];

function request(pathname: string, routeId: string | null) {
	const resolve = vi.fn(async () => new Response('ok'));
	const event = {
		url: new URL(`http://karaoke.test${pathname}`),
		route: { id: routeId },
		cookies: { get: () => undefined }
	} as unknown as HandleInput['event'];
	return { resolve, response: handle({ event, resolve } as HandleInput) };
}

describe('admin PIN guard', () => {
	test('refuses a guarded route without the admin cookie', async () => {
		const { response, resolve } = request('/api/settings', '/api/settings');
		expect((await response).status).toBe(401);
		expect(resolve).not.toHaveBeenCalled();
	});

	test('refuses a guarded route reached through a percent-encoded path', async () => {
		const { response, resolve } = request('/api/%73ettings', '/api/settings');
		expect((await response).status).toBe(401);
		expect(resolve).not.toHaveBeenCalled();
	});

	test('lets guests reach open routes', async () => {
		const { response, resolve } = request('/api/search', '/api/search');
		expect((await response).status).toBe(200);
		expect(resolve).toHaveBeenCalled();
	});
});
