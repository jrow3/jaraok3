// The settings API runs in the SvelteKit bundle and the socket server in its own copy of the
// server modules (server.js, or the dev plugin), so a module-level listener list would never
// be shared. The process is the one object both copies see.
const SETTINGS_SAVED = 'karaoke:settings-saved';

export function announceSettingsSaved(): void {
	process.emit(SETTINGS_SAVED);
}

export function onSettingsSaved(listener: () => void): () => void {
	process.on(SETTINGS_SAVED, listener);
	return () => process.off(SETTINGS_SAVED, listener);
}
