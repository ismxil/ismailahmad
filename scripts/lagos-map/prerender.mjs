/*
 * Pre-renders the zoomed-out Tiny Lagos picture pyramid (assets/lagos/map/r/) by running
 * scripts/lagos-map/prerender.html in headless Chrome and saving the images it posts back.
 *
 *   CHROME=/path/to/chrome node scripts/lagos-map/prerender.mjs
 */
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';

const chrome = process.env.CHROME;
if (!chrome) throw new Error('Set CHROME to a Chrome or Chromium binary.');
const root = resolve('.'), out = resolve('assets/lagos/map/r');
await rm(out, { recursive: true, force: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.bin': 'application/octet-stream' };
let saved = 0, browser;

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST') {
        const chunks = []; for await (const c of req) chunks.push(c);
        if (url.pathname === '/done') {
            res.end(); console.log(`Saved ${saved} images.`);
            browser.kill(); server.close(); return;
        }
        const file = resolve(out, url.searchParams.get('name'));
        if (!file.startsWith(out + sep)) { res.writeHead(400); return res.end(); }
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, Buffer.concat(chunks));
        if (++saved % 25 === 0) console.log(saved, 'images');
        return res.end();
    }
    const file = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + sep)) { res.writeHead(400); return res.end(); }
    const body = await readFile(file).catch(() => null);
    if (!body) { console.warn('Missing', url.pathname); res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
}).listen(0, '127.0.0.1', () => {
    const { port } = server.address();
    browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${resolve('/tmp', 'tiny-lagos-prerender')}`,
        '--js-flags=--max-old-space-size=8192', `http://127.0.0.1:${port}/scripts/lagos-map/prerender.html`], { stdio: 'ignore' });
});
