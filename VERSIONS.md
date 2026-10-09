# Site versions

## v1 — archived (2026-10-08)

The original portfolio: big serif display header, horizontal client marquee,
2-up project cards, capability cards, separate `about` / `feeds` / `insights`
pages, contact panel, music player.

Preserved three ways:

- **Git tag / branch** — `git checkout v1` (points at `ddcf4e5`)
- **Live page** — `/v1.html`, still wired to the original `css/` + `js/` modules
- Nothing from v1 was deleted; v2 is additive apart from `index.html`

## v2 — current

Single-column, 720px-wide, sans-only layout structured after
[anishfn.ink](https://www.anishfn.ink/):

| Section | Content |
|---|---|
| Header | wordmark breadcrumb |
| Hero | avatar, name, role, "open to work" badge, intro prose with inline pill links |
| Experience | résumé snippet — one row per company: logo, role, years |
| Work | masonry grid of case covers from `data/feed-items.json` |
| Writing | dotted-leader list + dates, live from the Substack feed |
| Clients | logo wall (replaces the reference's GitHub graph) |
| Contact | email capture + socials (replaces the reference's guestbook) |
| Footer | © line + `/` hint, plus a fixed jump dock |

Typography is **Suisse Intl only** — Regular 400 and Medium 500. Reckless was
removed from the whole repo, including the v1 stylesheets, so `/v1.html` now
renders in Suisse too.

Stylesheets: `css/fonts.css`, `css/v2/tokens.css`, `css/v2/app.css`.
Scripts: `js/v2/*.js`. v2 shares nothing with the v1 CSS/JS.
