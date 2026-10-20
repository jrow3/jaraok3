import { toast } from '$lib/toast.svelte';
import { COULD_NOT_DO, TOO_LATE_TO_UNDO } from '$lib/messages';

export const showFailed = () => toast(COULD_NOT_DO, { kind: 'err' });

// "stale" means the lineup moved on before the Undo (the song ended, another skip),
// not that the connection dropped.
export const showUndoFailed = (error: { code?: string }) =>
	toast(error?.code === 'stale' ? TOO_LATE_TO_UNDO : COULD_NOT_DO, { kind: 'err' });
