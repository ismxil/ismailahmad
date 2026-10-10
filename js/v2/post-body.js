import { toHTML } from '@portabletext/to-html';
import { escapeHTML, safeURL } from './blog-data.js';

export function renderBody(body) {
    return toHTML(body, {
        components: {
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
                link: ({ value, children }) => {
                    const href = safeURL(value?.href);
                    return href ? `<a href="${escapeHTML(href)}" rel="noopener noreferrer">${children}</a>` : children;
                },
            },
        },
    });
}
