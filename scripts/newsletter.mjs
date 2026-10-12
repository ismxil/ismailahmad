/**
 * Draft a newsletter by hand, for an article the webhook missed or one you
 * want to re-cut.
 *
 *   npm run newsletter -- <slug>              create the draft
 *   npm run newsletter -- <slug> --preview    write the email HTML to disk only
 *   npm run newsletter -- <slug> --send-at 2026-10-14T09:00:00Z
 *
 * Publishing in Sanity already does this (api/sanity-publish.js). Running it
 * again is safe: a second draft for the same article is never created.
 *
 * Environment: KIT_API_KEY (v4 key from kit.com → Settings → Developer).
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fetchArticle, broadcastFor, draftBroadcast, escapeHTML } from '../lib/newsletter.mjs';

async function main() {
    const args = process.argv.slice(2);
    const sendAtIndex = args.indexOf('--send-at');
    const sendAt = sendAtIndex === -1 ? null : args[sendAtIndex + 1];
    const preview = args.includes('--preview');
    // Everything that is not a flag, nor the value belonging to one.
    const slug = args.find((arg, index) => !arg.startsWith('--') && !(sendAtIndex !== -1 && index === sendAtIndex + 1));
    if (!slug) throw new Error('Usage: npm run newsletter -- <slug> [--preview] [--send-at <ISO8601>]');

    const post = await fetchArticle(slug);

    if (preview) {
        const out = new URL('../.context/newsletter/', import.meta.url);
        await mkdir(out, { recursive: true });
        const file = new URL(`${slug}.html`, out);
        await writeFile(file, `<!doctype html><meta charset="utf-8"><title>${escapeHTML(post.title)}</title>`
            + `<div style="max-width:600px;margin:40px auto;padding:0 20px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">`
            + broadcastFor(post).content + '</div>');
        console.log(`Preview written to ${file.pathname}`);
        return;
    }

    const key = process.env.KIT_API_KEY;
    if (!key) throw new Error('KIT_API_KEY is not set. Export it, or run with --preview to only build the HTML.');

    const { created, broadcast, reason } = await draftBroadcast(post, { key, sendAt });
    if (!created) {
        console.log(`Skipped — "${post.title}" is ${reason} in Kit (id ${broadcast.id}, status ${broadcast.status}).`);
        return;
    }
    console.log(`${sendAt ? 'Scheduled' : 'Drafted'} "${broadcast.subject}" in Kit (id ${broadcast.id}, status ${broadcast.status}).`);
    console.log('Review and send it at https://app.kit.com/broadcasts');
}

main().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
});
