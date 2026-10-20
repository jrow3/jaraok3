import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, loadEnv, type PluginOption } from 'vite';
import { attachSocket } from './src/lib/server/socket';

// Attach Socket.io to the dev server's HTTP server so `npm run dev` has live
// websockets. Production uses the equivalent wiring in server.js.
const socketDevPlugin: PluginOption = {
	name: 'karaoke-socket-dev',
	configureServer(server) {
		// `vite dev` only loads .env into $env, not process.env, but the socket server and the
		// feature switches (src/lib/server/features.ts) read process.env, as they do in
		// production. Without this the PIN check would treat every connection as host, and
		// MIXER/KIOSK/CONTROL_DIR in .env would be ignored in dev.
		for (const [name, value] of Object.entries(loadEnv(server.config.mode, process.cwd(), ''))) {
			process.env[name] ??= value;
		}
		process.env.ADMIN_PIN ??= '';
		if (server.httpServer) attachSocket(server.httpServer);
	}
};

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter()
		}),
		socketDevPlugin
	]
});
