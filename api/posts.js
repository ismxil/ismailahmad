import { sanityConfig } from '../js/sanity-config.js';

// Imported image blocks keep the Substack CDN path they came from as
// provenance. The images themselves are rehosted on Sanity, and nothing
// renders that field, so it is nulled out rather than shipped to the page.
export const publishedFilter = '_type == "post" && !(_id in path("drafts.**")) && defined(slug.current) && defined(publishedAt) && publishedAt <= now()';
const summary = 'title,"slug":slug.current,excerpt,publishedAt,author,"cover":coverImage.asset->url,"coverAlt":coverImage.alt';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }
    const slug = req.query?.slug;
    if (slug !== undefined && (typeof slug !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160)) {
        return res.status(400).json({ error: 'Invalid article slug' });
    }
    const url = new URL(`https://${sanityConfig.projectId}.apicdn.sanity.io/v${sanityConfig.apiVersion}/data/query/${sanityConfig.dataset}`);
    url.searchParams.set('perspective', 'published');
    url.searchParams.set('query', slug
        ? `*[${publishedFilter} && slug.current == $slug][0]{${summary},body[]{...,"sourceUrl":null,asset->{url}}}`
        : `*[${publishedFilter}] | order(publishedAt desc)[0...200]{${summary}}`);
    if (slug) url.searchParams.set('$slug', JSON.stringify(slug));
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('CMS unavailable');
        const { result } = await response.json();
        if (slug && !result) return res.status(404).json({ error: 'Article not found' });
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json(slug ? { post: result } : { posts: result || [] });
    } catch {
        return res.status(502).json({ error: 'The blog is temporarily unavailable. Please try again.' });
    }
}
