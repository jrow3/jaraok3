# Sound tab: the voice mixer

The host page's **Sound** tab tunes the mic chain live: input trims, mute, tone
(EQ), gate, compressor, echo, reverb, music level and master level, plus named
presets. There's no hardware mixer: PipeWire on the server mixes the mics with the
songs, and this folder is how the app reaches it.

It's optional. The app runs without it, and a fresh install has no Sound tab. To
use it you need Linux with PipeWire, a USB (or other) audio interface with your
mics on its input, and `MIXER=on` in the app's `.env`.

```
host phone ─socket─▶ app ─▶ control/mixer.json ─▶ karaoke_mixer_agent.py ─▶ pw-cli / wpctl
           ◀─meters─ app ◀─ control/mixer.sock ◀─ agent (pw-record taps)
```

- **`mic-fx.conf.template`** is the PipeWire filter chain. `render_conf.py` fills in
  your interface from `audio.env`. Every stage is always in the graph, so moving a
  control never drops audio.
- **`audio.env`** (copied from `audio.env.example`, gitignored) is the one place your
  hardware is described: input and output node names, 1 or 2 mic inputs, plugin
  folder, buffer size.
- **`karaoke_mixer_agent.py`** runs as a systemd *user* unit, because PipeWire runs
  as the user. It applies `mixer.json` when that changes, re-applies it when
  PipeWire restarts, and streams mic and room levels while the Sound tab is open.
- **The app does the translation.** `mixer.json` already holds PipeWire port
  names (`src/lib/features/mixer/pipewire.ts`), so the agent stays simple. A
  test checks every port name against the template.
- **Music** is the song's volume on the TV, set in the browser, not PipeWire.
  **Master** is your interface's output volume, capped at 1.0 because PipeWire clips
  digitally above that.

## Settings stick

Every change is saved in the app's database as you make it, and the agent
re-applies the last settings at boot and after any PipeWire restart.
**Presets** are named snapshots on top of that ("Save to Party", "Save as new").
You don't have to save a preset for a change to survive a restart.

## Singer sound

Guests set their own echo and reverb from "Your sound" on the guest page. During
a guest's own song the server lays their saved controls over the house sound, and
the house sound comes back when the song ends. Songs added from the host page
always use the house sound.

The Sound tab shows whose echo and reverb are on. Tap "Reset to house sound" to
go back to the house sound for the rest of that song. Any host change to echo or
reverb during a guest's song (a knob or loading a preset) resets it too.

## Install (on the server, once)

Run these as the user PipeWire runs as (the same user as the TV kiosk, if you use one).
The paths assume the repo is at `~/karaoke`.

```bash
cd ~/karaoke
sudo apt install -y swh-plugins                        # gate, sc4m, gverb (Fedora: ladspa-swh-plugins)

# 1. Describe your interface.
cp deploy/audio/audio.env.example deploy/audio/audio.env
pw-cli ls Node | grep -E 'node.name = "alsa_(input|output)'   # your input and output names
nano deploy/audio/audio.env                            # AUDIO_SOURCE, AUDIO_SINK, MIC_INPUTS

# 2. Build the mic chain from it.
mkdir -p ~/.config/pipewire/pipewire.conf.d
python3 deploy/audio/render_conf.py deploy/audio/audio.env > ~/.config/pipewire/pipewire.conf.d/mic-fx.conf
systemctl --user restart wireplumber pipewire pipewire-pulse
journalctl --user -u pipewire -n 30 --no-pager         # no filter-chain errors?
pw-cli ls Node | grep -A2 mic_fx                       # mic_fx_input + mic_fx_output there?

# 3. Start the agent.
mkdir -p ~/.config/systemd/user
cp deploy/audio/karaoke-mixer-agent.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now karaoke-mixer-agent
journalctl --user -u karaoke-mixer-agent -f            # "applied ..." after the first change
```

4. In the app's `.env`, set `MIXER=on` and the same `MIC_INPUTS` as `audio.env`, then
   `docker compose up -d`.

Changed your interface or `audio.env` later? Re-run step 2, then
`systemctl --user restart karaoke-mixer-agent`.

To remove it: delete `~/.config/pipewire/pipewire.conf.d/mic-fx.conf`, restart PipeWire,
`systemctl --user disable --now karaoke-mixer-agent`, and set `MIXER=off`.

## Check it

- Move Compressor → Threshold in the Sound tab, then
  `pw-dump mic_fx_input | grep -A1 'comp:Threshold'` shows the new value, and
  you can hear it.
- The Mics meters move when someone talks. If the tab says the agent isn't
  running, check `systemctl --user status karaoke-mixer-agent`.
- During a guest's own song, their Reverb → Tail change shows in
  `pw-dump mic_fx_input | grep -A1 'verb:Tail'`. The same change during someone
  else's song doesn't. "Reset to house sound" restores the house value.
- `systemctl --user restart pipewire`: within ~5 s the agent logs `applied` and
  your settings are back.

## Troubleshooting

- **No mics at all:** the chain didn't load. `journalctl --user -u pipewire` names the
  problem; usually a wrong node name in `audio.env` or a wrong `LADSPA_DIR` (a missing
  plugin fails without much of a message). Check the plugins are there:
  `ls $LADSPA_DIR/{gate_1410,sc4m_1916,gverb_1216}.so`.
- **Crackles or dropouts:** raise `AUDIO_LATENCY` (512/48000 to 1024/48000) and re-run step 2.
- **Meters stay still** while the agent is connected: the meters need PipeWire 1.0+
  for raw `pw-record` output. Test with
  `pw-record --raw --target <AUDIO_SOURCE> --format f32 --channels 2 - | head -c 100 | xxd`.

## Dev

`node deploy/audio/fake-agent.mjs` streams fake meter levels. On Windows, run it
and `vite dev` with `MIXER_SOCKET=\\?\pipe\karaoke-mixer`. Agent tests:
`cd deploy/audio && python -m pytest`.
