/**
 * Publishing an article in Sanity drafts its newsletter in Kit.
 *
 * Sanity calls this on every publish of a `post`. The draft is where it
 * stops: nothing reaches the list until you open Kit and press send.
 *
 * Republishing the same article does not draft it twice — the broadcast
 * carries the article's path in its description, and that is checked first.
 *
 * Environment:
 *   SANITY_WEBHOOK_SECRET   shared with the hook, signs every request
 *   KIT_API_KEY             v4 key from kit.com → Settings → Developer
 */
import { isValidSignature, SIGNATURE_HEADER_NAME } from '@sanity/webhook';
import { fetchArticle, draftBroadcast } from '../lib/newsletter.mjs';

// The signature covers the bytes Sanity sent, so the body must arrive
// unparsed — re-encoding parsed JSON would not reproduce them.
export const config = { api: { bodyParser: false } };

async function readRawBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ ok: false, error: 'Method not allowed' });
    }

    const secret = process.env.SANITY_WEBHOOK_SECRET;
    const key = process.env.KIT_API_KEY;
    if (!secret || !key) {
        console.error('sanity-publish: SANITY_WEBHOOK_SECRET or KIT_API_KEY is missing');
        return res.status(503).json({ ok: false, error: 'Not configured' });
    }

    const raw = await readRawBody(req);
    const signature = req.headers[SIGNATURE_HEADER_NAME];
    if (typeof signature !== 'string' || !(await isValidSignature(raw, signature, secret))) {
        return res.status(401).json({ ok: false, error: 'Invalid signature' });
    }

    let slug;
    try {
        const payload = JSON.parse(raw);
        slug = typeof payload?.slug === 'string' ? payload.slug : payload?.slug?.current;
    } catch {
        return res.status(400).json({ ok: false, error: 'Invalid payload' });
    }
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
        return res.status(400).json({ ok: false, error: 'Payload has no usable slug' });
    }

    try {
        // Read the article back from the API rather than trusting the hook's
        // projection: the same text the site serves is the text that is sent.
        const post = await fetchArticle(slug);
        const { created, broadcast, reason } = await draftBroadcast(post, { key });
        console.log(created
            ? `sanity-publish: drafted "${post.title}" in Kit (id ${broadcast.id})`
            : `sanity-publish: skipped "${post.title}" — ${reason} (id ${broadcast.id})`);
        return res.status(200).json({ ok: true, created, id: broadcast?.id });
    } catch (error) {
        // 200 on purpose: a retry would hit the same wall, and the draft can
        // always be made by hand with `npm run newsletter -- <slug>`.
        console.error(`sanity-publish: ${error.message}`);
        return res.status(200).json({ ok: false, error: 'Could not draft the newsletter' });
    }
}
