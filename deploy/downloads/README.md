# On-demand video downloads

Some YouTube karaoke channels (KaraFun, for one) block embedding, so the TV can't play
them from YouTube. When a guest picks one, the app downloads it on the spot and plays the
local copy instead:

1. The song joins the queue at once, marked **Downloading…**.
2. yt-dlp (inside the app container) pulls a web-safe **H.264 + AAC MP4** (≤1080p,
   faststart), merging it on fast disk in `TEMP_DIR`, then moves it into `DOWNLOADS_DIR`.
3. The file is named `Artist - Title [Channel].mp4` from the artist and title the search
   worked out, so the indexer files it with any other version of the same song.
4. It's indexed on its own (no full rescan), and the queued song flips to the local copy.

A video downloaded once is never fetched again: the app remembers which YouTube video
each file came from. Turn the whole feature off with `DOWNLOADS=off` in `.env`.

## Setup

- **A writable downloads folder.** In `docker-compose.yml`, `KARAOKE_DOWNLOADS` is mounted
  read-write at `/library/downloads`, nested inside the read-only library mount, so the
  indexer finds downloads like any other track. Point it at a `downloads/` folder inside
  your library.
- **Fast scratch space.** `TEMP_DIR` (default `/data/tmp`, the app's data volume) should
  sit on a fast local disk. Some USB drives, exFAT in particular, are very slow with
  yt-dlp's many small writes even when one big copy is fast; merging elsewhere and moving
  the finished file once avoids that.
- **yt-dlp stays fresh.** The image fetches the latest yt-dlp on every build, and the host
  page's Library → Advanced → YouTube downloader updates it in place. Stale builds start
  failing with HTTP 403.
- **If YouTube asks you to sign in** ("confirm you're not a bot"), put a spare account's
  `cookies.txt` in `cookies/youtube.txt` next to `docker-compose.yml`. See DEPLOY.md.

## Renaming old `[YouTube]` downloads (one-off)

Downloads made before files were tagged with their channel are named `[YouTube]`. To
rename them once, from inside the container (replace `karaoke` with your container name).
The image carries neither the source nor tsx, so copy the one in and let npx fetch the other:

```bash
docker cp scripts karaoke:/app/ && docker cp src karaoke:/app/
docker exec karaoke npx --yes tsx scripts/rename-downloads.ts           # lists what it would rename
docker exec karaoke npx --yes tsx scripts/rename-downloads.ts --apply   # renames them
```

It asks YouTube for each video's channel (2 s apart), renames the file and updates the
index in place, so songs keep their stars and play history. Run it between parties, not
mid-song. A video YouTube no longer has keeps its `[YouTube]` name.
