import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename } from 'node:path';
const { getCliClient } = createRequire(import.meta.url)('sanity/cli');
const client = getCliClient({ apiVersion: '2024-01-01' }).withConfig({ useCdn: false });
const root = new URL('../../', import.meta.url);

// One starter place so the wall has something on it from day one. Add,
// reorder and remove places in Studio afterwards; never rerun this after
// deleting Berlin there.
const id = 'wandering-berlin';
const photos = [
    ['assets/contact/studio.jpg', 'A desk by the window, laptop and monitor'],
    ['assets/about/gallery-2.jpg', 'Friends around a café table'],
    ['assets/about/gallery-3.jpg', 'Organisers at UXcamp Europe'],
    ['assets/about/gallery-4.jpg', 'An empty office with a whiteboard wall'],
    ['assets/about/gallery-1.jpg', 'Portrait in black and white'],
];

const existing = await client.fetch('*[_id in [$id, "drafts." + $id]][0]._id', { id });
if (existing) {
    console.log(`Skipped existing: ${existing}`);
} else {
    const images = [];
    for (const [i, [path, alt]] of photos.entries()) {
        const file = fileURLToPath(new URL(path, root));
        const asset = await client.assets.upload('image', await readFile(file), { filename: basename(file) });
        images.push({ _type: 'image', _key: `photo${i}`, alt, asset: { _type: 'reference', _ref: asset._id } });
        console.log(`Uploaded ${i + 1}/${photos.length}: ${basename(file)}`);
    }
    await client.createIfNotExists({ _id: id, _type: 'wanderingPlace', place: 'Berlin', order: 0, photos: images });
    console.log('Created Berlin.');
}
