import { createHash } from 'node:crypto';

export type PartyAction =
	| 'add'
	| 'remove'
	| 'rename'
	| 'requeue'
	| 'reorder'
	| 'restart'
	| 'play'
	| 'pause'
	| 'next'
	| 'undo'
	| 'power'
	| 'mixer'
	| 'singer'
	| 'fail'
	| 'progress';

export interface Caller {
	role: 'display' | 'control' | 'guest';
	/** Holds a valid admin cookie, or no ADMIN_PIN is configured. */
	isHost: boolean;
	/** Public tag of this phone's secret client id. */
	ownerTag: string;
}

const isOwner = (caller: Caller, item?: { owner?: string } | null) => !!item?.owner && item.owner === caller.ownerTag;

// Guests may add songs, remove or rename their own, and end their own song on stage. The
// TV may report that a song ended or could not play. Everything else drives the party and needs the host.
export function mayDo(action: PartyAction, caller: Caller, item?: { owner?: string } | null): boolean {
	// A rename changes whose name a song carries, so even the host renames only their own.
	if (action === 'rename') return isOwner(caller, item);
	// Every phone keeps its own singer sound; the TV has no one singing from it.
	if (action === 'singer') return caller.role !== 'display';
	if (caller.isHost) return true;
	switch (action) {
		case 'add':
			return true;
		case 'remove':
			return isOwner(caller, item);
		case 'next':
			return caller.role === 'display' || isOwner(caller, item);
		case 'fail':
		case 'progress':
			return caller.role === 'display';
		default:
			return false;
	}
}

export function cookieValue(header: string | undefined, name: string): string | undefined {
	for (const part of (header ?? '').split(';')) {
		const [key, ...rest] = part.trim().split('=');
		if (key === name) {
			try {
				return decodeURIComponent(rest.join('='));
			} catch {
				return undefined;
			}
		}
	}
	return undefined;
}

// What the snapshot shows for an item's owner: a one-way hash of the phone's secret
// id, so seeing the queue never lets anyone act as someone else.
export function ownerTagFor(clientId: string): string {
	return createHash('sha256').update(clientId).digest('hex').slice(0, 16);
}
