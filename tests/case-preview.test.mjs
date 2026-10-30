import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/case-preview.js';

const response = () => ({ headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; }, end(data) { this.body = data; return this; } });
const item = { slug: 'sterling', accessCode: '123456', previewEndKey: 'public', blocks: [
    { _key: 'public', type: 'image', src: 'https://cdn.sanity.io/images/x7x0om5p/production/public.png' },
    { _key: 'private', type: 'image', src: 'https://cdn.sanity.io/images/x7x0om5p/production/private.png?dlRaw=1' },
] };
function configure(t, fetch) {
    const previous = { token: process.env.SANITY_CASE_READ_TOKEN, secret: process.env.CASE_ACCESS_SECRET };
    process.env.SANITY_CASE_READ_TOKEN = 'test-reader'; process.env.CASE_ACCESS_SECRET = 'a-test-session-secret-with-at-least-32-characters';
    t.after(() => {
        for (const [key, value] of Object.entries({ SANITY_CASE_READ_TOKEN: previous.token, CASE_ACCESS_SECRET: previous.secret })) {
            if (value == null) delete process.env[key]; else process.env[key] = value;
        }
    });
    return t.mock.method(globalThis, 'fetch', fetch);
}

test('Preview images are fixed blurred derivatives, with no original URL or credentials in the response', async t => {
    let imageUrl;
    configure(t, async (url, options) => {
        if (url.hostname.endsWith('.api.sanity.io')) return Response.json({ result: item });
        imageUrl = url;
        assert.equal(options.headers, undefined);
        return new Response(Buffer.from('blurred-image'), { headers: { 'Content-Type': 'image/webp' } });
    });
    const res = response(); await handler({ method: 'GET', query: { slug: 'sterling', w: '4000', blur: '0', fm: 'json' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(imageUrl.searchParams.get('w'), '320'); assert.equal(imageUrl.searchParams.get('blur'), '40');
    assert.equal(imageUrl.searchParams.get('fm'), 'webp'); assert(!imageUrl.searchParams.has('dlRaw'));
    assert.equal(res.headers['Content-Type'], 'image/webp'); assert(!res.headers.Location);
    assert.equal(res.body.toString(), 'blurred-image');
});

test('Preview images cannot proxy other hosts or cases without a preview marker', async t => {
    let current = { ...item, blocks: [item.blocks[0], { ...item.blocks[1], src: 'http://127.0.0.1/private' }] };
    const spy = configure(t, async () => Response.json({ result: current }));
    const external = response(); await handler({ method: 'GET', query: { slug: 'sterling' } }, external); assert.equal(external.statusCode, 404);
    current = { ...item, previewEndKey: 'missing' };
    const missing = response(); await handler({ method: 'GET', query: { slug: 'sterling' } }, missing); assert.equal(missing.statusCode, 404);
    assert.equal(spy.mock.callCount(), 2);
});
