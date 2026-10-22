import { spawn, type ChildProcess } from 'node:child_process';
import { resolve } from 'node:path';
import type { IndexStats } from './library';

// From the working directory: the server, the dev server and the tests all run from the
// project root. Production runs the job `npm run build` bundled; dev and tests the source.
const JOB =
	process.env.NODE_ENV === 'production'
		? [resolve('build/node/reindexJob.js')]
		: ['--import', 'tsx', resolve('src/lib/server/reindexJob.ts')];

// A full rescan of even a ~100k-song library is normally well under this. A scan stuck on
// a slow or unplugged drive would otherwise hold every later rescan behind it.
const RESCAN_LIMIT_MS = 10 * 60 * 1000;

let running: Promise<IndexStats> | null = null;

// A second tap while a scan runs joins it instead of reading the drive twice.
export function rescan(libraryPath: string, dbPath: string): Promise<IndexStats> {
	running ??= runJob([...JOB, libraryPath, dbPath]).finally(() => (running = null));
	return running;
}

// A full scan and rebuild is seconds of synchronous work. In the server's process it
// froze the socket and the media the TV was streaming. spawn with an argument
// list, no shell, so a path is never parsed as a command. Takes Node's arguments, the
// limit and the way to stop the child so the tests can stand in a job that misbehaves.
export function runJob(
	nodeArguments: string[],
	limitMs = RESCAN_LIMIT_MS,
	stop: (child: ChildProcess) => void = (child) => child.kill()
): Promise<IndexStats> {
	const finished = new Promise<string>((resolveOutput, reject) => {
		const child = spawn(process.execPath, nodeArguments, {
			stdio: ['ignore', 'pipe', 'pipe']
		});
		// Rejects here as well as stopping the child: one blocked in uninterruptible I/O on
		// the USB drive ignores the signal and never closes, which is the hang this is for.
		const limit = setTimeout(() => {
			stop(child);
			reject(new Error('Rescan failed (timed out)'));
		}, limitMs);
		let output = '';
		let errors = '';
		child.stdout.on('data', (chunk) => (output += chunk));
		child.stderr.on('data', (chunk) => (errors += chunk));
		child.on('error', (error) => {
			clearTimeout(limit);
			reject(error);
		});
		child.on('close', (code, signal) => {
			clearTimeout(limit);
			if (code === 0) resolveOutput(output);
			else reject(new Error(`Rescan failed (exit ${code ?? signal}): ${errorLine(errors)}`));
		});
	});
	// Parsed here, not in the close listener, where a throw would take the server down.
	return finished.then((output) => JSON.parse(output) as IndexStats);
}

// Node starts a crash's output with the source line that threw and ends it with its
// version banner, so the useful line is the one that names the error.
function errorLine(errors: string): string {
	return errors.match(/^\w*Error\b.*$/m)?.[0] ?? errors.trim();
}
