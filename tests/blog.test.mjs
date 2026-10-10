import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { convertBody } from '../scripts/import-substack.mjs';
import { renderBody } from '../js/v2/post-body.js';
import handler from '../api/posts.js';

test('HTML migration preserves headings, lists, links, images and captions as editable blocks', () => {
    const blocks = convertBody('<h4>A heading</h4><p>Hello <strong>world</strong>. <a href="https://example.com">Read more</a></p><ul><li>One</li><li>Two</li></ul><figure><img src="https://example.com/image.jpg" alt="Portrait"><figcaption>A caption</figcaption></figure><hr>');
    assert.equal(blocks[0].style, 'h3');
    assert(blocks[1].children.some(span => span.text === 'world' && span.marks.includes('strong')));
    assert.equal(blocks[1].markDefs[0].href, 'https://example.com');
    assert.equal(blocks.filter(block => block.listItem === 'bullet').length, 2);
    const image = blocks.find(block => block._type === 'image');
    assert.equal(image.caption, 'A caption');
    assert.equal(image.alt, 'Portrait');
    assert.equal(blocks.at(-1)._type, 'divider');
    assert(blocks.every(block => block._key));
});

test('Rendering escapes article text and rejects executable link/image URLs', () => {
    const body = [{ _type: 'block', _key: 'b', style: 'normal', children: [{ _type: 'span', _key: 's', text: '<script>alert(1)</script>', marks: ['link'] }], markDefs: [{ _key: 'link', _type: 'link', href: 'javascript:alert(1)' }] }, { _type: 'image', asset: { url: 'javascript:alert(1)' } }];
    const html = renderBody(body);
    assert(!html.includes('<script>'));
    assert(!html.includes('javascript:'));
    assert(html.includes('&lt;script&gt;'));
});

function response() {
    return { headers: {}, statusCode: 200, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } };
}

test('Posts API queries only published content and parameterizes slugs', async t => {
    let queried;
    t.mock.method(globalThis, 'fetch', async url => { queried = url; return { ok: true, json: async () => ({ result: { title: 'A post' } }) }; });
    const res = response();
    await handler({ method: 'GET', query: { slug: 'a-post' } }, res);
    assert.equal(res.statusCode, 200);
    assert.equal(queried.searchParams.get('perspective'), 'published');
    assert(queried.searchParams.get('query').includes('drafts.**'));
    assert(queried.searchParams.get('query').includes('publishedAt <= now()'));
    assert.equal(queried.searchParams.get('$slug'), '"a-post"');
    assert.match(res.headers['Cache-Control'], /s-maxage=60/);
});

test('Posts API returns useful statuses for invalid, missing and unavailable articles', async t => {
    const bad = response();
    await handler({ method: 'GET', query: { slug: '" || true' } }, bad);
    assert.equal(bad.statusCode, 400);
    const noPost = response();
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ result: null }) }));
    await handler({ method: 'GET', query: { slug: 'missing' } }, noPost);
    assert.equal(noPost.statusCode, 404);
    fetchMock.mock.mockImplementation(async () => { throw new Error('private upstream details'); });
    const unavailable = response();
    await handler({ method: 'GET', query: {} }, unavailable);
    assert.equal(unavailable.statusCode, 502);
    assert(!JSON.stringify(unavailable.data).includes('private'));
});

test('Prepared migration retains every article’s prose and all images', { skip: !existsSync('.context/blog-migration/posts.ndjson') }, async () => {
    const xml = new JSDOM(await readFile('.context/blog-migration/substack.xml', 'utf8'), { contentType: 'text/xml' });
    const posts = (await readFile('.context/blog-migration/posts.ndjson', 'utf8')).trim().split('\n').map(JSON.parse);
    const items = [...xml.window.document.querySelectorAll('item')];
    assert.equal(posts.length, items.length);
    const compact = value => value.replace(/\s/g, '');
    items.forEach((item, index) => {
        const doc = new JSDOM(item.getElementsByTagNameNS('http://purl.org/rss/1.0/modules/content/', 'encoded')[0].textContent).window.document;
        doc.querySelectorAll('script,style,form,.subscription-widget-wrap,.subscribe-widget,.button-wrapper').forEach(el => el.remove());
        assert.equal(posts[index].body.filter(block => block._type === 'image').length, doc.querySelectorAll('img').length, posts[index].title);
        const actual = posts[index].body.map(block => block._type === 'block' ? block.children.map(child => child.text || '').join('') : block.caption || '').join('');
        assert.equal(compact(actual), compact(doc.body.textContent), posts[index].title);
    });
});
