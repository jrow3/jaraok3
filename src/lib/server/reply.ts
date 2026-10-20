import type { AckResult } from '../types';

type Ack = (result: AckResult) => void;

// A client that doesn't want an answer sends no callback.
export const reply = (ack: unknown, result: AckResult) => {
	if (typeof ack === 'function') (ack as Ack)(result);
};
