import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

// yt-dlp -U asks GitHub for the latest release, then downloads a ~35 MB binary. A stalled
// download would otherwise leave the host's button spinning, and hold every later check.
const UPDATE_LIMIT_MS = 2 * 60 * 1000;
const VERSION_LIMIT_MS = 15 * 1000;

export type UpdateOutcome =
	| { kind: 'up-to-date'; version: string }
	| { kind: 'updated'; from: string; to: string }
	| { kind: 'failed'; reason: string };

type RunFailure = Error & { stdout?: string; stderr?: string; killed?: boolean };

let running: Promise<UpdateOutcome> | null = null;

export async function ytdlpVersion(binary: string): Promise<string> {
	const { stdout } = await run(binary, ['--version'], { timeout: VERSION_LIMIT_MS });
	return stdout.trim();
}

// A second tap while an update runs joins it: two processes replacing the same binary
// could leave a half-written file.
export function updateYtdlp(binary: string): Promise<UpdateOutcome> {
	running ??= runUpdate(binary).finally(() => (running = null));
	return running;
}

async function runUpdate(binary: string): Promise<UpdateOutcome> {
	// yt-dlp exits non-zero on every failure, with its ERROR line on stderr, so a failed
	// run is parsed the same way as a good one.
	const output = await run(binary, ['-U'], { timeout: UPDATE_LIMIT_MS }).then(
		({ stdout, stderr }) => stdout + stderr,
		(failure: RunFailure) => failureOutput(failure)
	);
	const outcome = parseUpdateOutput(output);
	if (outcome.kind === 'failed') console.error('[karaoke] yt-dlp update failed:', output.trim());
	else console.log('[karaoke] yt-dlp update:', JSON.stringify(outcome));
	return outcome;
}

function failureOutput(failure: RunFailure): string {
	if (failure.killed) return 'ERROR: timed out';
	return `${failure.stdout ?? ''}${failure.stderr ?? ''}` || `ERROR: ${failure.message}`;
}

// yt-dlp labels a release "stable@2026.09.25 from yt-dlp/yt-dlp"; the host needs only the tag.
function tagOf(line: string | undefined): string | undefined {
	return line?.match(/@([\w.]+)/)?.[1];
}

function lineAfter(output: string, prefix: string): string | undefined {
	return output
		.split(/\r?\n/)
		.find((line) => line.startsWith(prefix))
		?.slice(prefix.length);
}

export function parseUpdateOutput(output: string): UpdateOutcome {
	const upToDate = tagOf(lineAfter(output, 'yt-dlp is up to date'));
	if (upToDate) return { kind: 'up-to-date', version: upToDate };
	const updatedTo = tagOf(lineAfter(output, 'Updated yt-dlp to '));
	const current = tagOf(lineAfter(output, 'Current version: '));
	if (updatedTo && current) return { kind: 'updated', from: current, to: updatedTo };
	return { kind: 'failed', reason: shortReason(output) };
}

// Errors carry advice after a semicolon ("…; Use that to update", "…; Please try again
// later or visit <url>") that the host can't act on from a phone.
function shortReason(output: string): string {
	const error = lineAfter(output, 'ERROR: ');
	const lastLine = output.trim().split(/\r?\n/).at(-1);
	return (error ?? lastLine ?? '').split(';')[0].trim() || 'no output from yt-dlp';
}
