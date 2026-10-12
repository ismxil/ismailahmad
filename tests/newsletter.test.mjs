import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import subscribe from '../api/subscribe.js';
import publish from '../api/sanity-publish.js';
import { renderEmail, broadcastFor, articleURL, draftBroadcast } from '../lib/newsletter.mjs';

function response() {
    return {
        headers: {}, statusCode: 200,
        setHeader(key, value) { this.headers[key] = value; },
        status(code) { this.statusCode = code; return this; },
        json(data) { this.data = data; return this; },
        end() { return this; },
    };
}

const withKit = (t, handler) => {
    process.env.KIT_API_KEY = 'test-key';
    process.env.KIT_FORM_ID = '12345';
    t.after(() => { delete process.env.KIT_API_KEY; delete process.env.KIT_FORM_ID; });
    return t.mock.method(globalThis, 'fetch', handler);
};

test('Subscribing sends the address to Kit with the key kept server-side', async t => {
    let request;
    withKit(t, async (url, init) => {
        request = { url: String(url), init };
        return { ok: true, status: 200, json: async () => ({ subscriber: { state: 'inactive' } }) };
    });
    const res = response();
    await subscribe({ method: 'POST', body: { email: ' Reader@Example.com ', source: 'article:fawning', referrer: 'https://www.ismailahmad.com/blog/fawning' } }, res);

    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.data, { ok: true, state: 'pending', source: 'article:fawning' });
    assert.equal(request.url, 'https://api.kit.com/v4/forms/12345/subscribers');
    assert.equal(request.init.headers['X-Kit-Api-Key'], 'test-key');
    const sent = JSON.parse(request.init.body);
    assert.equal(sent.email_address, 'reader@example.com');
    assert.equal(sent.referrer, 'https://www.ismailahmad.com/blog/fawning');
});

test('An already-confirmed subscriber is reported as active, not pending', async t => {
    withKit(t, async () => ({ ok: true, status: 200, json: async () => ({ subscriber: { state: 'active' } }) }));
    const res = response();
    await subscribe({ method: 'POST', body: { email: 'reader@example.com' } }, res);
    assert.equal(res.data.state, 'active');
});

test('Bad input, bots and a missing key never reach Kit', async t => {
    const fetchMock = withKit(t, async () => { throw new Error('Kit must not be called'); });

    const bad = response();
    await subscribe({ method: 'POST', body: { email: 'not-an-email' } }, bad);
    assert.equal(bad.statusCode, 400);

    // The honeypot answers like a success so a bot learns nothing.
    const trapped = response();
    await subscribe({ method: 'POST', body: { email: 'bot@example.com', website: 'http://spam' } }, trapped);
    assert.equal(trapped.statusCode, 200);
    assert.equal(trapped.data.state, 'ignored');

    const wrongMethod = response();
    await subscribe({ method: 'GET' }, wrongMethod);
    assert.equal(wrongMethod.statusCode, 405);
    assert.equal(fetchMock.mock.callCount(), 0);

    delete process.env.KIT_API_KEY;
    const unconfigured = response();
    await subscribe({ method: 'POST', body: { email: 'reader@example.com' } }, unconfigured);
    assert.equal(unconfigured.statusCode, 503);
    assert.equal(fetchMock.mock.callCount(), 0);
});

test('Kit failures surface a usable message and never its response body', async t => {
    const fetchMock = withKit(t, async () => ({ ok: false, status: 401, text: async () => 'invalid api key for account 42' }));
    const unauthorised = response();
    await subscribe({ method: 'POST', body: { email: 'reader@example.com' } }, unauthorised);
    assert.equal(unauthorised.statusCode, 502);
    assert(!JSON.stringify(unauthorised.data).includes('api key'));

    fetchMock.mock.mockImplementation(async () => ({ ok: false, status: 422, text: async () => 'invalid' }));
    const rejected = response();
    await subscribe({ method: 'POST', body: { email: 'reader@example.com' } }, rejected);
    assert.equal(rejected.statusCode, 400);

    fetchMock.mock.mockImplementation(async () => { throw new Error('network down'); });
    const down = response();
    await subscribe({ method: 'POST', body: { email: 'reader@example.com' } }, down);
    assert.equal(down.statusCode, 502);
});

