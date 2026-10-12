import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import posts from '../api/posts.js';
import archive from '../api/archive.js';
import cases from '../api/cases.js';
import subscribe from '../api/subscribe.js';
const apiHandlers = { '/api/posts': posts, '/api/archive': archive, '/api/cases': cases, '/api/subscribe': subscribe };

const root = resolve('.');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.m4a': 'audio/mp4', '.woff2': 'font/woff2', '.pdf': 'application/pdf' };

/**
 * vercel.json routes the subdomains by Host. Production hosts do not exist
 * locally, so a rule for blog.ismailahmad.com also matches blog.localhost —
 * the subdomain label is what decides. A rule for www matches a bare
 * localhost, which is how the main site is reached here.
 */
function hostMatches(ruleHost, requestHost = '') {
    const host = requestHost.split(':')[0].toLowerCase();
    if (host === ruleHost) return true;
    const label = ruleHost.split('.')[0];
    const bare = host === 'localhost' || host === '127.0.0.1';
    return label === 'www' ? bare : host.startsWith(`${label}.`);
}

const applies = (rule, requestHost) =>
    (rule.has || []).every(c => c.type !== 'host' || hostMatches(c.value, requestHost));

/** Turns "/writing/:slug" into a regex and captures the named parameters. */
function matchSource(source, path) {
    const names = [];
    const pattern = source.replace(/:(\w+)/g, (_, name) => { names.push(name); return '([^/]+)'; });
    const found = new RegExp(`^${pattern}/?$`).exec(path);
    if (!found) return null;
    return Object.fromEntries(names.map((name, i) => [name, found[i + 1]]));
}

const fill = (template, params) =>
    template.replace(/:(\w+)/g, (whole, name) => params[name] ?? whole);

http.createServer(async (req, res) => {
    // Reload routing so newly added pages work without restarting the preview.
    const config = JSON.parse(await readFile('vercel.json', 'utf8'));
    const url = new URL(req.url, 'http://localhost');
    if (apiHandlers[url.pathname]) {
        req.query = Object.fromEntries(url.searchParams);
        // Vercel hands the function a parsed body; here the stream is still
        // ours to drain, and the handlers accept the raw string.
        if (req.method === 'POST') {
            const chunks = [];
            for await (const chunk of req) chunks.push(chunk);
            req.body = Buffer.concat(chunks).toString('utf8');
        }
        res.status = code => { res.statusCode = code; return res; };
        res.json = value => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); return res; };
        return apiHandlers[url.pathname](req, res);
    }
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { res.writeHead(400); return res.end(); }

    // Redirects run before the filesystem, as they do on Vercel
    for (const rule of config.redirects || []) {
        if (!applies(rule, req.headers.host)) continue;
        const params = matchSource(rule.source, path);
        if (!params) continue;
        res.writeHead(rule.permanent ? 308 : 307, { Location: fill(rule.destination, params) + url.search });
        return res.end();
    }

    if (path === '/') path = '/index.html';

    // Vercel checks the filesystem before rewrites, so a real file always
    // wins over a "/:slug" catch-all. Mirror that or the subdomain rule
    // would swallow single-segment asset requests.
    const onDisk = async p => {
        const f = resolve(root, '.' + p);
        if (!f.startsWith(root + sep)) return null;
        if ((await stat(f).catch(() => null))?.isFile()) return f;
        if (config.cleanUrls && (await stat(f + '.html').catch(() => null))?.isFile()) return f + '.html';
        return null;
    };

    let file = await onDisk(path);
    if (!file) {
        for (const rule of config.rewrites || []) {
            if (!applies(rule, req.headers.host)) continue;
            if (!matchSource(rule.source, path)) continue;
            file = await onDisk(rule.destination);
            break;
        }
    }

    if (!file || path.split('/').some(segment => segment.startsWith('.')) || path.startsWith('/node_modules/')) {
        res.writeHead(file ? 403 : 404); return res.end('Not found');
    }
    try {
        res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
        res.end(await readFile(file));
    } catch { res.writeHead(404); res.end('Not found'); }
}).listen(Number(process.env.PORT || 4322), '127.0.0.1', () => {
    const port = process.env.PORT || 4322;
    console.log(`Site:    http://localhost:${port}`);
    console.log(`Blog:    http://blog.localhost:${port}`);
    console.log(`Archive: http://archives.localhost:${port}`);
});
