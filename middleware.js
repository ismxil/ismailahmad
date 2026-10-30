import { rewrite } from '@vercel/functions';

// Subdomains that serve a page at their root. A vercel.json rewrite can't do
// this because index.html already answers "/".
//   tiny-lagos.ismailahmad.com → the Little Lagos atlas
//   cv.ismailahmad.com         → the CV
//   pdf.ismailahmad.com        → the portfolio deck
export const config = { matcher: '/', runtime: 'nodejs' };

const roots = { 'tiny-lagos.': '/lagos', 'cv.': '/cv', 'pdf.': '/pdf' };

export default function middleware(request) {
    const host = (request.headers.get('host') || '').split(':')[0];
    if (host === 'blog.ismailahmad.com') return rewrite(new URL('/api/article?index=1' + (new URL(request.url).search ? '&' + new URL(request.url).search.slice(1) : ''), request.url));
    const prefix = Object.keys(roots).find(p => host.startsWith(p));
    if (prefix) return rewrite(new URL(roots[prefix], request.url));
}
