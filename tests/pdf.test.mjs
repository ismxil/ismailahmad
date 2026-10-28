import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import middleware from '../middleware.js';
import { deck } from '../js/v2/pdf-deck.js';

const rewriteFor = host =>
    middleware(new Request('https://example.com/', { headers: { host } }))?.headers.get('x-middleware-rewrite');

test('pdf.ismailahmad.com serves the portfolio deck at its root', () => {
    assert.equal(new URL(rewriteFor('pdf.ismailahmad.com')).pathname, '/pdf');
});

test('every page of the deck has a slide, a thumbnail and a title', async () => {
    const slides = (await readdir(new URL('../assets/pdf/slides', import.meta.url))).filter(f => f.endsWith('.webp'));
    const thumbs = (await readdir(new URL('../assets/pdf/thumbs', import.meta.url))).filter(f => f.endsWith('.webp'));
    assert.equal(slides.length, deck.slides.length);
    assert.equal(thumbs.length, deck.slides.length);
    for (const slide of deck.slides) assert.ok(slide.title);
});

test('the deck page offers the PDF and keeps notes out of the page', async () => {
    const html = await readFile(new URL('../pdf.html', import.meta.url), 'utf8');
    const { document } = new JSDOM(html).window;
    const download = document.querySelector('a[download]');
    assert.equal(download.getAttribute('href'), deck.pdf);
    assert.ok(document.getElementById('speaker').hidden);
});
