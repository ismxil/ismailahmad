import { toHTML } from '@portabletext/to-html';
import { escapeHTML, safeURL } from './blog-data.js';

export function renderBody(body) {
    return toHTML(body, {
        components: {
            // The article title owns the page's only <h1>, so an article's own
            // headings start one element lower. The class carries the scale the
            // writer picked in Studio.
            block: {
                h1: ({ children }) => `<h2 class="post-h1">${children}</h2>`,
                h2: ({ children }) => `<h3 class="post-h2">${children}</h3>`,
                h3: ({ children }) => `<h4 class="post-h3">${children}</h4>`,
            },
            types: {
                image: ({ value }) => {
                    const src = safeURL(value.asset?.url);
                    if (!src) return '';
                    const url = new URL(src);
                    url.searchParams.set('w', '1440');
                    url.searchParams.set('auto', 'format');
                    return `<figure><img src="${escapeHTML(url.href)}" alt="${escapeHTML(value.alt)}" loading="lazy" decoding="async">${value.caption ? `<figcaption>${escapeHTML(value.caption)}</figcaption>` : ''}</figure>`;
                },
                divider: () => '<hr>',
            },
            marks: {
                // The default is an inline style attribute, which cannot be
                // tuned to match the link underline.
                underline: ({ children }) => `<u class="post-underline">${children}</u>`,
                link: ({ value, children }) => {
                    const href = safeURL(value?.href);
                    return href ? `<a href="${escapeHTML(href)}" rel="noopener noreferrer">${children}</a>` : children;
                },
            },
        },
    });
}
