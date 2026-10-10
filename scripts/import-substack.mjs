import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { Schema } from '@sanity/schema';
import { htmlToBlocks } from '@portabletext/block-tools';
import postSchema from '../sanity/schemas/post.js';

// The import schema uses a plain image object until assets are uploaded.
// This avoids depending on Studio's internal crop/hotspot schema types.
const bodyField = postSchema.fields.find(field => field.name === 'body');
const schema = Schema.compile({ name: 'import', types: [{ name: 'importPost', type: 'object', fields: [
    { ...bodyField, of: bodyField.of.map(member => member.type === 'image'
        ? { name: 'importedImage', type: 'object', fields: member.fields } : member) },
] }] });
const bodyType = schema.get('importPost').fields[0].type;
const FEED = 'https://wandarer.com/feed';
const output = new URL('../.context/blog-migration/', import.meta.url);
const text = element => element?.textContent?.trim() || '';

export function convertBody(html) {
    const dom = new JSDOM(html);
    const document = dom.window.document;
    // Strip Substack's subscription controls, never the article's prose.
    document.querySelectorAll('script,style,form,.subscription-widget-wrap,.subscribe-widget,.button-wrapper').forEach(el => el.remove());
    document.querySelectorAll('h1,h4,h5,h6').forEach(el => {
        const heading = document.createElement(el.tagName === 'H1' ? 'h2' : 'h3');
        heading.innerHTML = el.innerHTML;
        el.replaceWith(heading);
    });
    const blocks = htmlToBlocks(document.body.innerHTML, bodyType, {
        parseHtml: html => new JSDOM(html).window.document,
        rules: [{ deserialize(el, next, block) {
            if (el.nodeType !== 1) return undefined;
            if (el.tagName === 'HR') return block({ _type: 'divider', label: 'Divider' });
            const image = el.tagName === 'FIGURE' ? el.querySelector('img') : el.tagName === 'IMG' ? el : null;
            if (!image) return undefined;
            const src = image.getAttribute('src');
            if (!src?.startsWith('https://')) throw new Error('Image has no HTTPS source');
            return block({ _type: 'importedImage', sourceUrl: src, alt: image.getAttribute('alt') || '',
                caption: el.tagName === 'FIGURE' ? text(el.querySelector('figcaption')) : '' });
        } }],
    });
    dom.window.close();
    return blocks.filter(block => block._type !== 'block' || block.children.some(child => child.text?.trim()))
        .map(block => block._type === 'importedImage' ? { ...block, _type: 'image' } : block);
}

export async function prepare() {
    await mkdir(output, { recursive: true });
    const response = await fetch(FEED, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Feed returned ${response.status}`);
    const xml = await response.text();
    await writeFile(new URL('substack.xml', output), xml);
    const dom = new JSDOM(xml, { contentType: 'text/xml' });
    const posts = [...dom.window.document.querySelectorAll('item')].map(item => {
        const sourceUrl = text(item.querySelector('link'));
        const slug = new URL(sourceUrl).pathname.split('/').filter(Boolean).pop();
        const html = text(item.getElementsByTagNameNS('http://purl.org/rss/1.0/modules/content/', 'encoded')[0]);
        if (!html || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error(`Cannot import ${sourceUrl}`);
        const body = convertBody(html);
        const description = new JSDOM(text(item.querySelector('description'))).window.document.body.textContent.trim();
        return {
            _id: `substack-${createHash('sha256').update(sourceUrl).digest('hex').slice(0, 24)}`,
            _type: 'post', title: text(item.querySelector('title')), slug: { _type: 'slug', current: slug },
            excerpt: description.slice(0, 300), author: 'Ismail Ahmad',
            publishedAt: new Date(text(item.querySelector('pubDate'))).toISOString(), sourceUrl, body,
        };
    });
    dom.window.close();
    if (!posts.length) throw new Error('Feed contained no posts');
    await writeFile(new URL('posts.ndjson', output), posts.map(post => JSON.stringify(post)).join('\n') + '\n');
    await writeFile(new URL('report.json', output), JSON.stringify(posts.map(post => ({
        title: post.title, slug: post.slug.current, blocks: post.body.length,
        images: post.body.filter(block => block._type === 'image').length, sourceUrl: post.sourceUrl,
    })), null, 2));
    console.log(`Prepared ${posts.length} posts. Review .context/blog-migration/report.json before importing.`);
    return posts;
}

export async function migrate(client) {
    if (client.config().projectId !== 'x7x0om5p' || client.config().dataset !== 'production') {
        throw new Error('Import must target the existing x7x0om5p / production project.');
    }
    // Read the reviewed snapshot, rather than silently fetching a different feed.
    const posts = (await readFile(new URL('posts.ndjson', output), 'utf8')).trim().split('\n').map(JSON.parse);
    const assets = new Map();
    const report = [];
    for (const post of posts) {
        const existing = await client.fetch('*[_id in $ids][0]._id', { ids: [post._id, `drafts.${post._id}`] });
        if (existing) { report.push({ title: post.title, status: 'skipped-existing' }); continue; }
        for (const block of post.body.filter(block => block._type === 'image')) {
            if (!assets.has(block.sourceUrl)) {
                const response = await fetch(block.sourceUrl, { signal: AbortSignal.timeout(30000) });
                if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw new Error(`Image unavailable for ${post.title}`);
                const asset = await client.assets.upload('image', Buffer.from(await response.arrayBuffer()), {
                    filename: `${post.slug.current}-${block._key}`, source: { id: block.sourceUrl, name: 'Substack import', url: post.sourceUrl },
                });
                assets.set(block.sourceUrl, asset._id);
            }
            block.asset = { _type: 'reference', _ref: assets.get(block.sourceUrl) };
        }
        const firstImage = post.body.find(block => block._type === 'image');
        if (firstImage) post.coverImage = { _type: 'image', asset: firstImage.asset, alt: firstImage.alt };
        await client.createIfNotExists(post);
        report.push({ title: post.title, status: 'imported', id: post._id });
        await writeFile(new URL('import-report.json', output), JSON.stringify(report, null, 2));
        console.log(`Imported: ${post.title}`);
    }
    await writeFile(new URL('import-report.json', output), JSON.stringify(report, null, 2));
    console.log(`Finished: ${report.filter(row => row.status === 'imported').length} imported; ${report.filter(row => row.status !== 'imported').length} already present.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await prepare();
