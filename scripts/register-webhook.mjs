/**
 * Register (or update) the Sanity webhook that drafts a newsletter on publish.
 *
 *   npm run webhook:register            create or update the hook
 *   npm run webhook:register -- --list  show the hooks that exist
 *
 * The secret is read from SANITY_WEBHOOK_SECRET. If it is not set, one is
 * generated and written to .context/sanity-webhook-secret.txt (gitignored,
 * owner-readable) — paste that same value into the Vercel project so the
 * two ends agree.
 *
 * Authentication uses the token the Sanity CLI already holds, so
 * `npx sanity login` is the only prerequisite.
 */
import { readFile, writeFile, mkdir, chmod } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { sanityConfig } from '../js/sanity-config.js';

const MANAGEMENT_API = 'https://api.sanity.io/v2021-10-04';
const NAME = 'newsletter-on-publish';
const ENDPOINT = 'https://www.ismailahmad.com/api/sanity-publish';
const SECRET_FILE = new URL('../.context/sanity-webhook-secret.txt', import.meta.url);

async function cliToken() {
    if (process.env.SANITY_AUTH_TOKEN) return process.env.SANITY_AUTH_TOKEN;
    try {
        const config = JSON.parse(await readFile(join(homedir(), '.config/sanity/config.json'), 'utf8'));
        if (config.authToken) return config.authToken;
    } catch { /* fall through to the clearer error below */ }
    throw new Error('No Sanity token. Run `npx sanity login` in ./sanity, or set SANITY_AUTH_TOKEN.');
}

async function secret() {
    if (process.env.SANITY_WEBHOOK_SECRET) return process.env.SANITY_WEBHOOK_SECRET;
    try {
        const saved = (await readFile(SECRET_FILE, 'utf8')).trim();
        if (saved) return saved;
    } catch { /* first run */ }
    const generated = randomBytes(32).toString('base64url');
    await mkdir(new URL('./', SECRET_FILE), { recursive: true });
    await writeFile(SECRET_FILE, `${generated}\n`, { mode: 0o600 });
    await chmod(SECRET_FILE, 0o600);
    console.log(`A new secret was written to ${SECRET_FILE.pathname}`);
    console.log('Add it to Vercel as SANITY_WEBHOOK_SECRET (Production), then redeploy.');
    return generated;
}

async function api(path, token, init = {}) {
    const response = await fetch(`${MANAGEMENT_API}${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init.headers },
        signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`Sanity management API returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
    return response.json();
}

async function main() {
    const token = await cliToken();
    const { projectId, dataset } = sanityConfig;
    const hooks = await api(`/hooks/projects/${projectId}`, token);

    if (process.argv.includes('--list')) {
        console.log(hooks.length ? hooks.map(hook => `${hook.name} → ${hook.url} (${hook.isDisabled ? 'disabled' : 'enabled'})`).join('\n') : 'No hooks.');
        return;
    }

    const body = {
        name: NAME,
        description: 'Drafts the article newsletter in Kit when a post is published.',
        url: ENDPOINT,
        dataset,
        // Published posts only: a draft save must not reach the list.
        filter: '_type == "post" && !(_id in path("drafts.**"))',
        // The endpoint reads the article back from the API, so the hook only
        // has to say which one changed.
        projection: '{"slug": slug.current}',
        httpMethod: 'POST',
        apiVersion: 'v2021-03-25',
        includeDrafts: false,
        isDisabled: false,
        secret: await secret(),
    };

    const existing = hooks.find(hook => hook.name === NAME);
    const hook = existing
        ? await api(`/hooks/projects/${projectId}/${existing.id}`, token, { method: 'PUT', body: JSON.stringify(body) })
        : await api(`/hooks/projects/${projectId}`, token, { method: 'POST', body: JSON.stringify(body) });

    console.log(`${existing ? 'Updated' : 'Created'} hook "${hook.name || NAME}" → ${ENDPOINT}`);
    console.log(`Filter: ${body.filter}`);
    console.log('Publish an article in Studio, then check: npx sanity hook logs newsletter-on-publish');
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
