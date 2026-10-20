# TV kiosk on the server (on-demand, remotely toggled)

Optional. The TV can be any browser open at `/display`: a smart TV, a laptop on HDMI,
a Chromecast'd tab. With that, leave `KIOSK=off` (the default) in `.env` and skip this.

This setup is for a server that sits at the TV and is the Display player itself. It
stays **headless by default**; the host page's System button turns the kiosk on and off
remotely. Set `KIOSK=on` in `.env` to get that button. Flow:

```
Admin "System on/off" button → control/display flag → watcher → karaoke-kiosk service → TV
```

Assumes Debian/Ubuntu and the karaoke repo cloned at `/opt/karaoke`. Cloned somewhere
else? Change `KARAOKE_HOME` in `karaoke-kiosk-watch.service` and the paths below. Run
these on the server.

## 1. Packages + a kiosk user

```bash
sudo apt update && sudo apt install -y cage chromium inotify-tools
# 'chromium-browser' on some distros — then edit ExecStart in the .service.
sudo useradd -M -s /usr/sbin/nologin karaoke        # no-sudo session owner
sudo usermod -aG video,input,render,tty karaoke     # seat/GPU/input access
```

## 2. Install the two services

```bash
sudo cp /opt/karaoke/deploy/kiosk/karaoke-kiosk.service /etc/systemd/system/
sudo cp /opt/karaoke/deploy/kiosk/karaoke-kiosk-watch.service /etc/systemd/system/
sudo chmod +x /opt/karaoke/deploy/kiosk/karaoke-kiosk-watch.sh
sudo systemctl daemon-reload
sudo systemctl enable --now karaoke-kiosk-watch      # watcher runs always
# karaoke-kiosk is NOT enabled — the watcher starts it on demand.
```

Before `enable`: if the app isn't on host port 3000, set `KARAOKE_PORT` in
`karaoke-kiosk.service` to match `.env`. After editing a unit, `sudo systemctl daemon-reload`.

After deploying a change to the TV page, a kiosk Chromium can keep showing the old
page from its cache. Clear it and restart the kiosk (for snap Chromium the cache is
under `~/snap/chromium/common/chromium/Default/Cache/`).

## 3. Audio and mics

The server is the mixer: PipeWire plays the browser's song audio and the live
mics to the same output, so there's no hardware mixer or effects box.

Hardware: mics → a USB audio interface's **line input**; the interface's output
→ speakers. (Wireless mic receivers output line level, so use Line In, not Mic
In. A stereo line input takes two mics, one per channel.)

**Sound server.** A headless box has no login session, so PipeWire won't start
on its own, and Chromium only outputs through Pulse/PipeWire:

```bash
sudo apt install -y pipewire pipewire-pulse wireplumber alsa-utils
sudo loginctl enable-linger <user>
systemctl --user enable --now pipewire pipewire-pulse wireplumber
snap connect chromium:audio-playback     # snap Chromium only
wpctl status                             # the interface should be the default sink + source
wpctl set-volume @DEFAULT_AUDIO_SINK@ 1.0   # unity; set room level at the speakers
```

**Mic effects (optional).** A PipeWire filter chain runs the mic input through
sum-to-mono → EQ → noise gate → compressor → echo → reverb and plays it to the
interface's output, where PipeWire mixes it with the music. It's built for your
interface from `deploy/audio/audio.env` and tuned live from the host's Sound tab
(`MIXER=on`); setup is in `deploy/audio/README.md`.

- Latency: the chain's buffer is `AUDIO_LATENCY` in `audio.env`, `512/48000` (about
  11 ms) by default. On a Sound Blaster X-Fi, `128/48000` and `256/48000` dropped out
  now and then (`out of buffers` and `resync` in the PipeWire journal). If `resync`
  lines persist, the output is drifting against the input (which drives the graph):
  give that node more `api.alsa.headroom` with a WirePlumber rule.
- Set mic loudness with `wpctl set-volume @DEFAULT_AUDIO_SOURCE@ <x>` (above 1.0
  amplifies) plus the compressor's makeup gain. Use `@DEFAULT_...@`, not numeric
  node ids, which change on every PipeWire restart.
- Feedback control is the gate, sensible mic gain, and keeping mics away from
  the speakers.

## 4. Test

Set `ADMIN_PIN` in the `.env` next to `docker-compose.yml`, then
`docker compose up -d --build`. In Admin, press **System off** in the header so it
reads **System on**: the TV should light up with the Display within ~1-2 s and go dark when
turned back off. `journalctl -u karaoke-kiosk -f` shows kiosk logs.

## Notes / tweaks
- **tty:** the unit uses `tty1`. If your console is elsewhere, change `TTYPath`
  and `UtmpIdentifier`.
- **`XDG_RUNTIME_DIR`:** if cage complains about it, add
  `Environment=XDG_RUNTIME_DIR=/run/user/$(id -u karaoke)` (resolve the uid).
- **X11 fallback:** if `cage` isn't available, install `xserver-xorg xinit
  chromium` and launch chromium with `startx` + `--kiosk`; disable blanking with
  `xset s off -dpms`.
- **Screen sleep:** cage/Wayland won't blank the screen; if the TV still sleeps,
  it's the TV's own timer — disable it in the TV settings.
