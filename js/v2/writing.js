/**
 * Writing — a dotted-leader list of the four most recent posts.
 *
 * Live entries come from window.BlogCache (the Substack feed, cached in
 * localStorage by blog-cache.js). The feed is a third-party round trip that
 * can be slow or blocked, so a static list renders first and is swapped out
 * once real articles arrive. That way the section is never empty.
 */

const LIMIT = 4;

const FALLBACK = [
    {
        title: 'Offboarding, in product',
        link: 'https://blog.ismailahmad.com',
        pubDate: '2025-02-20',
    },
    {
        title: 'Why most products lack soul',
        link: 'https://blog.ismailahmad.com',
        pubDate: '2025-02-17',
    },
    {
        title: 'AI panic — tune out, focus on fundamentals',
        link: 'https://blog.ismailahmad.com',
        pubDate: '2025-01-03',
    },
    {
        title: 'Scrolljacking seems appealing, but can be deadly',
        link: 'https://blog.ismailahmad.com',
        pubDate: '2024-11-28',
    },
];

function formatDate(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

function isoDate(value) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
}

function escape(str) {
    return String(str).replace(/[&<>"]/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
}

function paint(mount, posts) {
    const picks = posts.slice(0, LIMIT);

    mount.innerHTML = picks
        .map((post) => {
            const href = post.link || 'https://blog.ismailahmad.com';
            const label = formatDate(post.pubDate);
            const iso = isoDate(post.pubDate);
            return `<li>
                <a class="lede" href="${escape(href)}" target="_blank" rel="noopener noreferrer">
                    <span class="lede__title">${escape(post.title)}</span>
                    <span class="lede__rule" aria-hidden="true"></span>
                    <time class="lede__date"${iso ? ` datetime="${iso}"` : ''}>${label}</time>
                </a>
            </li>`;
        })
        .join('');

    const count = document.querySelector('[data-count="writing"]');
    if (count) count.textContent = String(picks.length);
}

export function renderWriting(mount) {
    if (!mount) return;

    paint(mount, FALLBACK);

    if (!window.BlogCache) return;

    window.BlogCache.getArticles((articles) => {
        if (Array.isArray(articles) && articles.length) {
            paint(mount, articles);
        }
    });
}
