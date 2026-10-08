/**
 * Feed — a nine-tile masonry grid drawn from data/feed-items.json.
 *
 * The JSON is the same source the full feed page reads, so adding an item
 * there surfaces it here too. Tiles link into the feed page by anchor.
 */

const LIMIT = 9;

/** Mirrors resolveFeedCover() in js/feed-items.js. */
function cover(item, index) {
    if (item.cover) {
        if (item.cover.startsWith('http')) return item.cover;
        return item.cover.replace('assets/feeds/covers/', 'assets/feeds/');
    }
    return `assets/feeds/image_${index}.jpg`;
}

export async function renderFeed(mount) {
    if (!mount) return;

    let items = [];
    try {
        const res = await fetch('data/feed-items.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        items = Array.isArray(data.items) ? data.items : [];
    } catch (err) {
        console.warn('[feed] could not load data/feed-items.json', err);
        mount.innerHTML =
            '<li><p class="section__note">The feed is taking a moment. ' +
            '<a href="feeds.html" style="color:var(--text-primary)">Open it directly</a>.</p></li>';
        return;
    }

    const picks = items.slice(0, LIMIT);

    mount.innerHTML = picks
        .map((item, i) => {
            const src = cover(item, i);
            const label = [item.client, item.category].filter(Boolean).join(' · ');
            return `<li>
                <a class="feed-tile" href="feeds.html#${item.id}"
                   aria-label="${label}, opens in the feed">
                    <img src="${src}" alt="" loading="lazy" decoding="async" />
                    <span class="feed-tile__label" aria-hidden="true">${label}</span>
                </a>
            </li>`;
        })
        .join('');

    const count = document.querySelector('[data-count="feed"]');
    if (count) count.textContent = String(picks.length);
}
