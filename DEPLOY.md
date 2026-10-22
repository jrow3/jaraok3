# Deploying

The app runs as one Docker container (`server.js` = built SvelteKit + Socket.io). Phones
reach it over your network, or from anywhere if you publish it (step 4). Media only goes
to the TV, so if the TV is on the same network as the server, songs never leave it.

## 0. What you need

- A Linux box (amd64 or arm64; a Raspberry Pi 4/5 works) with Docker and Docker Compose.
- Your karaoke library on a drive the box can read: `Artist - Title [Brand].mp3` with a
  matching `.cdg` for lyrics, and/or `Artist - Title [Brand].mp4` videos. Subfolders are
  fine.
- A TV with a browser, or a device at the TV with one (laptop, mini PC). Optionally the
  server itself drives the TV (step 5).

## 1. Get the code and configure

```bash
git clone https://github.com/jrow3/jaraok3.git
cd jaraok3
cp .env.example .env
nano .env          # at least KARAOKE_LIBRARY and ADMIN_PIN
```

`.env.example` lists every setting, grouped, with what it does. The ones most installs
touch:

- `KARAOKE_LIBRARY`: the library folder on the host. Mounted read-only.
- `ADMIN_PIN`: gates the host page (`/admin`) and its actions. Leave it empty only on a
  network you trust.
- `KARAOKE_PORT`: the host port (default 3000).
- `JOIN_URL`: the address guests open, shown on the TV with a QR code. Needed when the
  TV loads the app from a different address than guests use (a kiosk on localhost, or
  guests on a public URL).
- Switches for parts that need particular hardware or services: `MIXER` (live voice
  effects; see step 5), `KIOSK` (TV on/off from the host page), `YOUTUBE`, `DOWNLOADS`.

Settings are read at start, so a change needs `docker compose up -d` (no rebuild).

## 2. Run it

```bash
docker compose pull                # the published image, for amd64 or arm64
docker compose up -d
docker compose logs -f karaoke     # the first boot scans the library once ("Indexed N songs")
```

`JARAOK3_VERSION` in `.env` picks the release (`latest` by default). To run your own changes
to the code instead, build the image here: `docker compose up -d --build`.

The index persists in the `karaoke-data` volume, so later restarts are instant. Open
`http://<server-ip>:3000/display?t=<DISPLAY_TOKEN>` on the TV and `http://<server-ip>:3000` on a phone.

If your library sits on a slow USB drive formatted exFAT and the first scan seems to
stall, set `LIBRARY_RECURSIVE=off`: it then scans only the top folder and `downloads/`.

## 3. The three pages

- **TV** (`/display?t=<DISPLAY_TOKEN>`): open it full screen on the TV. If the browser
  blocks sound, it shows a tap to start. The token is what lets it skip and fail songs.
- **Guests** (`/`): search, add songs, see the lineup. Put the address on the TV's QR code
  (`JOIN_URL`) or print it.
- **Host** (`/admin`): playback, the lineup, party and TV settings, the library.

## 4. Optional: publish it

To let guests join from their mobile data, publish the app with a reverse proxy or a
tunnel (Cloudflare Tunnel, Tailscale Funnel, Caddy). WebSockets must pass through;
Socket.io heartbeats keep them alive through proxies with an idle timeout. Set
`JOIN_URL` to the public address. Keep the TV on the local address so media stays local.

## 5. Optional: the server drives the TV, and live voice effects

- **TV kiosk:** the server sits at the TV and shows the TV page itself, headless until
  the host page's System button turns it on. Setup: `deploy/kiosk/README.md`, then
  `KIOSK=on`.
- **Voice effects:** mics into an audio interface on the server, mixed with the songs by
  PipeWire, with gate, compressor, EQ, echo and reverb tuned live from the host page's
  Sound tab. Setup: `deploy/audio/README.md`, then `MIXER=on`.

## 6. Updating

```bash
git pull                                   # the compose file, docs and deploy/ scripts
docker compose pull && docker compose up -d
```

With a pinned `JARAOK3_VERSION`, change it to the new release first. If the TV is a kiosk,
its browser may keep the old TV page cached after an update; see `deploy/kiosk/README.md`.

After adding songs to the library: **Host → Library → Rescan library** (or restart the
container).

The image ships the yt-dlp current at its release, and YouTube changes often. Between
releases: **Host → Library → Advanced → YouTube downloader → Check for
update**. That update lasts until the container is recreated.

## 7. YouTube cookies (when yt-dlp says "Sign in to confirm you're not a bot")

If YouTube flags the server's IP, every search, embed check and download fails with that
message. The fix is a `cookies.txt` from a signed-in browser. It's optional: with no file,
yt-dlp runs signed out.

1. Use a **spare** Google account, never your main one. YouTube can flag or ban the
   account these cookies come from.
2. Open a private/incognito window, sign in to that account, open youtube.com, and export
   `cookies.txt` (Netscape format) with a "cookies.txt" browser extension. Then close the
   window **without signing out**, so YouTube doesn't rotate the cookies.
3. Copy it to `cookies/youtube.txt` next to `docker-compose.yml`. No restart needed: the
   app checks for the file on every yt-dlp call. The folder is git-ignored, kept out of
   the Docker image, and mounted read-write because yt-dlp saves the refreshed session
   back into it.

To check it's working: the container log says `YouTube cookies in use.` at startup
(`docker compose logs karaoke | grep -i cookies`), and a YouTube search or download
succeeds. Cookies expire; when downloads start failing again, export a fresh file.

- https://github.com/yt-dlp/yt-dlp/wiki/FAQ#how-do-i-pass-cookies-to-yt-dlp
- https://github.com/yt-dlp/yt-dlp/wiki/Extractors#exporting-youtube-cookies
