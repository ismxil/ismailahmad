import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/notes.js';

const payload = { message: 'A thoughtful note.', name: 'Reader', avatar: 'mint', requestId: '57fe32e1-9699-4ab7-a62e-eb34cc9e52d4', website: '' };
const response = () => ({ headers: {}, statusCode: 200, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.statusCode=code; return this; }, json(data) { this.data=data; return this; } });
const request = (body = payload, ip = 'notes-test') => ({ method: 'POST', headers: { origin: 'https://www.ismailahmad.com', 'x-vercel-forwarded-for': ip }, body });
function configure(t, fetch) {
    const original = { key: process.env.RESEND_API_KEY, domain: process.env.RESEND_EMAIL_DOMAIN };
    process.env.RESEND_API_KEY = 'test-key';
    process.env.RESEND_EMAIL_DOMAIN = 'notes.ismailahmad.com';
    t.after(() => {
        if (original.key == null) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = original.key;
        if (original.domain == null) delete process.env.RESEND_EMAIL_DOMAIN; else process.env.RESEND_EMAIL_DOMAIN = original.domain;
    });
    return t.mock.method(globalThis, 'fetch', fetch);
}

test('Notes go only to the owner with escaped content and an idempotency key', async t => {
    let sent;
    configure(t, async (url, init) => {
        sent = { url, ...init };
        return Response.json({ id: 'accepted-email' });
    });
    const res = response();
    await handler(request({ ...payload, message: '<img src=x onerror=alert(1)>', name: '<Reader>', to: 'attacker@example.com' }, 'notes-success'), res);
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.data, { ok: true });
    const email = JSON.parse(sent.body);
    assert.equal(sent.url, 'https://api.resend.com/emails');
    assert.deepEqual(email.to, ['work@ismailahmad.com']);
    assert.equal(email.from, 'Portfolio notes <hello@notes.ismailahmad.com>');
    assert(!email.html.includes('<img'));
    assert(email.html.includes('&lt;Reader&gt;'));
    assert(email.text.includes('Avatar: Mint'));
    assert.equal(new Headers(sent.headers).get('Idempotency-Key'), `portfolio-note/${payload.requestId}`);
});

test('Invalid notes, cross-origin requests, bots and missing configuration never send', async t => {
    const spy = configure(t, async () => { throw new Error('Must not send'); });
    for (const body of [{ ...payload, message: ' ' }, { ...payload, message: 'x'.repeat(5001) }, { ...payload, name: 'Name\nBcc: forged' }, { ...payload, avatar: 'unknown' }, { ...payload, requestId: 'bad' }, { ...payload, website: 'bot' }, '{invalid']) {
        const res = response();await handler(request(body), res);assert.equal(res.statusCode,400);
    }
    const cross = response();await handler({ ...request(), headers: { origin: 'https://attacker.example' } }, cross);assert.equal(cross.statusCode,403);
    const get = response();await handler({ method: 'GET' }, get);assert.equal(get.statusCode,405);
    delete process.env.RESEND_API_KEY;
    const missing = response();await handler(request(), missing);assert.equal(missing.statusCode,503);
    assert.equal(spy.mock.callCount(),0);
});

test('Email failure stays retryable and does not expose provider secrets or claim success', async t => {
    configure(t, async () => Response.json({ name: 'validation_error', message: 'private provider detail' }, { status: 422 }));
    t.mock.method(console,'error',()=>{});
    const res = response();await handler(request(payload,'notes-failure'),res);
    assert.equal(res.statusCode,502);assert(!res.data.ok);assert(!JSON.stringify(res.data).includes('private'));
});

test('Repeated submissions from one IP stop before another email is sent', async t => {
    const spy=configure(t,async()=>Response.json({id:'accepted-email'}));
    for(let i=0;i<5;i++) { const res=response();await handler(request(payload,'notes-limit'),res);assert.equal(res.statusCode,200); }
    const res=response();await handler(request(payload,'notes-limit'),res);assert.equal(res.statusCode,429);
    assert.equal(spy.mock.callCount(),5);assert.equal(res.headers['Retry-After'],'900');
});
