# Feed cover images

The feed grid loads covers from this folder. Each card in `data/feed-items.json` points at `image_0.jpg` … `image_29.jpg`.

## Replace with your own files

1. Export or copy your curated images into this folder.
2. Name them `image_0.jpg`, `image_1.jpg`, … (or update each item's `cover` path in `data/feed-items.json`).
3. Commit and push — Netlify serves them at `/assets/feeds/image_N.jpg`.

If your Mac folder uses other names (e.g. `F3QugBjWWAA7iaD.jpeg`), either rename to `image_N.jpg` in order, or set each `cover` field to the exact filename:

```json
"cover": "assets/feeds/F3QugBjWWAA7iaD.jpeg"
```

JPEG, JPG, PNG, and WebP are supported in modern browsers.
