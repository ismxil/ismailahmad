# Feed CMS

The Feed page reads project cards from **`data/feed-items.json`**. Edit that file to change copy, images, and the number of cards in the 3D feed.

## Edit content

Each item in `items`:

| Field | Description |
|-------|-------------|
| `id` | Unique slug (for your reference) |
| `client` | Client / project name (modal label) |
| `headline` | Main headline in the modal |
| `category` | e.g. Concepts, App Design |
| `years` | e.g. `(2021 - 2024)` |
| `description` | Right-column body copy |
| `cover` | Image path under `assets/feeds/` (e.g. `image_0.jpg`) |
| `accent` | Hex color behind the hero image |

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

1. Add JPG/PNG files to `assets/feeds/` (e.g. `image_0.jpg`, `image_1.jpg`, …)
2. Set each item's `cover` to that path
3. Keep one JSON entry per card you want in the feed

The visualizer builds its texture atlas from every item in the JSON array.

## Publish changes

1. Edit `data/feed-items.json` (and images if needed)
2. Commit and push — the site loads the JSON at runtime

No build step required.

## Optional upgrades

| Approach | Best for |
|----------|----------|
| **JSON in repo** (current) | Simple, version-controlled, free |
| **Google Sheets** | Non-technical editors; export to JSON via Apps Script or [Sheets → JSON](https://sheetdb.io) |
| **Airtable** | Structured content + API; fetch from `feed-items.js` instead of local JSON |
| **Decap CMS** | Git-based UI at `/admin` for editing JSON in the repo |
| **Sanity / Contentful** | Larger teams, image CDN, drafts |

To switch to an API later, change `loadFeedItems()` in `js/feed-items.js` to `fetch('https://your-api/feed')` and keep the same `items` shape.
