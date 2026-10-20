# Builds for amd64 or arm64 (a Raspberry Pi 4/5 or other ARM box): BuildKit sets
# TARGETARCH, and the deno and yt-dlp binaries below follow it. Declared before the first
# FROM so the yt-dlp stage can be picked by it.
ARG TARGETARCH

# --- build stage: compile the SvelteKit app + native better-sqlite3 ---
FROM node:24-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
	&& rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- yt-dlp standalone binary (keyless YouTube search), one stage per architecture ---
# ADD checks a remote URL on every build and reuses the layer only when the file is
# unchanged, so each rebuild ships the current release; a RUN curl layer was cached
# forever. Only the stage for the target architecture is built.
FROM scratch AS ytdlp-amd64
ADD --chmod=755 https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux /yt-dlp
FROM scratch AS ytdlp-arm64
ADD --chmod=755 https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux_aarch64 /yt-dlp
FROM ytdlp-${TARGETARCH} AS ytdlp

# --- runtime stage ---
FROM node:24-bookworm-slim
ARG TARGETARCH
# ffmpeg (merge/faststart for on-demand downloads of non-embeddable picks) + deno, the
# JavaScript runtime yt-dlp needs for YouTube's full format list. ffmpeg stays; curl
# and unzip are purged once deno is unpacked.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates curl unzip ffmpeg \
	&& case "$TARGETARCH" in arm64) DENO_ARCH=aarch64 ;; *) DENO_ARCH=x86_64 ;; esac \
	&& curl -fsSL "https://github.com/denoland/deno/releases/latest/download/deno-${DENO_ARCH}-unknown-linux-gnu.zip" \
		-o /tmp/deno.zip \
	&& unzip -q /tmp/deno.zip -d /usr/local/bin \
	&& chmod +x /usr/local/bin/deno \
	&& rm /tmp/deno.zip \
	&& apt-get purge -y curl unzip && apt-get autoremove -y && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/src ./src
COPY --from=build /app/server.js /app/package.json ./
# Last, so a new yt-dlp release doesn't rebuild the app layers above it.
COPY --from=ytdlp /yt-dlp /usr/local/bin/yt-dlp
ENV NODE_ENV=production \
	PORT=3000 \
	DB_PATH=/data/index.db \
	YT_DLP=/usr/local/bin/yt-dlp
EXPOSE 3000
CMD ["npx", "tsx", "server.js"]
