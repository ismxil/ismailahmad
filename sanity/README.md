# Sanity CMS — Blog and Archive

Studio: https://ismailahmad-blog.sanity.studio/

## Manage the Archive

Open **Archive item** in Studio. The homepage and `/archive` read only published items from this dataset.

- **Add:** create an item, type its Name, add Media (an Image, a Video, or both), pick a Type, optionally pick a Category, and click Publish.
- **Type** (required) is the intent or maturity of the work: Concept, Exploration, Redesign, Prototype, Shipped; it shows next to the name on the site. **Category** (optional, not shown on the site) is what was designed: Mobile App, Web App, Website, Dashboard, Identity, Digital Product, Interaction, Other.
- **Video:** plays muted on a loop on Home and `/archive` while on screen, and in the lightbox. Add an Image too: it shows while the video loads and sets the plate's shape up front. MP4 (H.264) plays everywhere; keep clips short and under ~10 MB.
- **Edit:** change its name, category, image, or video, then Publish.
- **Order:** newest first. New items appear at the top; the first nine appear on the homepage. The original 25 imported items keep their curated order beneath anything added since.
- **Remove:** Unpublish to hide it while keeping it in Studio, or Delete to remove it. Refresh the site to see the change.
- An item must have an Image or a Video to appear.

No site deployment is needed for content changes. The Archive reads `/api/archive`, which fetches the published Sanity dataset without a local JSON fallback or response cache. Empty means empty; removed items do not return.

The original 25 covers were imported into Sanity image storage using `scripts/import-archive.mjs`. This is a one-time migration; do not rerun it after deleting imported items.

## Manage Wandering

Open **Wandering place** in Studio. The Wandering wall on the About page, under the signature, reads only published places from this dataset.

- **Add:** create a place, type its name (e.g. Malta), drop its photos into Photos, and click Publish. Write a short Description on each photo for screen readers.
- **Crop:** every photo shows at 3:4. Set the hotspot on a photo to choose what stays in frame.
- **Reorder:** drag photos within a place; change Sort order to move a place along the wall. Lower numbers come first.
- **Remove:** Unpublish or Delete the place. With nothing published, the section hides itself.

No site deployment is needed. The wall reads `/api/wandering`, which fetches the published dataset uncached. Berlin was created once by `scripts/import-wandering.mjs`; do not rerun it after deleting Berlin.

## Manage articles

Open **Blog post**, edit the article, and click Publish. Articles are served under `/blog`; drafts are not shown publicly. Keep an existing Slug unchanged to preserve links. Blog responses may take a few minutes to refresh due to caching.

## Manage case studies

Open **Case study** to edit Lemfi, Etihad Credit Bureau, Cadana, or Gomoney, or create another case.

- **Overview:** project name, headline, introduction paragraphs, card cover, hero image, and sort order.
- **Rotating cover images** (Overview): choose/upload images for homepage cards. Drag to change their cycle order. Empty uses the static Project card cover; a single selected image stays still. The Work index keeps using Project card cover.
- **Hero video** (Overview): optional. Plays muted on a loop at the top of the case page in place of the Hero image, which becomes the still shown while it loads.
- **Cover video** (Overview): optional. Plays muted on a loop on the project card on Home and Work, in place of the rotating images. Project card cover still shows while it loads.
- **Details:** role, years, project type, scope, industry, and website.
- **Content:** reorder, add, edit, or remove text sections, images, videos, image pairs, quotes, results, callouts, and images with text. A **Video** section plays muted on a loop while on screen; its optional Image is the still shown while it loads. **Two images** can hold an image or a video in each slot (Add item → Video).
- Click **Publish**, then refresh the website. No code deployment is required.
- Keep existing URL slugs unchanged to preserve `/work/<slug>` links.
- Unpublishing removes a case from Home, Work, Menu, and next-project navigation. Its old URL shows the existing case-not-found view.
- The original cases remain in `data/cases.js` as a migration backup, not a live fallback. Never rerun the one-time importer after deleting a case.

The migration retains all original copy and section ordering and stores all case imagery in Sanity. Case pages and cards read `/api/cases` from the published dataset.

## Legacy feed

The remaining field reference below describes the older feed layout. The current Archive uses only Name, Media (Image and Video), Type, and Category.

## Setup

```bash
cd sanity
npm install
npm run dev
```

Opens at `http://localhost:3333`. Project ID: `x7x0om5p` (set in `js/sanity-config.js`).

Add `http://localhost:8080` to **CORS origins** in [Sanity Manage](https://www.sanity.io/manage).

## Feed Item schema

Each document maps to one grid card + one modal.

### Header
| Field | Type | Notes |
|-------|------|-------|
| Name | string | Project / client name |
| Logo | image | Modal header icon |
| Year | number | Start year |
| End year | number | Optional, for ranges |
| Type | list | Web App, Mobile App, Website, etc. |
| Live URL | url | Shown as link pill on hero |
| Tagline | text | One-liner under title |
| Accent color | string | Fallback when no logo |

### Preview
| Field | Type | Notes |
|-------|------|-------|
| Grid cover | image | Feed thumbnail |
| Preview screenshots | image[] | First image = modal hero |

### Stats
Array of **value + label** objects, e.g. `2,000+` / `Active users`.

### The Problem
| Field | Type |
|-------|------|
| Body text | text (Markdown) |

### The Market
| Field | Type |
|-------|------|
| Big stat | string (e.g. `$129B`) |
| Description | text |
| Source citation | string |

### CTA
| Field | Type |
|-------|------|
| Button label | string |
| Button URL | url (falls back to Live URL) |

### Publishing
| Field | Type |
|-------|------|
| Slug | slug |
| Sort order | number |

## Frontend

- `js/feed-items.js` — fetches from Sanity, falls back to `data/feed-items.json`
- `js/feed-modal.js` — renders structured sections in the modal
- `js/feeds-page.js` — boots grid + modal after site loader

Until you publish Feed Items in Studio, the site uses the local JSON fallback.

## Environment

`sanity/.env`:

```
SANITY_STUDIO_PROJECT_ID=x7x0om5p
SANITY_STUDIO_DATASET=production
```
