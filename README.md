# Video Optimizer Service

A minimal, real backend (Node + native ffmpeg) that re-encodes uploaded videos
at a clean, high bitrate — the same job HandBrake does, exposed as a website
your customers can use directly. Because ffmpeg here is the real native binary
(not the browser WebAssembly version we tried earlier), it's dramatically
faster: a 200MB clip should take roughly a minute or two on modest server
hardware, not an hour.

## Run it locally first (optional, needs ffmpeg + Node installed)
```
npm install
node server.js
```
Open http://localhost:3000

## Deploy it for real (so customers can reach it)

This needs an actual server process running continuously — NOT a static host
like Netlify/GitHub Pages, which can't run ffmpeg. Easiest options that support
a `Dockerfile` app with a generous free tier for testing:

- **Railway.app** — connect this folder as a GitHub repo, it detects the
  Dockerfile automatically, deploys, and gives you a public URL.
- **Render.com** — same idea: "New Web Service" → point at your repo → it
  builds the Dockerfile → gives you a URL.
- **Fly.io** — `fly launch` in this folder detects the Dockerfile too.

All three have a free/cheap starter tier good enough to test with real
customers before you commit to paying for bigger hardware.

## Before you take paying/public traffic, think about:

- **Cost control**: video encoding uses real CPU time, which costs real money
  on any of these platforms. The basic rate limit in `server.js` (5s between
  uploads per IP) is a placeholder — for a real launch, add:
  - a per-user daily quota (track by account, not just IP)
  - a max file size / max video duration
  - a queue (e.g. BullMQ + Redis) if you expect more than a couple of
    concurrent jobs, so the server doesn't fall over under load
- **File size limit**: currently 500MB per upload (`multer` limit in
  `server.js`) — raise or lower based on your plan pricing.
- **Storage**: uploaded and processed files are deleted right after each job
  (see the `fs.unlink` calls) — don't remove that unless you have an explicit
  reason and privacy policy to match.
- **Honest framing**: market this as a video-quality/bitrate optimizer, not as
  a way to "bypass" or "beat" a specific platform's compression. That's both
  more accurate (it genuinely improves the source before *any* platform
  compresses it) and safer ground if you ever add ads, payments, or app-store
  listings later.
- **Terms of service / privacy policy**: since customers are uploading their
  own video content to your server, you'll want basic terms covering what you
  do (and don't) do with their files, even though you're deleting them
  immediately.

## Extending it

- Add user accounts + Stripe if you want to charge per video or per month.
- Add a job queue + WebSocket/polling progress updates for a nicer UX on
  longer videos, instead of the current "wait for the download" flow.
- Add the optional HEVC→H.264 conversion, or the resolution-based auto
  bitrate suggestion, as extra `ffmpeg` flags in `server.js`.
