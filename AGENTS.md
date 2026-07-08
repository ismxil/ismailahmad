# AGENTS.md

## Cursor Cloud specific instructions

### What this repo is
A **static, multi-page portfolio website** (Ismail Ahmad — `ismailahmad.com`) plus an
**optional Cloudflare Worker** (`cloudflare-worker/`) that proxies the Notion CMS and
scrapes Dribbble. There is **no `package.json`, no build step, and no lockfile** — the
site is plain HTML + vanilla JS styled with Tailwind via CDN. Nothing needs to be
compiled or bundled.

### Running the site (primary product)
Serve the repo root with any static HTTP server; there is no dependency install step.

```bash
python3 -m http.server 8080   # then open http://localhost:8080/index.html
```

`.vscode/settings.json` sets Live Server to port `5502`, but any static server works.

- Static pages (`index`, `about`, `expertise`) render fully offline once Tailwind's CDN
  and fonts load.
- Dynamic pages (`work`, `project`, `play`, `thought`, `article`) fetch live data at
  runtime and therefore **require internet egress**:
  - `work`/`project` → the **deployed** worker at
    `https://notion-proxy.ismxilahmad.workers.dev` (hardcoded in `project-cache.js` /
    `dribbble-cache.js`). You do not need to run the worker locally to view Work.
  - `thought`/`article` → Substack RSS via `rss2json.com` (fallback CORS proxies in
    `blog-cache.js`).
- Prefer serving over HTTP (not `file://`) so `fetch` and ES modules work.

### Non-obvious gotchas
- **Broken project images are expected in dev.** Notion cover/image URLs are
  time-limited signed S3 links that expire (~1h), so cached/stale project thumbnails and
  detail images often render broken. This is a data limitation, not a setup bug.
- **The Work page password gate is client-side.** Clicking a project card opens a
  password overlay; the password is hardcoded in `work.html`. It only reveals which
  project detail page to route to — it is not real access control.

### Optional: Cloudflare Worker (`cloudflare-worker/`)
Only needed if you are editing the worker itself. It requires the `NOTION_TOKEN` secret
and Cloudflare/Wrangler auth, which are not configured in this environment.

```bash
cd cloudflare-worker
npx wrangler dev            # local worker, typically :8787
```

To point the frontend at a local worker, change `API_BASE` in `project-cache.js` and
`dribbble-cache.js` to `http://localhost:8787` (the worker's CORS already allows
`http://localhost`).

### Lint / test / build
There is **no lint config, test suite, or build pipeline** in this repo. "Build" is just
serving the static files as-is.
