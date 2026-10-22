#!/usr/bin/env python3
"""Applies the host's Sound tab to PipeWire, and streams mic levels back to it.

Runs on the server as the user PipeWire runs as (a systemd *user* unit; see
deploy/audio/README.md). The app never touches PipeWire itself: it writes
control/mixer.json, already translated to PipeWire port names, and this agent
hands those values to the Mic FX filter-chain. Standard library only.
"""

import json
import math
import os
import socket
import struct
import subprocess
import threading
import time
from pathlib import Path

CONTROL_DIR = Path(os.environ.get("CONTROL_DIR", Path.home() / "karaoke" / "control"))
FILTER_NODE = os.environ.get("MIXER_FILTER_NODE", "mic_fx_input")
# The audio interface, from deploy/audio/audio.env: the same file render_conf.py reads.
SOURCE_NODE = os.environ.get("AUDIO_SOURCE", "")
SINK_NODE = os.environ.get("AUDIO_SINK", "")
MIC_INPUTS = 1 if os.environ.get("MIC_INPUTS", "2").strip() == "1" else 2

POLL_SECONDS = 0.1
# A PipeWire restart gives the filter a new node id and resets it to the conf's values.
NODE_CHECK_SECONDS = 5
RATE = 48000
FRAMES_PER_READING = RATE // 15
FLOOR_DB = -90.0
# A hung pw-dump or wpctl must not stall the agent; the next poll tries again.
COMMAND_TIMEOUT_SECONDS = 10
# pw-record that dies at once (the interface unplugged) is started again no faster than this.
READER_RESTART_SECONDS = 3


def props_arg(filter_params: dict) -> str:
    pairs = " ".join(f'"{port}" {value}' for port, value in filter_params.items())
    return f"{{ params = [ {pairs} ] }}"


def find_node_id(dump: list, node_name: str) -> int | None:
    for item in dump:
        props = item.get("info", {}).get("props", {})
        if item.get("type") == "PipeWire:Interface:Node" and props.get("node.name") == node_name:
            return item["id"]
    return None


def peak_db(samples: bytes, channels: int) -> list[float]:
    values = struct.unpack(f"<{len(samples) // 4}f", samples)
    peaks = [max((abs(v) for v in values[channel::channels]), default=0.0) for channel in range(channels)]
    return [max(FLOOR_DB, 20 * math.log10(peak)) if peak > 0 else FLOOR_DB for peak in peaks]


def input_levels(peaks: list[float], mic_inputs: int) -> dict:
    # One input is the whole line in, summed, so its meter shows the louder channel.
    if mic_inputs == 1:
        return {"inL": max(peaks), "inR": FLOOR_DB}
    return {"inL": peaks[0], "inR": peaks[1]}


def run(command: list[str]) -> str:
    return subprocess.run(command, check=True, capture_output=True, text=True, timeout=COMMAND_TIMEOUT_SECONDS).stdout


class Applier:
    """Re-applies mixer.json whenever it changes or the filter node comes back."""

    def __init__(self, runner=run):
        self.runner = runner
        self.applied_mtime = None
        self.applied_node = None

    def apply(self, mixer: dict, node_id: int, sink_id: int | None) -> None:
        self.runner(["pw-cli", "set-param", str(node_id), "Props", props_arg(mixer["apply"]["filter"])])
        volume = min(1.0, max(0.0, float(mixer["apply"]["sinkVolume"])))
        # Master is the interface's own output; the default sink only if it can't be found.
        target = str(sink_id) if sink_id is not None else "@DEFAULT_AUDIO_SINK@"
        self.runner(["wpctl", "set-volume", target, f"{volume:.2f}"])

    def check(self, path: Path, is_node_check_due: bool) -> bool:
        try:
            mtime = path.stat().st_mtime_ns
        except FileNotFoundError:
            return False
        if mtime == self.applied_mtime and not is_node_check_due:
            return False
        dump = json.loads(self.runner(["pw-dump"]))
        node_id = find_node_id(dump, FILTER_NODE)
        if node_id is None or (mtime == self.applied_mtime and node_id == self.applied_node):
            return False
        # Marked before applying: a failure is retried at the next node check, not every poll.
        self.applied_mtime, self.applied_node = mtime, None
        self.apply(json.loads(path.read_text()), node_id, find_node_id(dump, SINK_NODE))
        self.applied_node = node_id
        return True


