import type { Socket } from 'socket.io';
import { reply } from './reply';

// A feature switched off in .env still answers its events, so a page opened before the
// switch gets a clear "disabled" instead of waiting out a timeout.
export function refuseAll(socket: Socket, events: readonly string[]): void {
	for (const event of events) socket.on(event, (_raw: unknown, ack?: unknown) => reply(ack, { ok: false, error: 'disabled' }));
}
