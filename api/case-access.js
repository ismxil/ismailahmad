import { servePortfolioAsset } from '../lib/portfolio-assets.js';
import { allowedOrigin, codeMatches, cookieName, createSession, protectedCase, sessionCookie, SESSION_SECONDS, validSession, validSlug } from '../lib/case-access.js';
import { omitNull } from './cases.js';
import { publicPreview } from '../lib/case-content.js';

const attempts = new Map();
const WINDOW = 15 * 60 * 1000;
function throttled(req, slug) {
    const now = Date.now();
    for (const [key, attempt] of attempts) if (attempt.expires <= now) attempts.delete(key);
    const ip = String(req.headers?.['x-vercel-forwarded-for'] || req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    const key = `${slug}:${ip}`;
    if (attempts.size >= 5000 && !attempts.has(key)) return true;
    const attempt = attempts.get(key) || { count: 0, expires: now + WINDOW };
    attempts.set(key, attempt);
    return ++attempt.count > 5;
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Vary', 'Cookie');
    if (!['GET', 'POST'].includes(req.method)) {
        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Method not allowed.' });
    }
    let slug, code;
    if (req.method === 'POST') {
        if (!allowedOrigin(req.headers?.origin)) return res.status(403).json({ error: 'Please enter the code on the website.' });
        try {
            if (typeof req.body === 'string' && Buffer.byteLength(req.body) > 1024) throw new Error();
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            ({ slug, code } = body || {});
        } catch { return res.status(400).json({ error: 'Please enter a six-digit code.' }); }
        if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return res.status(400).json({ error: 'Please enter a six-digit code.' });
    } else slug = req.query?.slug;
    if (!validSlug(slug)) return res.status(400).json({ error: 'Invalid case study.' });
    if (req.method === 'POST' && throttled(req, slug)) {
        res.setHeader('Retry-After', '900');
        return res.status(429).json({ error: 'Too many attempts. Try again in 15 minutes.' });
    }
    // An anonymous read never fetches protected content.
    if (req.method === 'GET' && !sessionCookie(req, slug) && req.query?.preview !== '1') return res.status(401).json({ error: 'Enter your access code to view this case study.' });
    try {
        const item = await protectedCase(slug);
        if (!item || item.slug !== slug) return res.status(404).json({ error: 'Case study unavailable.' });
        if (req.method === 'POST') {
            if (!codeMatches(code, item.accessCode)) return res.status(401).json({ error: 'That code isn’t right. Please try again.' });
            const token = createSession(slug, item.accessCode);
            const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';
            res.setHeader('Set-Cookie', `${cookieName(slug)}=${token}; HttpOnly; SameSite=Strict; Path=/api/case-access; Max-Age=${SESSION_SECONDS}${secure}`);
        } else if (!validSession(sessionCookie(req, slug), slug, item.accessCode)) {
            const preview = req.query?.preview === '1' ? publicPreview(item) : null;
            if (preview) return res.status(200).json({ case: omitNull(preview) });
            return res.status(401).json({ error: 'Enter your access code to view this case study.' });
        }
        if (slug === 'portfolio') {
            if (req.method === 'GET' && req.query?.asset) return servePortfolioAsset(req.query.asset, res);
            return res.status(200).json({ unlocked: true });
        }
        const { accessCode, previewEndKey, ...content } = item;
        return res.status(200).json({ case: omitNull(content) });
    } catch {
        return res.status(503).json({ error: 'Access is unavailable just now. Please try again later.' });
    }
}
