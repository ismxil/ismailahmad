import { rewrite } from '@vercel/functions';

// tiny-lagos.ismailahmad.com serves the Little Lagos atlas at its root. A
// vercel.json rewrite can't do this because index.html already answers "/".
export const config = { matcher: '/', runtime: 'nodejs' };

export default function middleware(request) {
    const host = (request.headers.get('host') || '').split(':')[0];
    if (host.startsWith('tiny-lagos.')) return rewrite(new URL('/lagos', request.url));
}
