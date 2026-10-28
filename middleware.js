import { rewrite } from '@vercel/functions';

// Subdomains that serve a page at their root. A vercel.json rewrite can't do
// this because index.html already answers "/".
//   tiny-lagos.ismailahmad.com → the Little Lagos atlas
//   cv.ismailahmad.com         → the CV
export const config = { matcher: '/', runtime: 'nodejs' };

const roots = { 'tiny-lagos.': '/lagos', 'cv.': '/cv' };

export default function middleware(request) {
    const host = (request.headers.get('host') || '').split(':')[0];
    const prefix = Object.keys(roots).find(p => host.startsWith(p));
    if (prefix) return rewrite(new URL(roots[prefix], request.url));
}
