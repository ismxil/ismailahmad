/**
 * Archive — a masonry grid of shots and covers from data/feed-items.json.
 *
 * Selecting a tile opens it in a lightbox built the same way as the command
 * menu: a native <dialog> opened with showModal(), so the browser handles
 * the backdrop, focus trapping and Escape for us. Arrow keys step through
 * the set without closing.
 */

const HOME_LIMIT = 9;

let items = [];
let index = 0;
let dialog;
let previousOverflow = '';

/** Mirrors resolveFeedCover() in js/feed-items.js. */
function cover(item, i) {
    if (item.cover) {
        if (item.cover.startsWith('http')) return item.cover;
        return item.cover.replace('assets/feeds/covers/', 'assets/feeds/');
    }
    return `assets/feeds/image_${i}.jpg`;
}

function label(item) {
    return [item.client, item.category].filter(Boolean).join(' · ');
}

function escape(str) {
    return String(str == null ? '' : str).replace(/[&<>"]/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
}

/* ── Lightbox ────────────────────────────────────────────── */

function build() {
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.className = 'lightbox';
    dialog.setAttribute('aria-label', 'Archive item');
    dialog.innerHTML = `
        <figure class="lightbox__figure">
            <img class="lightbox__img" alt="" />
        </figure>
        <div class="lightbox__bar">
            <span class="lightbox__meta">
                <span class="lightbox__title"></span>
            </span>
            <span class="lightbox__nav">
                <button type="button" data-step="-1" aria-label="Previous item">
                    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"
                        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M10.75 4.75 6.5 9l4.25 4.25" />
                    </svg>
                </button>
                <span class="lightbox__count" aria-live="polite"></span>
                <button type="button" data-step="1" aria-label="Next item">
                    <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"
                        stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M7.25 4.75 11.5 9l-4.25 4.25" />
                    </svg>
                </button>
                <button type="button" data-close aria-label="Close"><kbd>esc</kbd></button>
            </span>
        </div>`;
    document.body.appendChild(dialog);

    // Every dismissal route funnels through hide() so the scroll lock is
    // always released. Relying on the dialog's 'close' event alone is not
    // enough — it does not fire reliably here, which left the page stuck
    // unscrollable after the lightbox had gone.
    dialog.addEventListener('cancel', hide);   // Escape
    dialog.addEventListener('close', release); // backstop

    dialog.querySelector('[data-close]').addEventListener('click', hide);

    dialog.querySelectorAll('[data-step]').forEach((btn) => {
        btn.addEventListener('click', () => step(Number(btn.dataset.step)));
    });

    // Clicking the backdrop (anything outside the figure and bar) dismisses
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) hide();
    });

    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });

    return dialog;
}

function paint() {
    const item = items[index];
    if (!item) return;

    const img = dialog.querySelector('.lightbox__img');
    img.src = cover(item, index);
    img.alt = label(item);

    dialog.querySelector('.lightbox__title').textContent = label(item);
    dialog.querySelector('.lightbox__count').textContent = `${index + 1} / ${items.length}`;
}

function release() {
    document.body.style.overflow = previousOverflow;
}

function hide() {
    release();
    if (dialog?.open) dialog.close();
}

function step(delta) {
    index = (index + delta + items.length) % items.length;
    paint();
}

function open(i) {
    build();
    index = i;
    paint();
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
}

/* ── Grid ────────────────────────────────────────────────── */

export async function renderArchive(mount, { limit = HOME_LIMIT } = {}) {
    if (!mount) return;

    let all = [];
    try {
        const res = await fetch('/data/feed-items.json', { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        all = Array.isArray(data.items) ? data.items : [];
    } catch (err) {
        console.warn('[archive] could not load data/feed-items.json', err);
        mount.innerHTML =
            '<li><p class="section__note">The archive is taking a moment. ' +
            '<a href="/archive" style="color:var(--text-primary)">Open it directly</a>.</p></li>';
        return;
    }

    items = Number.isFinite(limit) ? all.slice(0, limit) : all;

    mount.innerHTML = items
        .map((item, i) => `<li>
            <button type="button" class="archive-tile" data-index="${i}"
                aria-haspopup="dialog" aria-label="${escape(label(item))}, open larger">
                <img src="/${escape(cover(item, i))}" alt="" aria-hidden="true" loading="lazy"
                    decoding="async" />
                <span class="archive-tile__label" aria-hidden="true">${escape(label(item))}</span>
            </button>
        </li>`)
        .join('');

    mount.addEventListener('click', (e) => {
        const tile = e.target.closest('.archive-tile');
        if (tile) open(Number(tile.dataset.index));
    });

    const count = document.querySelector('[data-count="archive"]');
    if (count) count.textContent = String(items.length);
}
