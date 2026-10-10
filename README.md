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

The writing index is `/writing`; articles use `/writing/<slug>`. The home page
shows the latest four. `/insights` and `/insights.html` also show the new index.

Studio development:

```sh
cd sanity
npm ci
npm run dev
```

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

## Analytics

`@vercel/analytics` initializes once on each public page. It records basic page
views on `ismailahmad.com` and `www.ismailahmad.com` only. Local and preview visits
are excluded, and query strings and fragments are removed before sending.
There are no custom user identifiers or custom tracking events.

View traffic at https://vercel.com/ismxils-projects/ismxil/analytics.
Web Analytics must be enabled for the project before deploying.

## Checks

`npm test` checks rich-text conversion, safe rendering and API behavior. If a
migration snapshot exists locally, it also checks every imported article against
the original feed text and image count. `npm run build --prefix sanity` checks
the Studio schema and build.
