import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import posts from './posts.js';
import { escapeHTML, safeURL } from '../js/v2/blog-data.js';

// Social crawlers need metadata in the HTTP response, before browser JS runs.
// Reuse the posts API's slug validation, published-only query and cache policy.
export default async function article(req, res) {
    if (!['GET', 'HEAD'].includes(req.method)) {
        res.setHeader('Allow', 'GET, HEAD');
        res.statusCode = 405;
        return res.end('Method not allowed');
    }
    const upstream = {
        statusCode: 200, headers: {},
        setHeader(name, value) { this.headers[name] = value; },
        status(code) { this.statusCode = code; return this; },
        json(data) { this.data = data; return this; },
    };
    await posts({ method: 'GET', query: { slug: req.query?.slug ?? '' } }, upstream);
    res.statusCode = upstream.statusCode;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    if (upstream.statusCode !== 200) {
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('X-Robots-Tag', 'noindex');
        return res.end(req.method === 'HEAD' ? undefined : `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Blog — Ismail Ahmad</title></head><body><h1>${escapeHTML(upstream.data.error)}</h1><a href="https://blog.ismailahmad.com/">Back to the blog</a></body></html>`);
    }
    try {
        const template = await readFile(join(process.cwd(), 'post.html'), 'utf8');
        const html = articleHTML(template, upstream.data.post);
        res.setHeader('Cache-Control', upstream.headers['Cache-Control']);
        return res.end(req.method === 'HEAD' ? undefined : html);
    } catch {
        res.statusCode = 500;
        res.setHeader('Cache-Control', 'no-store');
        return res.end(req.method === 'HEAD' ? undefined : 'The article is temporarily unavailable.');
    }
}

export function articleHTML(template, post) {
    const title = `${post.title} — Ismail Ahmad`;
    const description = post.excerpt || post.title;
    const canonical = `https://blog.ismailahmad.com/${encodeURIComponent(post.slug)}`;
    const image = sharingImage(post.cover);
    const cover = image.url;
    const hasCover = /^https?:/.test(cover);
    const meta = (name, value, attribute = 'property') => `<meta ${attribute}="${name}" content="${escapeHTML(value)}">`;
    const tags = [
        `<link rel="canonical" href="${escapeHTML(canonical)}">`,
        meta('og:type', 'article'), meta('og:site_name', 'Ismail Ahmad'),
        meta('og:title', post.title), meta('og:description', description), meta('og:url', canonical),
        meta('twitter:card', hasCover ? 'summary_large_image' : 'summary', 'name'),
        meta('twitter:title', post.title, 'name'), meta('twitter:description', description, 'name'),
    ];
    // Never substitute an unrelated image when the writer hasn't set a cover.
    if (hasCover) {
        tags.push(meta('og:image', cover), meta('og:image:alt', post.coverAlt || post.title),
            meta('twitter:image', cover, 'name'), meta('twitter:image:alt', post.coverAlt || post.title, 'name'));
        if (cover.startsWith('https:')) tags.push(meta('og:image:secure_url', cover));
        if (image.width) tags.push(meta('og:image:type', 'image/jpeg'),
            meta('og:image:width', image.width), meta('og:image:height', image.height));
    }
    return template.replace(/<title>.*?<\/title>/s, () => `<title>${escapeHTML(title)}</title>`)
        .replace(/<meta name="description" content="[^"]*"\s*\/?>/, () => meta('description', description, 'name'))
        .replace('</head>', () => `${tags.join('\n    ')}\n</head>`);
}

// Keep the author's whole cover, but give crawlers a small, predictable JPEG.
// Sanity asset names include the source dimensions, so no extra CMS call is needed.
function sharingImage(value) {
    const url = safeURL(value);
    if (!/^https?:/.test(url)) return { url: '' };
    const image = new URL(url);
    const dimensions = image.pathname.match(/-(\d+)x(\d+)\.[a-z]+$/i);
    if (image.hostname !== 'cdn.sanity.io' || !dimensions) return { url };
    const sourceWidth = Number(dimensions[1]);
    const sourceHeight = Number(dimensions[2]);
    if (!sourceWidth || !sourceHeight) return { url };
    const width = Math.min(1200, sourceWidth);
    const height = Math.max(1, Math.round(sourceHeight * width / sourceWidth));
    // This is an asset URL from Sanity, not the thumbnail URL used in the list.
    image.search = new URLSearchParams({ w: String(width), fit: 'max', fm: 'jpg', q: '80' }).toString();
    return { url: image.href, width, height };
}
