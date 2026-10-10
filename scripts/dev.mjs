import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import posts from '../api/posts.js';

const root = resolve('.');
const config = JSON.parse(await readFile('vercel.json', 'utf8'));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.m4a': 'audio/mp4', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };
http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/posts') {
        req.query = Object.fromEntries(url.searchParams);
        res.status = code => { res.statusCode = code; return res; };
        res.json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); return res; };
        return posts(req, res);
    }
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }
    if (path === '/') path = '/index.html';
    for (const rule of config.rewrites) {
        if (new RegExp('^' + rule.source.replace(/:[\w]+/g, '[^/]+') + '/?$').test(path)) { path = rule.destination; break; }
    }
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep) || path.split('/').some(segment => segment.startsWith('.')) || path.startsWith('/node_modules/')) {
        res.writeHead(403); return res.end();
    }
    try {
        let resolved = file;
        if (!(await stat(file).catch(() => null))?.isFile() && config.cleanUrls) resolved += '.html';
        res.setHeader('Content-Type', types[extname(resolved)] || 'application/octet-stream');
        res.end(await readFile(resolved));
    } catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.PORT || 4322), '127.0.0.1', () => console.log(`Site: http://localhost:${process.env.PORT || 4322}`));
