/**
 * One-time migration for the new article heading scale (25 / 21 / 18px).
 *
 * Existing top-level headings were written as Heading 2 and should keep their
 * size, so they become Heading 1. Existing Heading 3s keep their name and pick
 * up the new, smaller size — the point of the change.
 *
 * Run once, after deploying the site: `npm run blog:shift-headings`. It skips
 * any article that already has a Heading 1, a level that did not exist before.
 */
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const { getCliClient } = createRequire(import.meta.url)('sanity/cli');

const client = getCliClient({ apiVersion: '2024-01-01' }).withConfig({ useCdn: false });
const SHIFT = { h2: 'h1' };

const docs = await client.fetch('*[_type == "post"]');
const backup = new URL('../../.context/blog-migration/', import.meta.url);
await mkdir(backup, { recursive: true });
await writeFile(new URL(`headings-before-${Date.now()}.json`, backup), JSON.stringify(docs, null, 2));

let changed = 0;
for (const doc of docs) {
    if ((doc.body || []).some(block => block.style === 'h1')) {
        console.log(`Skipped (already shifted): ${doc.title}`);
        continue;
    }
    const body = (doc.body || []).map(block =>
        block._type === 'block' && SHIFT[block.style] ? { ...block, style: SHIFT[block.style] } : block);
    const moved = body.filter((block, index) => block.style !== doc.body?.[index]?.style).length;
    if (!moved) {
        console.log(`Skipped (no headings): ${doc.title}`);
        continue;
    }
    await client.patch(doc._id).set({ body }).commit({ autoGenerateArrayKeys: false });
    changed += 1;
    console.log(`${doc.title}: ${moved} heading${moved === 1 ? '' : 's'} shifted`);
}
console.log(`Done. ${changed} article${changed === 1 ? '' : 's'} updated, ${docs.length - changed} skipped.`);
