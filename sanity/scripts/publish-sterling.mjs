// Restore Sterling's existing story to its public record, retaining the
// protected copy as a backup. Etihad and its access code are never modified.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const { getCliClient } = createRequire(import.meta.url)('sanity/cli');
const client = getCliClient({ apiVersion: '2024-01-01' }).withConfig({ useCdn: false, perspective: 'raw' });
const ids = ['case-study-sterling', 'drafts.case-study-sterling', 'protected.sterling'];
const docs = await client.fetch('*[_id in $ids]', { ids });
const source = docs.find(doc => doc._id === 'protected.sterling');
const published = docs.find(doc => doc._id === 'case-study-sterling');
if (!source?.hero?.asset || !source.blocks?.length || !published) throw new Error('Sterling recovery source is incomplete.');
const backup = new URL('../../.context/case-repair/', import.meta.url);
await mkdir(backup, { recursive: true });
await writeFile(new URL(`before-publish-${Date.now()}.json`, backup), JSON.stringify(docs, null, 2), { mode: 0o600 });
let transaction = client.transaction();
for (const doc of docs.filter(doc => doc._id !== source._id)) {
    if (!doc.requiresAccessCode && doc.hero?.asset && doc.blocks?.length) continue;
    const fields = ['lede', 'hero', 'heroVideo', 'blocks', 'url', 'role', 'scope', 'industry'];
    const content = Object.fromEntries(fields.filter(key => source[key] != null).map(key => [key, source[key]]));
    // Preserve any newer draft edits instead of overwriting them.
    if (doc._id.startsWith('drafts.')) for (const key of fields) {
        if (doc[key] != null) content[key] = doc[key];
    }
    transaction = transaction.patch(doc._id, patch => patch.ifRevisionId(doc._rev)
        .set({ ...content, requiresAccessCode: false, hasPublicPreview: false })
        .unset(['accessCode', 'previewEndKey']));
}
if (!process.argv.includes('--apply')) {
    console.log('Sterling recovery prepared. Use --apply to publish the existing story.');
} else {
    await transaction.commit();
    const restored = await client.getDocument(published._id);
    if (restored.requiresAccessCode || !restored.hero?.asset || !restored.blocks?.length || restored.accessCode) throw new Error('Sterling recovery verification failed.');
    console.log(`Sterling is public with its hero and ${restored.blocks.length} existing sections. Etihad is unchanged.`);
}