class LevelReader(threading.Thread):
    """Keeps the latest peak per channel of one PipeWire node, while it is wanted."""

    def __init__(self, target: str, is_sink_monitor: bool):
        super().__init__(daemon=True)
        command = ["pw-record", "--raw", "--target", target, "--rate", str(RATE), "--channels", "2", "--format", "f32"]
        if is_sink_monitor:
            command += ["-P", "{ stream.capture.sink = true }"]
        self.process = subprocess.Popen([*command, "-"], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        self.peaks = [FLOOR_DB, FLOOR_DB]

    def run(self) -> None:
        block = FRAMES_PER_READING * 2 * 4
        while chunk := self.process.stdout.read(block):
            if len(chunk) == block:
                self.peaks = peak_db(chunk, 2)

    def is_dead(self) -> bool:
        return self.process.poll() is not None

    def stop(self) -> None:
        self.process.terminate()
        try:
            self.process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            self.process.kill()


class LevelServer(threading.Thread):
    """Streams {"inL","inR","room"} in dBFS as JSON lines to whoever connects to mixer.sock."""

    def __init__(self, path: Path):
        super().__init__(daemon=True)
        path.unlink(missing_ok=True)
        self.server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.server.bind(str(path))
        # The app runs as another uid inside its container.
        os.chmod(path, 0o666)
        self.server.listen()
        self.clients: list[socket.socket] = []
        self.lock = threading.Lock()

    def run(self) -> None:
        while True:
            client, _ = self.server.accept()
            # A client that stops reading is dropped instead of stalling everyone's meters.
            client.settimeout(1)
            with self.lock:
                self.clients.append(client)

    def stream_forever(self) -> None:
        readers = None
        started_at = 0.0
        while True:
            with self.lock:
                clients = list(self.clients)
            if readers and (not clients or any(reader.is_dead() for reader in readers)):
                for reader in readers:
                    reader.stop()
                readers = None
            if clients and not readers and time.monotonic() - started_at >= READER_RESTART_SECONDS:
                started_at = time.monotonic()
                readers = [LevelReader(SOURCE_NODE, False), LevelReader(SINK_NODE, True)]
                for reader in readers:
                    reader.start()
            if readers:
                source, sink = readers
                line = json.dumps({**input_levels(source.peaks, MIC_INPUTS), "room": max(sink.peaks)}) + "\n"
                for client in clients:
                    try:
                        client.sendall(line.encode())
                    except OSError:
                        client.close()
                        with self.lock:
                            self.clients.remove(client)
            time.sleep(FRAMES_PER_READING / RATE)


def watch_forever(applier: Applier, path: Path) -> None:
    last_node_check = 0.0
    while True:
        now = time.monotonic()
        is_due = now - last_node_check >= NODE_CHECK_SECONDS
        if is_due:
            last_node_check = now
        try:
            if applier.check(path, is_due):
                print(f"applied {path}", flush=True)
        except (subprocess.SubprocessError, OSError, ValueError, KeyError) as error:
            # A half-started PipeWire, a hung command, or a file replaced mid-read: say so, keep
            # the last good sound, try again.
            print(f"could not apply: {error}", flush=True)
        time.sleep(POLL_SECONDS)


def main() -> None:
    if not SOURCE_NODE or not SINK_NODE:
        raise SystemExit("Set AUDIO_SOURCE and AUDIO_SINK in deploy/audio/audio.env (see deploy/audio/README.md).")
    CONTROL_DIR.mkdir(parents=True, exist_ok=True)
    levels = LevelServer(CONTROL_DIR / "mixer.sock")
    levels.start()
    threading.Thread(target=levels.stream_forever, daemon=True).start()
    watch_forever(Applier(), CONTROL_DIR / "mixer.json")


if __name__ == "__main__":
    main()
