import { protectedCase, validSlug } from '../lib/case-access.js';
import { publicPreview } from '../lib/case-content.js';
import { sanityConfig } from '../js/sanity-config.js';

/** Return a blurred derivative, never its original private image URL. */
export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed.' });
    }
    const slug = req.query?.slug;
    if (!validSlug(slug)) return res.status(400).json({ error: 'Invalid case study.' });
    try {
        const item = await protectedCase(slug);
        const preview = item && publicPreview(item);
        if (!preview) return res.status(404).json({ error: 'Preview unavailable.' });
        const firstImage = item.blocks.slice(preview.blocks.length)
            .flatMap(block => block.src || block.images?.map(image => image.src) || []).find(Boolean);
        if (!firstImage) return res.status(404).json({ error: 'Preview unavailable.' });
        const url = new URL(firstImage);
        if (url.protocol !== 'https:' || url.hostname !== 'cdn.sanity.io' ||
            !url.pathname.startsWith(`/images/${sanityConfig.projectId}/${sanityConfig.dataset}/`)) {
            return res.status(404).json({ error: 'Preview unavailable.' });
        }
        url.search = '';
        url.searchParams.set('w', '320');
        url.searchParams.set('blur', '40');
        url.searchParams.set('fm', 'webp');
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error();
        res.setHeader('Content-Type', 'image/webp');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
        res.statusCode = 200;
        return res.end(Buffer.from(await response.arrayBuffer()));
    } catch {
        return res.status(503).json({ error: 'Preview unavailable.' });
    }
}
