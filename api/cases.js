import { sanityConfig } from '../js/sanity-config.js';
import { caseFields, publicCase } from '../lib/case-content.js';

export const caseQuery = `*[_type == "caseStudy" && !(_id in path("drafts.**")) && !(_id in path("versions.**")) && defined(slug.current)] | order(coalesce(order, 999999) asc, _createdAt asc) {${caseFields}}`;

// Optional Sanity fields are null; omit them to retain the renderer's data shape.
export function omitNull(value) {
    if (Array.isArray(value)) return value.map(omitNull);
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([,v]) => v != null).map(([k,v]) => [k,omitNull(v)]));
    return value;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
    }
    res.setHeader('Cache-Control', 'no-store');
    const url = new URL(`https://${sanityConfig.projectId}.api.sanity.io/v${sanityConfig.apiVersion}/data/query/${sanityConfig.dataset}`);
    url.searchParams.set('perspective', 'published');
    url.searchParams.set('query', caseQuery);
    try {
        const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('CMS unavailable');
        const { result } = await response.json();
        if (!Array.isArray(result)) throw new Error('Invalid CMS response');
        return res.status(200).json({ cases: omitNull(result.map(publicCase)) });
    } catch {
        return res.status(502).json({ error: 'Case studies are temporarily unavailable. Please try again.' });
    }
}
