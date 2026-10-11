import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename } from 'node:path';
const { getCliClient } = createRequire(import.meta.url)('sanity/cli');
const client = getCliClient({ apiVersion: '2024-01-01' }).withConfig({ useCdn: false });
const root = new URL('../../', import.meta.url);
const { items } = JSON.parse(await readFile(new URL('data/feed-items.json', root), 'utf8'));
const existing = await client.fetch('*[_type == "feedItem"]');
const backup = new URL('.context/archive-migration/', root);
await mkdir(backup, { recursive: true });
await writeFile(new URL(`before-${Date.now()}.json`, backup), JSON.stringify(existing, null, 2));
for (const [order, item] of items.entries()) {
    const id = `archive-${item.id}`;
    // Never overwrite an editor's existing document or draft on a rerun.
    if (existing.some(doc => doc._id === id || doc._id === `drafts.${id}` || doc.slug?.current === item.id)) {
        console.log(`Skipped existing: ${item.id}`);
        continue;
    }
    const path = item.cover.replace('assets/feeds/covers/', 'assets/feeds/');
    const file = fileURLToPath(new URL(path, root));
    const asset = await client.assets.upload('image', await readFile(file), { filename: basename(file) });
    await client.createIfNotExists({
        _id: id, _type: 'feedItem', name: item.client,
        slug: { _type: 'slug', current: item.id }, projectType: item.category, order,
        cover: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } },
    });
    console.log(`Imported ${order + 1}/${items.length}: ${item.client} (${item.id})`);
}
console.log('Archive import complete. Future additions/removals are managed in Studio; do not rerun this one-time migration after deleting items.');
