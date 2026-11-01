import type { Server, Socket } from 'socket.io';
import type { SystemState } from '../types';
import { readDisplayFlag, writeDisplayFlag } from './displayFlag';
import { mayDo, type Caller } from './permissions';
import { reply } from './reply';

function systemState(io: Server): SystemState {
	return {
		isOn: readDisplayFlag(),
		isTvConnected: (io.sockets.adapter.rooms.get('display')?.size ?? 0) > 0
	};
}

// The System button: "on" counts only once a TV screen has actually connected,
// and every host phone hears each change, so two phones never disagree. By the time
// a socket's "disconnect" fires it has already left its rooms.
export function attachSystem(io: Server, socket: Socket, caller: Caller): void {
	const push = () => io.to('control').emit('system', systemState(io));
	if (caller.role === 'control') socket.emit('system', systemState(io));
	if (caller.role === 'display') {
		push();
		socket.on('disconnect', push);
	}
	socket.on('system:power', (raw: unknown, ack?: unknown) => {
		if (!mayDo('power', caller)) return reply(ack, { ok: false, error: 'forbidden' });
		if (typeof raw !== 'boolean') return reply(ack, { ok: false, error: 'invalid' });
		try {
			writeDisplayFlag(raw);
		} catch {
			// The control folder isn't mounted: the host must see the switch didn't take.
			return reply(ack, { ok: false, error: 'failed' });
		}
		push();
		reply(ack, { ok: true, data: undefined });
	});
}
