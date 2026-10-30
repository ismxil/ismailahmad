import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { sanityConfig } from '../js/sanity-config.js';
import { caseFields } from './case-content.js';

export const SESSION_SECONDS = 8 * 60 * 60;
export const validSlug = slug => typeof slug === 'string' && slug.length <= 80 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
export const cookieName = slug => `case_access_${slug.replaceAll('-', '_')}`;
const digest = value => createHash('sha256').update(value).digest();

export function codeMatches(candidate, code) {
    return typeof code === 'string' && /^\d{6}$/.test(code) &&
        typeof candidate === 'string' && /^\d{6}$/.test(candidate) &&
        timingSafeEqual(digest(candidate), digest(code));
}

function signature(payload, slug, code) {
    const secret = process.env.CASE_ACCESS_SECRET;
    if (!secret || secret.length < 32) throw new Error('Access is not configured');
    return createHmac('sha256', secret).update(`${slug}\0${code}\0${payload}`).digest('base64url');
}

export function createSession(slug, code, now = Date.now()) {
    const payload = Buffer.from(JSON.stringify({ slug, expires: Math.floor(now / 1000) + SESSION_SECONDS })).toString('base64url');
    return `${payload}.${signature(payload, slug, code)}`;
}

export function validSession(token, slug, code, now = Date.now()) {
    if (typeof token !== 'string' || token.length > 512 || !/^\d{6}$/.test(code || '')) return false;
    const [payload, signed, extra] = token.split('.');
    if (!payload || !signed || extra) return false;
    try {
        const expected = signature(payload, slug, code);
        if (signed.length !== expected.length || !timingSafeEqual(Buffer.from(signed), Buffer.from(expected))) return false;
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
        return data.slug === slug && Number.isInteger(data.expires) && data.expires > Math.floor(now / 1000) && data.expires <= Math.floor(now / 1000) + SESSION_SECONDS;
    } catch { return false; }
}

export function sessionCookie(req, slug) {
    const prefix = `${cookieName(slug)}=`;
    return String(req.headers?.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith(prefix))?.slice(prefix.length);
}

export function allowedOrigin(origin) {
    const allowed = new Set(['https://www.ismailahmad.com', 'https://ismailahmad.com']);
    if (process.env.VERCEL_URL) allowed.add(`https://${process.env.VERCEL_URL}`);
    if (process.env.VERCEL_ENV !== 'production') {
        allowed.add('http://localhost:4322');
        if (process.env.PORT) allowed.add(`http://localhost:${process.env.PORT}`);
    }
    return allowed.has(origin);
}

export async function protectedCase(slug) {
    const token = process.env.SANITY_CASE_READ_TOKEN;
    if (!token || !process.env.CASE_ACCESS_SECRET || process.env.CASE_ACCESS_SECRET.length < 32) throw new Error('Access is not configured');
    const url = new URL(`https://${sanityConfig.projectId}.api.sanity.io/v${sanityConfig.apiVersion}/data/query/${sanityConfig.dataset}`);
    // A dotted ID is private in Sanity, even in a public dataset. Never query drafts.
    url.searchParams.set('query', `*[_id == $id && _type == "protectedCaseStudy"][0]{${caseFields},accessCode,previewEndKey}`);
    url.searchParams.set('$id', JSON.stringify(`protected.${slug}`));
    url.searchParams.set('perspective', 'published');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Protected case unavailable');
    const { result } = await response.json();
    return result;
}
