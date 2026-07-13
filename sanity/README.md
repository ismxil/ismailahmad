# Sanity CMS — Feed

Studio for managing feed project cards and modal content.

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
