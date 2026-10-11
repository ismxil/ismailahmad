import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';
import { cases } from '../../data/cases.js';
const { getCliClient } = createRequire(import.meta.url)('sanity/cli');
const client = getCliClient({ apiVersion: '2024-01-01' }).withConfig({ useCdn: false });
const root = new URL('../../', import.meta.url);
const backup = new URL('.context/case-migration/', root);
await mkdir(backup, { recursive: true });
const existing = await client.fetch('*[_type == "caseStudy"]');
await writeFile(new URL(`before-${Date.now()}.json`, backup), JSON.stringify(existing,null,2));
const paths = new Set();
function collect(value) {
    if (typeof value === 'string' && value.startsWith('assets/')) paths.add(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') Object.values(value).forEach(collect);
}
collect(cases);
const assets = await client.fetch('*[_type == "sanity.imageAsset"]{_id,sha1hash,url}');
const byHash = new Map(assets.map(asset => [asset.sha1hash,asset]));
const uploaded = {};
const queue = [...paths];
let completed = 0;
async function worker() {
    while(queue.length) {
        const path = queue.shift();
        const bytes = await readFile(new URL(path, root));
        const hash = createHash('sha1').update(bytes).digest('hex');
        const asset = byHash.get(hash) || await client.assets.upload('image', bytes, { filename: basename(path) });
        uploaded[path] = asset;
        console.log(`Image ${++completed}/${paths.size}: ${path}`);
    }
}
await Promise.all([worker(),worker(),worker()]);
await writeFile(new URL('assets.json', backup), JSON.stringify(uploaded,null,2));
const image = src => ({ _type: 'image', asset: { _type: 'reference', _ref: uploaded[src]._id } });
const keyed = (value, index, type) => ({ ...value, _key: `item-${index}`, _type: type });
for (const [order,c] of cases.entries()) {
    const id=`case-study-${c.slug}`;
    if(existing.some(doc=>doc._id===id || doc._id===`drafts.${id}` || doc.slug?.current===c.slug)) {
        console.log(`Skipped existing case: ${c.slug}`); continue;
    }
    const doc={...c,_id:id,_type:'caseStudy',order,slug:{_type:'slug',current:c.slug},cover:image(c.cover),hero:image(c.hero)};
    doc.blocks=c.blocks.map((original,index)=>{
        const b=keyed(original,index,'caseContentBlock');
        if(b.src){b.image=image(b.src);delete b.src;}
        if(b.images)b.images=b.images.map((im,i)=>({...image(im.src),alt:im.alt,_key:`image-${i}`}));
        if(b.items)b.items=b.items.map((q,i)=>({...keyed(q,i,'caseQuote'),...(q.avatar?{avatar:image(q.avatar)}:{})}));
        if(b.metrics)b.metrics=b.metrics.map((m,i)=>({...keyed(m,i,'caseMetric'),...(m.icon?{icon:image(m.icon)}:{})}));
        if(b.actions)b.actions=b.actions.map((a,i)=>keyed(a,i,'caseAction'));
        return b;
    });
    await client.createIfNotExists(doc);
    console.log(`Imported case: ${c.slug} (${c.blocks.length} sections)`);
}
console.log('Case study migration complete. Local source and migration backups are retained.');
