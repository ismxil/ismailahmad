import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import middleware from '../middleware.js';

const rewriteFor = host =>
    middleware(new Request('https://example.com/', { headers: { host } }))?.headers.get('x-middleware-rewrite');

test('cv.ismailahmad.com serves the CV page at its root', () => {
    assert.equal(new URL(rewriteFor('cv.ismailahmad.com')).pathname, '/cv');
    assert.equal(new URL(rewriteFor('tiny-lagos.ismailahmad.com')).pathname, '/lagos');
    assert.equal(rewriteFor('www.ismailahmad.com'), undefined);
});

test('the CV page offers the PDF for download', async () => {
    const html = await readFile(new URL('../cv.html', import.meta.url), 'utf8');
    const { document } = new JSDOM(html).window;
    const downloads = [...document.querySelectorAll('a[download]')];
    assert.ok(downloads.length >= 1);
    for (const link of downloads) assert.equal(link.getAttribute('href'), '/assets/cv.pdf');
    assert.equal(document.querySelectorAll('.cv-role').length, 6);
});