test('The email carries the article as inline-styled HTML, with tagged links home', () => {
    const body = [
        { _type: 'block', _key: 'a', style: 'h1', children: [{ _type: 'span', _key: '1', text: 'A heading' }] },
        { _type: 'block', _key: 'b', style: 'normal', children: [{ _type: 'span', _key: '2', text: 'Body with ', marks: [] }, { _type: 'span', _key: '3', text: 'weight', marks: ['strong'] }] },
        { _type: 'block', _key: 'c', style: 'normal', listItem: 'bullet', children: [{ _type: 'span', _key: '4', text: 'An item' }] },
        { _type: 'image', _key: 'd', alt: 'A picture', caption: 'A caption', asset: { url: 'https://cdn.sanity.io/images/x/y/z.jpg' } },
        { _type: 'divider', _key: 'e' },
    ];
    const html = renderEmail(body, 'fawning');

    // Email clients drop stylesheets, so nothing may rely on a class.
    assert(!html.includes('class='));
    assert(html.includes('<h2 style="margin:32px 0 12px;font-size:24px'));
    assert(html.includes('<strong style="font-weight:600;">weight</strong>'));
    assert(html.includes('<li style='));
    assert(html.includes('w=1200'));
    assert(html.includes('A caption'));
    assert(html.includes('<hr style='));
    assert(html.includes('utm_campaign=fawning'));
});

test('A broadcast is built as a draft unless a send time is given', () => {
    const post = { title: 'Fawning.', slug: 'fawning', excerpt: 'On charisma.', publishedAt: '2025-12-06T09:00:00Z', cover: 'https://cdn.sanity.io/images/x/y/cover.jpg', body: [] };

    const draft = broadcastFor(post);
    assert.equal(draft.send_at, null);
    assert.equal(draft.subject, 'Fawning.');
    assert.equal(draft.preview_text, 'On charisma.');
    assert.equal(draft.public, false);
    assert.equal(draft.thumbnail_url, post.cover);
    assert(draft.content.includes(articleURL('fawning', 'fawning')));

    const scheduled = broadcastFor(post, { sendAt: '2026-10-14T09:00:00Z' });
    assert.equal(scheduled.send_at, '2026-10-14T09:00:00Z');
});

test('A link in an article cannot smuggle a script into the email', () => {
    const html = renderEmail([{ _type: 'block', _key: 'a', style: 'normal',
        children: [{ _type: 'span', _key: '1', text: 'click', marks: ['link'] }],
        markDefs: [{ _key: 'link', _type: 'link', href: 'javascript:alert(1)' }] }], 'test');
    assert(!html.includes('javascript:'));
    assert(html.includes('click'));
});


/* ── The webhook Sanity calls on publish ─────────────────── */

const SECRET = 'a-test-secret';

async function signedRequest(payload, { secret = SECRET } = {}) {
    const raw = JSON.stringify(payload);
    const req = Readable.from([Buffer.from(raw, 'utf8')]);
    req.method = 'POST';
    req.headers = { [SIGNATURE_HEADER_NAME]: await encodeSignatureHeader(raw, Date.now(), secret) };
    return req;
}

/** Kit with no broadcasts, then whatever the handler creates. */
function kitDouble({ broadcasts = [] } = {}) {
    const created = [];
    const fetchImpl = async (url, init = {}) => {
        if (String(url).includes('/broadcasts?')) {
            return { ok: true, status: 200, json: async () => ({ broadcasts }) };
        }
        if (String(url).endsWith('/broadcasts')) {
            const body = JSON.parse(init.body);
            created.push(body);
            return { ok: true, status: 201, json: async () => ({ broadcast: { id: 7, status: 'draft', ...body } }) };
        }
        // The article read-back.
        return { ok: true, status: 200, json: async () => ({ result: { title: 'Fawning.', slug: 'fawning', excerpt: 'On charisma.', publishedAt: '2025-12-06T09:00:00Z', body: [] } }) };
    };
    return { fetchImpl, created };
}

