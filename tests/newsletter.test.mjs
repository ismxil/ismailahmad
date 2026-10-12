import test from 'node:test';
import assert from 'node:assert/strict';
import subscribe from '../api/subscribe.js';
import { renderEmail, broadcastFor, articleURL } from '../scripts/newsletter.mjs';

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
