// Read from process.env, not $env: the socket server is loaded outside SvelteKit and
// reads the same values (in dev, the Vite plugin copies .env into process.env).
export const ytDlpBin = () => process.env.YT_DLP || 'yt-dlp';
export const dbPath = () => process.env.DB_PATH || 'data/index.db';
export const controlDir = () => process.env.CONTROL_DIR || '/control';

export const YOUTUBE_ID = /^[\w-]{6,20}$/;
