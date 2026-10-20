export interface ToastAction {
	label: string;
	run: () => void;
}

export interface ToastMsg {
	id: number;
	text: string;
	kind: 'ok' | 'err';
	action?: ToastAction;
}

export interface ToastOptions {
	kind?: ToastMsg['kind'];
	action?: ToastAction;
	duration?: number;
}

export const DEFAULT_DURATION_MS = 3200;
// Long enough to read the message and reach the Undo button.
export const ACTION_DURATION_MS = 6000;

export function createToaster(list: ToastMsg[]) {
	let nextId = 0;

	function dismiss(id: number) {
		const index = list.findIndex((t) => t.id === id);
		if (index !== -1) list.splice(index, 1);
	}

	function show(text: string, options: ToastOptions = {}) {
		const { kind = 'ok', action } = options;
		const duration = options.duration ?? (action ? ACTION_DURATION_MS : DEFAULT_DURATION_MS);
		const id = ++nextId;
		list.push({ id, text, kind, action });
		setTimeout(() => dismiss(id), duration);
		return id;
	}

	function runAction(id: number) {
		const toast = list.find((t) => t.id === id);
		if (!toast?.action) return;
		dismiss(id);
		toast.action.run();
	}

	return { show, dismiss, runAction };
}
