#!/usr/bin/env bash
# Watches the app's TV-display flag file and starts/stops the kiosk service to
# match. The karaoke container writes "on"/"off" to this file (via the admin
# toggle); this script is the only thing that calls systemctl on the kiosk.
set -euo pipefail

FLAG="${1:?usage: karaoke-kiosk-watch.sh /path/to/karaoke/control/display}"
DIR="$(dirname "$FLAG")"
SERVICE="karaoke-kiosk.service"

apply() {
	local want
	want="$(cat "$FLAG" 2>/dev/null || echo off)"
	if [ "$want" = "on" ]; then
		systemctl start "$SERVICE"
	else
		systemctl stop "$SERVICE"
	fi
}

mkdir -p "$DIR"
apply
# Re-apply whenever the flag file is (re)written in the control dir.
while inotifywait -qq -e close_write,create,moved_to "$DIR"; do
	apply
done
