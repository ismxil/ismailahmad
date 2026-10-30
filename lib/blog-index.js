import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

// A function target avoids clean-URL redirects when middleware serves the
// blog index at the subdomain root (where the portfolio index also exists).
export default async function blogIndex(req, res) {
    if (!['GET', 'HEAD'].includes(req.method)) {
        res.statusCode = 405;
        res.setHeader('Allow', 'GET, HEAD');
        return res.end('Method not allowed');
    }
    try {
        const html = await readFile(join(process.cwd(), 'blog.html'), 'utf8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
        return res.end(req.method === 'HEAD' ? undefined : html);
    } catch {
        res.statusCode = 500;
        res.setHeader('Cache-Control', 'no-store');
        return res.end('The blog is temporarily unavailable.');
    }
}