const withEnv = t => {
    process.env.SANITY_WEBHOOK_SECRET = SECRET;
    process.env.KIT_API_KEY = 'test-key';
    t.after(() => { delete process.env.SANITY_WEBHOOK_SECRET; delete process.env.KIT_API_KEY; });
};

test('A signed publish drafts the article in Kit', async t => {
    withEnv(t);
    const kit = kitDouble();
    t.mock.method(globalThis, 'fetch', kit.fetchImpl);
    const res = response();
    await publish(await signedRequest({ slug: 'fawning' }), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.created, true);
    assert.equal(kit.created.length, 1);
    assert.equal(kit.created[0].subject, 'Fawning.');
    assert.equal(kit.created[0].send_at, null, 'a draft, never a send');
    assert(kit.created[0].description.endsWith('/blog/fawning'));
});

test('Republishing the same article does not draft it twice', async t => {
    withEnv(t);
    const kit = kitDouble({ broadcasts: [{ id: 3, status: 'draft', description: 'Fawning. · /blog/fawning' }] });
    t.mock.method(globalThis, 'fetch', kit.fetchImpl);
    const res = response();
    await publish(await signedRequest({ slug: 'fawning' }), res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.data.created, false);
    assert.equal(kit.created.length, 0);
});

test('An unsigned, wrongly signed or unparseable call never reaches Kit', async t => {
    withEnv(t);
    const kit = kitDouble();
    const fetchMock = t.mock.method(globalThis, 'fetch', kit.fetchImpl);

    const unsigned = Readable.from([Buffer.from('{"slug":"fawning"}')]);
    unsigned.method = 'POST';
    unsigned.headers = {};
    const noSignature = response();
    await publish(unsigned, noSignature);
    assert.equal(noSignature.statusCode, 401);

    const wrong = response();
    await publish(await signedRequest({ slug: 'fawning' }, { secret: 'someone-elses-secret' }), wrong);
    assert.equal(wrong.statusCode, 401);

    const noSlug = response();
    await publish(await signedRequest({ title: 'No slug here' }), noSlug);
    assert.equal(noSlug.statusCode, 400);

    const badSlug = response();
    await publish(await signedRequest({ slug: '../../etc/passwd' }), badSlug);
    assert.equal(badSlug.statusCode, 400);

    assert.equal(fetchMock.mock.callCount(), 0);
});

test('The webhook stays quiet when it is not configured', async t => {
    delete process.env.SANITY_WEBHOOK_SECRET;
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not be called'); });
    const res = response();
    await publish(await signedRequest({ slug: 'fawning' }), res);
    assert.equal(res.statusCode, 503);
    assert.equal(fetchMock.mock.callCount(), 0);
});

test('A nested slug object from a different projection still works', async t => {
    withEnv(t);
    const kit = kitDouble();
    t.mock.method(globalThis, 'fetch', kit.fetchImpl);
    const res = response();
    await publish(await signedRequest({ slug: { current: 'fawning' } }), res);
    assert.equal(res.data.created, true);
});

test('Kit falling over is reported without asking Sanity to retry forever', async t => {
    withEnv(t);
    t.mock.method(globalThis, 'fetch', async url => String(url).includes('/broadcasts')
        ? { ok: false, status: 500, text: async () => 'kit is down' }
        : { ok: true, json: async () => ({ result: { title: 'Fawning.', slug: 'fawning', body: [] } }) });
    const res = response();
    await publish(await signedRequest({ slug: 'fawning' }), res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.data.ok, false);
});

test('Drafting is skipped when Kit already holds the article, by path not title', async () => {
    const broadcasts = [{ id: 9, description: 'A title the editor rewrote · /blog/fawning' }];
    const fetchImpl = async url => String(url).includes('/broadcasts?')
        ? { ok: true, json: async () => ({ broadcasts }) }
        : (() => { throw new Error('must not create'); })();
    const result = await draftBroadcast({ title: 'Fawning.', slug: 'fawning', body: [] }, { key: 'k', fetchImpl });
    assert.equal(result.created, false);
    assert.equal(result.broadcast.id, 9);
});
