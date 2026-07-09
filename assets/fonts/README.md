# Font files

Add your licensed webfont files here. The site loads them from `css/fonts.css`.

## Required files

Place your exported **woff2** files here (woff or otf optional fallbacks with the same base name):

### `reckless/`

| File name | Used for |
|-----------|----------|
| `Reckless-Regular.woff2` | Serif body copy (`font-weight: 400`) |
| `Reckless-Medium.woff2` | Headings — h1, h2, display type (`font-weight: 500`) |

### `suisse/`

| File name | Used for |
|-----------|----------|
| `SuisseIntl-Regular.woff2` | Sans body (`font-weight: 400`) |
| `SuisseIntl-Medium.woff2` | Sans UI — pills, nav, buttons (`font-weight: 500`) |

If your files from the foundry use different names (e.g. `RecklessNeue-Medium.woff2`), either rename them to match the table above or update the paths in `css/fonts.css`.

## How to upload (fix “file could not be found” in Cursor)

That error usually means the Cloud Agent could not receive the attachment. Use **git** instead:

1. On your Mac/PC, clone or open the repo locally.
2. Copy your `.woff2` files into `assets/fonts/reckless/` and `assets/fonts/suisse/`.
3. Commit and push:

```bash
git add assets/fonts/
git commit -m "Add Reckless and Suisse Intl webfonts"
git push origin master
```

Or upload via **GitHub.com** → your repo → **Add file** → **Upload files** → drag into `assets/fonts/reckless/` etc.

4. After push, refresh the site (or re-run the Cloud Agent) — no code changes needed if file names match.

## Export tips

- Prefer **woff2** for the web (smallest, fastest).
- Convert with [fonttools](https://github.com/fonttools/fonttools) or your foundry’s web kit.
- Do not commit desktop-only `.ttc` or unlicensed trial fonts if your license forbids hosting.

## Remove fallbacks

Once real files are in place, delete the two “Temporary fallbacks” `@font-face` blocks at the bottom of `css/fonts.css` (Signifier / Uncut Sans).
