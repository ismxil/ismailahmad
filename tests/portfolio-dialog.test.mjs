import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { openAccessDialog } from '../js/v2/case-access.js';

async function setup(t) {
    const dom = new JSDOM('<link rel="stylesheet" href="/css/v2/access.css"><a href="https://pdf.ismailahmad.com/">Case studies</a>', { url: 'https://cv.ismailahmad.com/' });
    const navigations = [];
    const globals = { document: dom.window.document, innerWidth: 1200,
        matchMedia: () => ({ matches: true }), location: { assign: url => navigations.push(url) } };
    for (const [key, value] of Object.entries(globals)) {
        const before = Object.getOwnPropertyDescriptor(globalThis, key);
        Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
        t.after(() => before ? Object.defineProperty(globalThis, key, before) : delete globalThis[key]);
    }
    dom.window.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
    dom.window.HTMLDialogElement.prototype.close = function () {
        this.open = false;
        this.dispatchEvent(new dom.window.Event('close'));
    };
    t.after(() => dom.window.close());
    return { document: dom.window.document, window: dom.window, navigations };
}

test('Case studies asks for the code before navigating, validates input, then opens the PDF', async t => {
    const { document, window, navigations } = await setup(t);
    const { initPortfolioLinks } = await import('../js/v2/portfolio-links.js');
    initPortfolioLinks();
    t.mock.method(globalThis, 'fetch', async (url, options) => {
        assert.equal(url, '/api/case-access');
        assert.deepEqual(JSON.parse(options.body), { slug: 'portfolio', code: '123456' });
        return { ok: true, json: async () => ({ unlocked: true }) };
    });
    document.querySelector('a').click();
    const dialog = document.querySelector('dialog[open]');
    assert.ok(dialog);
    assert.equal(document.body.style.overflow, 'hidden');
    assert.deepEqual(navigations, []);
    const form = dialog.querySelector('form');
    form.dispatchEvent(new window.Event('submit', { cancelable: true }));
    assert.equal(dialog.querySelector('[role="alert"]').textContent, 'Please enter all six digits.');
    assert.deepEqual(navigations, []);
    const input = form.querySelector('input');
    input.value = '123456';
    input.dispatchEvent(new window.Event('input'));
    form.dispatchEvent(new window.Event('submit', { cancelable: true }));
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(navigations, ['https://pdf.ismailahmad.com/']);
    assert.equal(document.querySelector('dialog'), null);
    assert.equal(document.body.style.overflow, '');
});

test('shared access dialogs dismiss with the close button, Escape and outside click', async t => {
    const { document, window } = await setup(t);
    let dismissed = 0;
    const link = document.querySelector('a');
    for (const method of ['button', 'escape', 'outside']) {
        link.focus();
        openAccessDialog({ slug: 'portfolio' }, () => assert.fail('Unexpected unlock'), { onDismiss: () => dismissed++ });
        const dialog = document.querySelector('dialog');
        if (method === 'button') dialog.querySelector('button').click();
        if (method === 'escape') dialog.dispatchEvent(new window.Event('cancel', { cancelable: true }));
        if (method === 'outside') dialog.click();
        assert.equal(document.querySelector('dialog'), null);
        assert.equal(document.body.style.overflow, '');
        assert.equal(document.activeElement, link);
    }
    assert.equal(dismissed, 3);
});

test('direct PDF entry has no intermediate portfolio landing screen', async () => {
    const html = await readFile(new URL('../pdf.html', import.meta.url), 'utf8');
    assert.doesNotMatch(html, /portfolio-gate|portfolio-open/);
    assert.match(html, /pdf-access\.js/);
});
