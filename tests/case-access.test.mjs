import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/case-access.js';
import { createSession, validSession, cookieName, SESSION_SECONDS } from '../lib/case-access.js';

const response = () => ({ headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } });
const item = { slug: 'sterling', name: 'Sterling', headline: 'Sterling cards', accessCode: '123456', hero: 'private-hero.png', blocks: [{ type: 'section', body: 'Private story' }] };
const request = (code = '123456', ip = 'correct-code') => ({ method: 'POST', headers: { origin: 'https://www.ismailahmad.com', 'x-vercel-forwarded-for': ip }, body: { slug: 'sterling', code } });
function configure(t, value = item) {
    const original = { token: process.env.SANITY_CASE_READ_TOKEN, secret: process.env.CASE_ACCESS_SECRET, vercel: process.env.VERCEL };
    process.env.SANITY_CASE_READ_TOKEN = 'test-reader';
    process.env.CASE_ACCESS_SECRET = 'a-test-session-secret-with-at-least-32-characters';
    process.env.VERCEL = '1';
    t.after(() => {
        for (const [key, before] of Object.entries({ SANITY_CASE_READ_TOKEN: original.token, CASE_ACCESS_SECRET: original.secret, VERCEL: original.vercel })) {
            if (before == null) delete process.env[key]; else process.env[key] = before;
        }
    });
    return t.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(url.searchParams.get('$id'), '"protected.sterling"');
        assert.match(url.searchParams.get('query'), /_type == "protectedCaseStudy"/);
        assert.equal(url.searchParams.get('perspective'), 'published');
        assert.equal(options.headers.Authorization, 'Bearer test-reader');
        return { ok: true, json: async () => ({ result: value }) };
    });
}

test('Anonymous reads never fetch private content, and wrong codes never expose it', async t => {
    const spy = configure(t);
    const anonymous = response(); await handler({ method: 'GET', query: { slug: 'sterling' } }, anonymous);
    assert.equal(anonymous.statusCode, 401); assert.equal(spy.mock.callCount(), 0);
    const wrong = response(); await handler(request('999999', 'wrong-code'), wrong);
    assert.equal(wrong.statusCode, 401); assert(!JSON.stringify(wrong.data).includes('Private story'));
    assert(!wrong.headers['Set-Cookie']);
});

test('Correct codes grant a secure case-specific session and never return the passcode', async t => {
    configure(t);
    const unlocked = response(); await handler(request(), unlocked);
    assert.equal(unlocked.statusCode, 200);
    assert.equal(unlocked.data.case.blocks[0].body, 'Private story');
    assert(!('accessCode' in unlocked.data.case));
    const cookie = unlocked.headers['Set-Cookie'];
    for (const flag of ['HttpOnly', 'Secure', 'SameSite=Strict', 'Path=/api/case-access']) assert(cookie.includes(flag));
    const revisit = response();
    await handler({ method: 'GET', query: { slug: 'sterling' }, headers: { cookie: cookie.split(';')[0] } }, revisit);
    assert.equal(revisit.statusCode, 200); assert(!JSON.stringify(revisit.data).includes('123456'));
    assert.equal(revisit.headers['Cache-Control'], 'private, no-store');
    assert.equal(revisit.headers.Vary, 'Cookie');
});

test('Sessions reject tampering, other cases, expiry and a changed code', t => {
    configure(t);
    const now = Date.now();
    const token = createSession('sterling', '123456', now);
    assert(validSession(token, 'sterling', '123456', now));
    assert(!validSession(token + 'a', 'sterling', '123456', now));
    assert(!validSession(token, 'another-case', '123456', now));
    assert(!validSession(token, 'sterling', '654321', now));
    assert(!validSession(token, 'sterling', '123456', now + SESSION_SECONDS * 1000));
    assert(!validSession('invalid', 'sterling', '123456', now));
});

test('Forged cookies and missing server configuration fail closed', async t => {
    configure(t);
    const forged = response(); await handler({ method: 'GET', query: { slug: 'sterling' }, headers: { cookie: `${cookieName('sterling')}=forged` } }, forged);
    assert.equal(forged.statusCode, 401);
    delete process.env.SANITY_CASE_READ_TOKEN;
    const missing = response(); await handler(request('123456', 'missing-config'), missing);
    assert.equal(missing.statusCode, 503); assert(!JSON.stringify(missing.data).includes('Private'));
});

test('Invalid and cross-origin submissions are rejected before any private lookup', async t => {
    const spy = configure(t);
    for (const code of ['', 123456, '12345', '1234567', 'abcdef']) {
        const res = response(); await handler(request(code), res); assert.equal(res.statusCode, 400);
    }
    const cross = response(); await handler({ ...request(), headers: { origin: 'https://example.com' } }, cross); assert.equal(cross.statusCode, 403);
    const slug = response(); await handler({ method: 'GET', query: { slug: 'drafts.sterling' } }, slug); assert.equal(slug.statusCode, 400);
    assert.equal(spy.mock.callCount(), 0);
});

test('Repeated guesses stop before another private lookup', async t => {
    const spy = configure(t);
    for (let i = 0; i < 5; i++) { const res = response(); await handler(request('999999', 'guess-limit'), res); assert.equal(res.statusCode, 401); }
    const blocked = response(); await handler(request('123456', 'guess-limit'), blocked);
    assert.equal(blocked.statusCode, 429); assert.equal(blocked.headers['Retry-After'], '900');
    assert.equal(spy.mock.callCount(), 5);
});

test('Public previews stop at the configured block and never expose the private tail or code', async t => {
    configure(t, { ...item, previewEndKey: 'public-image', lede: ['Public introduction'], blocks: [
        { _key: 'public-text', type: 'section', body: 'Allowed introduction' },
        { _key: 'public-image', type: 'image', src: 'public.png' },
        { _key: 'private-section', type: 'section', body: 'Do not expose this section' },
    ] });
    const res = response();
    await handler({ method: 'GET', query: { slug: 'sterling', preview: '1' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.case.preview, true);
    assert.equal(res.data.case.locked, true);
    assert.equal(res.data.case.blocks.length, 2);
    for (const value of ['Do not expose this section', '123456', 'previewEndKey']) assert(!JSON.stringify(res.data).includes(value));
});

test('Missing preview markers keep content locked', async t => {
    configure(t, { ...item, previewEndKey: 'missing-block' });
    const res = response();
    await handler({ method: 'GET', query: { slug: 'sterling', preview: '1' } }, res);
    assert.equal(res.statusCode, 401);
    assert(!JSON.stringify(res.data).includes('Private story'));
});
