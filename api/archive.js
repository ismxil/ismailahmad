import { sanityConfig } from '../js/sanity-config.js';

export const archiveQuery = `*[_type == "feedItem" && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && defined(coalesce(cover.asset->url, previewMedia[0].asset->url))] | order(coalesce(order, 999999) asc, _createdAt desc) {
    "id": _id,
    "client": name,
    "category": projectType,
    "cover": coalesce(cover.asset->url, previewMedia[0].asset->url)
}`;

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }
    // Read the live published dataset: additions and removals appear on refresh.
    res.setHeader('Cache-Control', 'no-store');
    const url = new URL(`https://${sanityConfig.projectId}.api.sanity.io/v${sanityConfig.apiVersion}/data/query/${sanityConfig.dataset}`);
    url.searchParams.set('perspective', 'published');
    url.searchParams.set('query', archiveQuery);
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('CMS unavailable');
        const { result } = await response.json();
        if (!Array.isArray(result)) throw new Error('Invalid CMS response');
        return res.status(200).json({ items: result });
    } catch {
        return res.status(502).json({ error: 'The archive is temporarily unavailable. Please try again.' });
    }
}
