/**
 * Step 3 and 4 of the publishing loop: turn a published article into a Kit
 * broadcast.
 *
 *   npm run newsletter -- <slug>              create the draft
 *   npm run newsletter -- <slug> --preview    write the email HTML to disk only
 *   npm run newsletter -- <slug> --send-at 2026-10-14T09:00:00Z
 *
 * The draft is the default on purpose: nothing leaves for the list until
 * you have read it in Kit and pressed send. The article stays the single
 * source of truth — this never edits Sanity.
 *
 * Environment: KIT_API_KEY (v4 key from kit.com → Settings → Developer).
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { toHTML } from '@portabletext/to-html';
import { sanityConfig } from '../js/sanity-config.js';

const SITE = 'https://www.ismailahmad.com';
const KIT_API = 'https://api.kit.com/v4';

const escapeHTML = value => String(value ?? '').replace(/[&<>"]/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

/** Email clients drop a stylesheet, so every rule travels on the element. */
const STYLE = {
    h1: 'margin:32px 0 12px;font-size:24px;line-height:1.25;font-weight:600;color:#171717;',
    h2: 'margin:32px 0 12px;font-size:20px;line-height:1.3;font-weight:600;color:#171717;',
    h3: 'margin:28px 0 12px;font-size:18px;line-height:1.4;font-weight:600;color:#171717;',
    p: 'margin:0 0 20px;font-size:16px;line-height:1.7;color:#171717;',
    quote: 'margin:24px 0;padding:0 0 0 20px;border-left:2px solid #d9d9d9;font-size:18px;line-height:1.6;color:#6b6b6b;',
    li: 'margin:0 0 8px;font-size:16px;line-height:1.7;color:#171717;',
    caption: 'margin:8px 0 24px;font-size:14px;line-height:1.5;color:#6b6b6b;',
    img: 'display:block;width:100%;max-width:600px;height:auto;border-radius:8px;',
    rule: 'border:0;border-top:1px solid #d9d9d9;margin:32px 0;',
    link: 'color:#171717;text-decoration:underline;',
};

/**
 * The same Portable Text, rendered for an inbox instead of the page.
 * @param {Array} body
 * @param {string} campaign  Campaign tag for the links that point home.
 */
export function renderEmail(body, campaign) {
    return toHTML(body || [], {
        components: {
            block: {
                normal: ({ children }) => `<p style="${STYLE.p}">${children}</p>`,
                h1: ({ children }) => `<h2 style="${STYLE.h1}">${children}</h2>`,
                h2: ({ children }) => `<h3 style="${STYLE.h2}">${children}</h3>`,
                h3: ({ children }) => `<h4 style="${STYLE.h3}">${children}</h4>`,
                blockquote: ({ children }) => `<blockquote style="${STYLE.quote}">${children}</blockquote>`,
            },
            list: {
                bullet: ({ children }) => `<ul style="margin:0 0 20px;padding-left:22px;">${children}</ul>`,
                number: ({ children }) => `<ol style="margin:0 0 20px;padding-left:22px;">${children}</ol>`,
            },
            listItem: ({ children }) => `<li style="${STYLE.li}">${children}</li>`,
            marks: {
                strong: ({ children }) => `<strong style="font-weight:600;">${children}</strong>`,
                underline: ({ children }) => `<span style="text-decoration:underline;">${children}</span>`,
                code: ({ children }) => `<code style="font-family:ui-monospace,Menlo,monospace;font-size:14px;background:#f2f2f2;border-radius:4px;padding:2px 6px;">${children}</code>`,
                link: ({ value, children }) => {
                    const href = String(value?.href || '');
                    return /^https?:\/\//i.test(href) || href.startsWith('mailto:')
                        ? `<a href="${escapeHTML(href)}" style="${STYLE.link}">${children}</a>`
                        : children;
                },
            },
            types: {
                image: ({ value }) => {
                    const src = String(value?.asset?.url || '');
                    if (!src.startsWith('https://')) return '';
                    const url = new URL(src);
                    url.searchParams.set('w', '1200');
                    url.searchParams.set('auto', 'format');
                    return `<img src="${escapeHTML(url.href)}" alt="${escapeHTML(value.alt)}" style="${STYLE.img}" />`
                        + (value.caption ? `<p style="${STYLE.caption}">${escapeHTML(value.caption)}</p>` : '');
                },
                divider: () => `<hr style="${STYLE.rule}" />`,
            },
        },
    }) + footer(campaign);
}

