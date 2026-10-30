import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import middleware from '../middleware.js';

const routes = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const blogHost = rule => rule.has?.some(h => h.type === 'host' && h.value === 'blog.ismailahmad.com');

test('Blog host serves article metadata and never redirects to the portfolio domain', () => {
    const article = routes.rewrites.find(r => blogHost(r) && r.source.startsWith('/:slug'));
    assert.equal(article?.destination, '/api/posts?render=article&slug=:slug');
    for (const rule of routes.redirects) {
        if (rule.has && !blogHost(rule)) continue;
        assert(!/^https?:\/\/(?:www\.)?ismailahmad\.com(?:[/:]|$)/.test(rule.destination),
            `Blog regression: ${rule.source} redirects to ${rule.destination}`);
    }
});

test('Blog root and existing CV, PDF and Lagos subdomains retain their own handlers', () => {
    for (const [host, path] of [
        ['blog.ismailahmad.com', '/api/posts'],
        ['cv.ismailahmad.com', '/cv'],
        ['pdf.ismailahmad.com', '/pdf'],
        ['tiny-lagos.ismailahmad.com', '/lagos'],
    ]) {
        const response = middleware(new Request(`https://${host}/?utm_source=test`, { headers: { host } }));
        const destination = new URL(response.headers.get('x-middleware-rewrite'));
        assert.equal(destination.hostname, host);
        assert.equal(destination.pathname, path);
        if (host === 'blog.ismailahmad.com') {
            assert.equal(destination.searchParams.get('index'), '1');
            assert.equal(destination.searchParams.get('utm_source'), 'test');
        }
    }
    assert.equal(middleware(new Request('https://www.ismailahmad.com/', {
        headers: { host: 'www.ismailahmad.com' },
    })), undefined);
});

test('Blog index links use short article paths and browser JS preserves server canonical metadata', async () => {
    const js = await readFile(new URL('../js/v2/blog.js', import.meta.url), 'utf8');
    assert(js.includes("location.hostname === 'blog.ismailahmad.com' ? '' : '/blog'"));
    assert(!js.includes('href="/blog/${'));
    assert(!js.includes('https://www.ismailahmad.com/blog/${'));
    assert(js.includes('document.querySelector(\'link[rel="canonical"]\')'));
});
