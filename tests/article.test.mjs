import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import article, { articleHTML } from '../api/article.js';

function response() {
    return { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; }, end(body) { this.body = body; } };
}

test('Article HTTP HTML contains the exact Sanity cover for social crawlers without JavaScript', async t => {
    const cover = 'https://cdn.sanity.io/images/project/production/cover.jpg';
    t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ result: {
        title: 'Perspective <&> "test"', slug: 'perspective', excerpt: 'Ideas & <script>text</script>',
        cover, coverAlt: 'Different "journeys"',
    } }) }));
    const res = response();
    await article({ method: 'GET', query: { slug: 'perspective' } }, res);
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['Content-Type'], /text\/html/);
    const doc = new JSDOM(res.body).window.document;
    assert.equal(doc.querySelector('meta[property="og:image"]').content, cover);
    assert.equal(doc.querySelector('meta[name="twitter:image"]').content, cover);
    assert.equal(doc.querySelector('meta[property="og:image:alt"]').content, 'Different "journeys"');
    assert.equal(doc.querySelectorAll('link[rel="canonical"]').length, 1);
    assert.equal(doc.querySelector('link[rel="canonical"]').href, 'https://blog.ismailahmad.com/perspective');
    assert.equal(doc.title, 'Perspective <&> "test" — Ismail Ahmad');
    assert.equal(doc.querySelector('meta[name="description"]').content, 'Ideas & <script>text</script>');
    assert(!doc.body.textContent.includes('Ideas &'));
    assert.match(res.headers['Cache-Control'], /s-maxage=60/);
    const head = response();
    await article({ method: 'HEAD', query: { slug: 'perspective' } }, head);
    assert.equal(head.statusCode, 200);
    assert.equal(head.body, undefined);
});

test('Missing or unsafe covers never use a body image or unrelated fallback', async t => {
    const mock = t.mock.method(globalThis, 'fetch');
    for (const cover of [null, 'javascript:alert(1)', 'mailto:hello@example.com']) {
        mock.mock.mockImplementation(async () => ({ ok: true, json: async () => ({ result: {
            title: 'Post', slug: 'post', cover, body: [{ _type: 'image', asset: { url: 'https://example.com/body.jpg' } }],
        } }) }));
        const res = response();
        await article({ method: 'GET', query: { slug: 'post' } }, res);
        const doc = new JSDOM(res.body).window.document;
        assert.equal(doc.querySelector('meta[property="og:image"]'), null);
        assert.equal(doc.querySelector('meta[name="twitter:card"]').content, 'summary');
    }
});

test('Each Sanity cover gets its own JPEG sharing URL with accurate dimensions and no cropping', () => {
    for (const [asset, width, height] of [['first-1672x941.png', 1200, 675], ['second-800x450.jpg', 800, 450]]) {
        const cover = `https://cdn.sanity.io/images/project/production/${asset}`;
        const doc = new JSDOM(articleHTML('<head><title>Blog</title></head>', { title: 'Post', slug: 'post', cover })).window.document;
        const image = new URL(doc.querySelector('meta[property="og:image"]').content);
        assert.equal(image.origin + image.pathname, cover);
        assert.equal(image.searchParams.get('fm'), 'jpg');
        assert.equal(image.searchParams.get('w'), String(width));
        assert.equal(image.searchParams.get('fit'), 'max');
        assert.equal(image.searchParams.has('h'), false);
        assert.equal(doc.querySelector('meta[name="twitter:image"]').content, image.href);
        assert.equal(doc.querySelector('meta[property="og:image:secure_url"]').content, image.href);
        assert.equal(doc.querySelector('meta[property="og:image:type"]').content, 'image/jpeg');
        assert.equal(doc.querySelector('meta[property="og:image:width"]').content, String(width));
        assert.equal(doc.querySelector('meta[property="og:image:height"]').content, String(height));
    }
});

test('Article route retains slug validation, missing-post status and upstream failure behavior', async t => {
    const mock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ result: null }) }));
    const missing = response();
    await article({ method: 'GET', query: { slug: 'missing' } }, missing);
    assert.equal(missing.statusCode, 404);
    assert.equal(missing.headers['Cache-Control'], 'no-store');
    assert.equal(missing.headers['X-Robots-Tag'], 'noindex');
    for (const slug of ['bad.slug', undefined]) {
        const bad = response();
        await article({ method: 'GET', query: { slug } }, bad);
        assert.equal(bad.statusCode, 400);
    }
    mock.mock.mockImplementation(async () => { throw Error('private error'); });
    const error = response();
    await article({ method: 'GET', query: { slug: 'post' } }, error);
    assert.equal(error.statusCode, 502);
    assert(!error.body.includes('private error'));
    const method = response();
    await article({ method: 'POST', query: { slug: 'post' } }, method);
    assert.equal(method.statusCode, 405);
});

test('Clean blog URLs route to server metadata and package the HTML template', async () => {
    const routes = JSON.parse(await readFile('vercel.json', 'utf8'));
    assert.equal(routes.rewrites.find(r => r.source === '/blog/:slug').destination, '/api/article?slug=:slug');
    assert.equal(routes.functions['api/article.js'].includeFiles, '*.html');
});

test('Blog index shares the article handler without an extra serverless function', async () => {
    const res = response();
    await article({ method: 'GET', query: { index: '1' } }, res);
    assert.equal(res.statusCode, 200);
    const doc = new JSDOM(res.body).window.document;
    assert.equal(doc.title, 'Blog — Ismail Ahmad');
    assert(doc.getElementById('blog-content'));
    assert.equal(doc.querySelector('link[rel="canonical"]').href, 'https://blog.ismailahmad.com/');
    assert.match(res.headers['Content-Type'], /text\/html/);
});
