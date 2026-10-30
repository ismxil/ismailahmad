// Read-only production smoke check. Intentionally do not follow redirects:
// a cached/redirected portfolio template must not count as a working article.
import assert from 'node:assert/strict';

const article = new URL(process.argv[2] || 'https://blog.ismailahmad.com/eureka');
assert.equal(article.protocol, 'https:');
const response = await fetch(article, {
    redirect: 'manual',
    headers: { 'User-Agent': 'WhatsApp/2.26' },
    signal: AbortSignal.timeout(20000),
});
assert.equal(response.status, 200,
    `Article must serve directly: HTTP ${response.status}, location=${response.headers.get('location')}`);
const html = await response.text();
const { JSDOM } = await import('jsdom');
const doc = new JSDOM(html).window.document;
const meta = name => doc.querySelector(`meta[property="${name}"]`)?.content;
assert.equal(meta('og:type'), 'article', 'Missing server-rendered article metadata');
assert(meta('og:title') && !/^Blog\s*[—-]/.test(meta('og:title')), 'Generic or missing article title');
assert(meta('og:description'), 'Missing article excerpt');
const canonical = new URL(doc.querySelector('link[rel="canonical"]')?.href);
assert.equal(canonical.hostname, 'blog.ismailahmad.com', 'Canonical left the blog domain');
assert.equal(canonical.pathname, article.pathname, 'Canonical lost the article path');
const image = new URL(meta('og:image'));
assert.equal(image.protocol, 'https:', 'Cover must use HTTPS');
assert(!/favicon|og-1200|profile|portrait/i.test(image.pathname), 'Generic portrait or site image replaced the cover');
const cover = await fetch(image, { signal: AbortSignal.timeout(20000) });
assert.equal(cover.status, 200, 'Cover is inaccessible');
assert.match(cover.headers.get('content-type') || '', /^image\//, 'Cover URL did not return an image');
assert((await cover.arrayBuffer()).byteLength > 0, 'Cover is empty');
console.log(`PASS: ${article.href} serves "${meta('og:title')}" and its accessible cover without redirecting.`);