/** Every link home is tagged, so Vercel Analytics can see the newsletter arrive. */
export function articleURL(slug, campaign) {
    return `${SITE}/blog/${encodeURIComponent(slug)}?utm_source=newsletter&utm_medium=email&utm_campaign=${encodeURIComponent(campaign)}`;
}

function footer(campaign) {
    return `<hr style="${STYLE.rule}" />`
        + `<p style="margin:0;font-size:14px;line-height:1.5;color:#6b6b6b;">`
        + `Read this and everything else at <a href="${SITE}/blog?utm_source=newsletter&utm_medium=email&utm_campaign=${encodeURIComponent(campaign)}" style="${STYLE.link}">ismailahmad.com/blog</a>.`
        + `</p>`;
}

export async function fetchArticle(slug) {
    const url = new URL(`https://${sanityConfig.projectId}.api.sanity.io/v${sanityConfig.apiVersion}/data/query/${sanityConfig.dataset}`);
    url.searchParams.set('perspective', 'published');
    url.searchParams.set('query', '*[_type == "post" && !(_id in path("drafts.**")) && slug.current == $slug][0]'
        + '{title,"slug":slug.current,excerpt,publishedAt,"cover":coverImage.asset->url,body[]{...,asset->{url}}}');
    url.searchParams.set('$slug', JSON.stringify(slug));
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Sanity returned ${response.status}`);
    const { result } = await response.json();
    if (!result) throw new Error(`No published article with the slug "${slug}"`);
    return result;
}

export function broadcastFor(post, { sendAt = null } = {}) {
    const campaign = post.slug;
    return {
        subject: post.title,
        preview_text: post.excerpt || post.title,
        description: `Article: ${post.title}`,
        content: `<p style="${STYLE.p}">`
            + `<a href="${articleURL(post.slug, campaign)}" style="${STYLE.link}">Read this on the site</a>`
            + `</p>` + renderEmail(post.body, campaign),
        public: false,
        published_at: post.publishedAt || new Date().toISOString(),
        send_at: sendAt,
        ...(post.cover ? { thumbnail_url: post.cover, thumbnail_alt: post.title } : {}),
    };
}

async function main() {
    const args = process.argv.slice(2);
    const slug = args.find(arg => !arg.startsWith('--'));
    const preview = args.includes('--preview');
    const sendAt = args.includes('--send-at') ? args[args.indexOf('--send-at') + 1] : null;
    if (!slug) throw new Error('Usage: npm run newsletter -- <slug> [--preview] [--send-at <ISO8601>]');

    const post = await fetchArticle(slug);
    const broadcast = broadcastFor(post, { sendAt });

    if (preview) {
        const out = new URL('../.context/newsletter/', import.meta.url);
        await mkdir(out, { recursive: true });
        const file = new URL(`${slug}.html`, out);
        await writeFile(file, `<!doctype html><meta charset="utf-8"><title>${escapeHTML(post.title)}</title>`
            + `<div style="max-width:600px;margin:40px auto;padding:0 20px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;">`
            + broadcast.content + '</div>');
        console.log(`Preview written to ${file.pathname}`);
        return;
    }

    const key = process.env.KIT_API_KEY;
    if (!key) throw new Error('KIT_API_KEY is not set. Export it, or run with --preview to only build the HTML.');

    const response = await fetch(`${KIT_API}/broadcasts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Kit-Api-Key': key },
        body: JSON.stringify(broadcast),
        signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) throw new Error(`Kit returned ${response.status}: ${(await response.text()).slice(0, 300)}`);

    const { broadcast: created } = await response.json();
    console.log(`${sendAt ? 'Scheduled' : 'Drafted'} "${created.subject}" in Kit (id ${created.id}, status ${created.status}).`);
    console.log('Review and send it at https://app.kit.com/broadcasts');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(error => {
        console.error(error.message);
        process.exitCode = 1;
    });
}
