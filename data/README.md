# Feed CMS

The Feed page loads project cards from **Sanity** when configured, otherwise from **`data/feed-items.json`**.

## Sanity (recommended)

1. Project ID is set in `js/sanity-config.js` (`x7x0om5p`)
2. Run the Studio: `cd sanity && npm install && npm run dev`
3. Add **Feed Item** documents with Markdown content

See **`sanity/README.md`** for full setup.

## Local JSON fallback

If Sanity has no feed items yet, edit **`data/feed-items.json`** directly.

## Edit content

Each item in `items`:

| Field | Description |
|-------|-------------|
| `id` | Unique slug (for your reference) |
| `client` | Client / project name (modal label) |
| `headline` | Main headline in the modal |
| `category` | e.g. Concepts, App Design |
| `years` | e.g. `(2021 - 2024)` |
| `description` | Short fallback body copy |
| `content` | Markdown body for the modal (Sanity field) |
| `stats` | Optional pill badges |
| `cover` | Image path under `assets/feeds/` |
| `heroImage` | Large modal image (Sanity) |
| `accent` | Hex color behind the hero image |
| `link` | Project URL |
| `ctaLabel` | CTA button label |

### Example

```json
{
  "id": "lemfi-community",
  "client": "Lemfi",
  "headline": "Building a community that let's people bond…",
  "category": "Concepts",
  "years": "(2021 - 2024)",
  "description": "Researched target audiences and user needs…",
  "cover": "assets/feeds/image_0.jpg",
  "accent": "#393bfe"
}
```

## Add or change images

1. Add JPG/PNG files to `assets/feeds/`
2. Set each item's `cover` to that path (or upload in Sanity Studio)

## Publish changes

1. Edit in Sanity Studio or `data/feed-items.json`
2. Hard-refresh the feeds page

No build step required.
