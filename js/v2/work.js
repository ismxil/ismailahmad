/**
 * Work — a masonry grid of case covers drawn from data/feed-items.json.
 *
 * This is the same source the full feed page reads, so adding an item there
 * surfaces it here too. Tiles link into that page by anchor.
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

export async function renderWork(mount) {
    if (!mount) return;

    let items = [];
    try {
        const res = await fetch('data/feed-items.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        items = Array.isArray(data.items) ? data.items : [];
    } catch (err) {
        console.warn('[work] could not load data/feed-items.json', err);
        mount.innerHTML =
            '<li><p class="section__note">The work grid is taking a moment. ' +
            '<a href="feeds.html" style="color:var(--text-primary)">Open it directly</a>.</p></li>';
        return;
    }

    const picks = items.slice(0, LIMIT);

    mount.innerHTML = picks
        .map((item, i) => {
            const src = cover(item, i);
            const label = [item.client, item.category].filter(Boolean).join(' · ');
            return `<li>
                <a class="work-tile" href="feeds.html#${item.id}"
                   aria-label="${label}, opens the case">
                    <img src="${src}" alt="" loading="lazy" decoding="async" />
                    <span class="work-tile__label" aria-hidden="true">${label}</span>
                </a>
            </li>`;
        })
        .join('');

    const count = document.querySelector('[data-count="work"]');
    if (count) count.textContent = String(picks.length);
}
