# Ismail Ahmad portfolio

HTML, CSS and JavaScript on Vercel. Blog content lives in the existing Sanity
project `x7x0om5p`, dataset `production`.

## Development

```sh
npm ci
npm run build
npm run dev
```

Open http://localhost:4322. This server supports the blog API and the same clean
routes as production. `npm run build` bundles the browser dependencies and copies
only public site files into `public/`; credentials, Studio, tests and migration
snapshots are excluded. Vercel serves `public/` and the Node functions in `api/`.

## Writing

Open https://ismailahmad-blog.sanity.studio and sign in to the existing project.
Choose **Blog post** to create or edit a post. Set a unique slug, publication
date, excerpt and article body, then publish. Drafts and future-dated posts are
excluded from the site. Published changes appear after the API/CDN cache refreshes
(normally about a minute; stale responses may persist up to five minutes).

The blog index is `/blog`; articles use `/blog/<slug>`. The home page shows the
latest few. `blog.ismailahmad.com` and the old `/writing` paths redirect there.

Studio development:

```sh
cd sanity
npm ci
npm run dev
```

## Newsletter

The list lives in [Kit](https://app.kit.com). Publishing an article in Studio
calls `/api/sanity-publish`, which drafts the matching broadcast in Kit — a
draft, never a send. Read it in Kit and press send yourself.

Republishing never drafts the same article twice: each broadcast carries the
article's path in its description, and that is checked first.

```sh
npm run newsletter -- <slug> --preview   # build the email HTML only, no Kit call
npm run newsletter -- <slug>             # draft it by hand (safe to re-run)
npm run webhook:register                 # create or update the Sanity webhook
npm run webhook:register -- --list       # show the hooks that exist
```

Environment (Vercel project settings, Production):

| Variable | What it is |
| --- | --- |
| `KIT_API_KEY` | v4 key from kit.com → Settings → Developer |
| `KIT_FORM_ID` | the form the subscribe box adds people to |
| `SANITY_WEBHOOK_SECRET` | shared with the Sanity hook; signs every call |

`npm run webhook:register` generates the secret on first run and writes it to
`.context/sanity-webhook-secret.txt` (gitignored). Paste the same value into
Vercel. `KIT_API_KEY` must also be exported locally to draft from the terminal.

Delivery attempts: `cd sanity && npx sanity hook logs newsletter-on-publish`.

## Substack migration

```sh
npm run blog:prepare
# Review .context/blog-migration/report.json and posts.ndjson
npm run blog:import
```

The importer reads the public `https://wandarer.com/feed`, preserves titles,
dates, slugs, prose, lists, links, images and captions, and uploads images to
Sanity. It uses your Sanity CLI login (`npx sanity login` inside `sanity/`).
Original Substack posts and subscriptions are untouched. Stable document IDs
and `createIfNotExists` prevent duplicate imports or overwriting edited posts.
An existing draft is skipped too. Private/paywalled content is not imported.
The feed is a limited snapshot, not a complete historical export.

Migration backups and reports stay in the gitignored `.context/blog-migration/`
directory. An interrupted import can be rerun safely. Images uploaded before an
interruption may remain as unused Sanity assets.

## Portfolio notes

The About-page sticky note submits to `POST /api/notes`. Resend delivers notes to
`work@ismailahmad.com`, with the visitor’s optional name and selected avatar.
The Resend Vercel Marketplace integration supplies `RESEND_API_KEY` and
`RESEND_EMAIL_DOMAIN`; its sending domain must have verified DNS records.
API keys stay on the server. Duplicate retries use the same idempotency key.

For local delivery checks, pull development variables into a gitignored env file
and start the local server with `node --env-file=<file> scripts/dev.mjs`.
Drafts stay in memory for the current page visit; no persistent browser storage
is used. The UI confirms Sent only after the email provider accepts the note, then clears
the message and flips to a clean confirmation face.

## Analytics

`@vercel/analytics` initializes once on each public page. It records basic page
views on `ismailahmad.com` and `www.ismailahmad.com` only. Local and preview visits
are excluded, and query strings and fragments are removed before sending.
There are no custom user identifiers or custom tracking events.

View traffic at https://vercel.com/ismxils-projects/ismxil/analytics.
Web Analytics must be enabled for the project before deploying.

## Checks

Sterling's Card Studio is an interactive iframe served from
`/assets/card-studio/index.html`. Its pinned source lives in
`vendor/card-studio/`; `npm run build` bundles it with its fonts and export
tools. No separate editor deployment is required. On case-study pages the
resize rails change media widths while the reading column stays fixed.
The rails stop at the normal content width. The embedded editor scales its
complete desktop layout to fit; phones show `assets/card-studio/preview.png`
and a link to open the editor separately.

Case studies use `/api/cases` for public content. Etihad's public document
contains card metadata; its story lives in the private `protected.etihad`
Sanity document. Keep the access and preview handlers, shared projections,
browser loader, and access tests together when deploying. Removing the loader
leaves that public card without a hero or body. Sterling is public and includes
its full story. `sanity/scripts/publish-sterling.mjs` records the recovery from
the retained private backup; it does not change Etihad.

`npm test` checks rich-text conversion, safe rendering and API behavior. If a
migration snapshot exists locally, it also checks every imported article against
the original feed text and image count. `npm run build --prefix sanity` checks
the Studio schema and build.
