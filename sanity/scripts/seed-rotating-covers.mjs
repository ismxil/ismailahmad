import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
const { getCliClient } = createRequire(import.meta.url)('sanity/cli');
const client = getCliClient({ apiVersion: '2024-01-01' }).withConfig({ useCdn: false, perspective: 'raw' });
const docs = await client.fetch('*[_type == "caseStudy" && !(_id in path("versions.**"))]');
const backup = new URL('../../.context/case-migration/', import.meta.url);
await mkdir(backup, {recursive: true});
await writeFile(new URL(`before-rotating-covers-${Date.now()}.json`,backup),JSON.stringify(docs,null,2));
for (const doc of docs) {
    if (Object.hasOwn(doc, 'rotatingCovers')) { console.log(`Already configured: ${doc._id}`); continue; }
    const images = [doc.hero, ...(doc.blocks || []).flatMap(b => b.type === 'image' ? [b.image] : b.type === 'pair' ? b.images || [] : [])];
    const unique = [...new Map(images.filter(i=>i?.asset?._ref).map(i=>[i.asset._ref,i])).values()].slice(0,3);
    const rotatingCovers = unique.map((im,i)=>({_type:'image',_key:`cover-${i}`,asset:im.asset}));
    await client.patch(doc._id).ifRevisionId(doc._rev).setIfMissing({rotatingCovers}).commit();
    console.log(`Configured ${doc._id}: ${rotatingCovers.length} existing images`);
}
