#!/usr/bin/env python3
"""Renders mic-fx.conf.template for this machine's audio interface, from audio.env.

    python3 deploy/audio/render_conf.py deploy/audio/audio.env \\
        > ~/.config/pipewire/pipewire.conf.d/mic-fx.conf

Standard library only. See deploy/audio/README.md for finding your node names.
"""

import re
import sys
from pathlib import Path

TEMPLATE = Path(__file__).with_name("mic-fx.conf.template")
DEFAULTS = {"LADSPA_DIR": "/usr/lib/ladspa", "MIC_INPUTS": "2", "AUDIO_LATENCY": "512/48000"}
REQUIRED = ("AUDIO_SOURCE", "AUDIO_SINK")


def read_env(text: str) -> dict:
    values = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        values[name.strip()] = value.strip().strip('"').strip("'")
    return values


def render(template: str, env: dict) -> str:
    settings = {**DEFAULTS, **{name: value for name, value in env.items() if value}}
    missing = [name for name in REQUIRED if not settings.get(name)]
    if missing:
        raise ValueError(f"audio.env needs {', '.join(missing)} (see deploy/audio/README.md)")
    inputs = settings["MIC_INPUTS"]
    if inputs not in ("1", "2"):
        raise ValueError(f"MIC_INPUTS must be 1 or 2, not {inputs!r}")
    # One input reads the interface as mono, so PipeWire sums a stereo line in for it.
    is_mono = inputs == "1"
    values = {
        "AUDIO_SOURCE": settings["AUDIO_SOURCE"],
        "AUDIO_SINK": settings["AUDIO_SINK"],
        "LADSPA_DIR": settings["LADSPA_DIR"].rstrip("/"),
        "AUDIO_LATENCY": settings["AUDIO_LATENCY"],
        "INPUTS": '"mix:In 1"' if is_mono else '"mix:In 1" "mix:In 2"',
        "CAPTURE_CHANNELS": "1" if is_mono else "2",
        "CAPTURE_POSITION": "MONO" if is_mono else "FL FR",
    }
    return re.sub(r"\{\{(\w+)\}\}", lambda match: values[match.group(1)], template)


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("usage: render_conf.py path/to/audio.env > mic-fx.conf")
    try:
        sys.stdout.write(render(TEMPLATE.read_text(), read_env(Path(sys.argv[1]).read_text())))
    except ValueError as error:
        sys.exit(str(error))


if __name__ == "__main__":
    main()
