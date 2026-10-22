/*
 * Renders the pilot area as a grid of shots that line up to the pixel.
 *   node scripts/lagos-pilot/render.mjs <area.geojson> <out-dir> [span=4] [size=1024] [mpp=0.6]
 * span × span shots of size px, each pixel covering mpp metres. Needs playwright-core and three
 * (THREE_DIR points at a node_modules/three), and CHROME set to a Chrome binary.
 */
import { chromium } from 'playwright-core';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const [data, out, span = '4', size = '1024', mpp = '0.6'] = process.argv.slice(2);
const three = process.env.THREE_DIR;
await mkdir(out, { recursive: true });
const files = {
    '/render.html': [resolve('scripts/lagos-pilot/render.html'), 'text/html'],
    '/data.geojson': [resolve(data), 'application/json'],
    '/three.module.js': [`${three}/build/three.module.js`, 'text/javascript'],
    '/three.core.js': [`${three}/build/three.core.js`, 'text/javascript'],
};
const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage();
page.on('pageerror', e => console.error('page error:', e.message));
await page.route('http://pilot.local/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const entry = files[path] || (path.startsWith('/addons/') && [`${three}/examples/jsm/${path.slice(8)}`, 'text/javascript']);
    if (!entry) return route.fulfill({ status: 404 });
    route.fulfill({ body: await readFile(entry[0]), contentType: entry[1] });
});
await page.goto('http://pilot.local/render.html');
await page.waitForFunction(() => window.ready, null, { timeout: 300000 });
console.log(await page.evaluate(() => window.ready));
for (let row = 0; row < +span; row++) for (let col = 0; col < +span; col++) {
    const url = await page.evaluate(([c, r, s, m, n]) => window.shoot(c, r, s, m, n), [col, row, +size, +mpp, +span]);
    await writeFile(`${out}/${col}_${row}.png`, Buffer.from(url.split(',')[1], 'base64'));
}
await browser.close();
console.log(`Saved ${+span * +span} shots to ${out}`);
