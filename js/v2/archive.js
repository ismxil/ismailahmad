import { withContentTransition } from './page-transition.js';
import { archiveGridSkeleton, watchImageSkeletons } from './skeleton.js';

/**
 * Archive — a masonry grid of shots and covers published in Sanity.
 *
 * Selecting a tile opens it in a lightbox built the same way as the command
 * menu: a native <dialog> opened with showModal(), so the browser handles
 * the backdrop, focus trapping and Escape for us. Arrow keys step through
 * the set without closing.
 */

const HOME_LIMIT = 9;
// The first rows are above the fold on /archive — leaving them lazy meant the
// page arrived as a wall of empty plates while they decoded.
const EAGER = 6;

let items = [];
let index = 0;
let dialog;
let previousOverflow = '';

const still = window.matchMedia('(prefers-reduced-motion: reduce)');

/** Sanity serves uploaded artwork from its image CDN. */
function cover(item) {
    return item.cover;
}

/**
 * Sanity writes the pixel size into the asset filename — …-2656x1605.jpg —
 * so each plate can be given its true proportion before the picture
 * arrives. The masonry then settles once instead of twice.
 */
function ratio(url) {
    const found = /-(\d+)x(\d+)\.\w+(?:[?#]|$)/.exec(url || '');
    return found ? `${found[1]} / ${found[2]}` : '';
}

/**
 * Video plates loop muted, and only while on screen — a wall of them all
 * decoding at once would stall the page. Reduced motion leaves them on
 * their first frame.
 */
const playback = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
            if (isIntersecting && !still.matches) target.play().catch(() => {});
            else target.pause();
        });
    }, { rootMargin: '200px 0px' })
    : null;

function media(item, i) {
    if (item.video) {
        // No size in a file URL, so a plate without a poster takes its
        // proportion from the video once the metadata arrives.
        return `<video src="${escape(item.video)}"${item.cover ? ` poster="${escape(item.cover)}"` : ''}
                    muted loop playsinline disablepictureinpicture
                    preload="${i < EAGER ? 'auto' : 'metadata'}" aria-hidden="true"></video>`;
    }
    return `<img src="${escape(cover(item, i))}" alt="" aria-hidden="true"
                    loading="${i < EAGER ? 'eager' : 'lazy'}" decoding="async" />`;
}

function label(item) {
    return [item.client, item.type].filter(Boolean).join(' · ');
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
        <div class="lightbox__top">
            <span class="lightbox__name"></span>
            <button type="button" data-close aria-label="Close"><kbd>esc</kbd></button>
        </div>
        <figure class="lightbox__figure">
            <img class="lightbox__img" alt="" />
            <video class="lightbox__img" muted loop playsinline disablepictureinpicture hidden></video>
        </figure>`;
    dialog.tabIndex = -1;
    document.body.appendChild(dialog);

    // Every dismissal route funnels through hide() so the scroll lock is
    // always released. Relying on the dialog's 'close' event alone is not
    // enough — it does not fire reliably here, which left the page stuck
    // unscrollable after the lightbox had gone.
    dialog.addEventListener('cancel', hide);   // Escape
    dialog.addEventListener('close', release); // backstop

    dialog.querySelector('[data-close]').addEventListener('click', hide);

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

    const img = dialog.querySelector('img.lightbox__img');
    const video = dialog.querySelector('video.lightbox__img');
    img.hidden = Boolean(item.video);
    video.hidden = !item.video;
    if (item.video) {
        img.removeAttribute('src');
        video.poster = item.cover || '';
        video.src = item.video;
        if (!still.matches) video.play().catch(() => {});
    } else {
        video.pause();
        video.removeAttribute('src');
        video.load();
        img.src = cover(item, index);
        img.alt = label(item);
    }
    dialog.querySelector('.lightbox__name').textContent = item.client || item.type || '';
    // No visible caption any more, so the dialog itself carries the label
    // and the position for anyone on a screen reader.
    dialog.setAttribute('aria-label', `${label(item)} — ${index + 1} of ${items.length}`);
}

function release() {
    document.body.style.overflow = previousOverflow;
}

function hide() {
    release();
    dialog?.querySelector('video.lightbox__img')?.pause();
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
    dialog.focus();
}

/* ── Grid ────────────────────────────────────────────────── */

/**
 * The lightbox earns its place while the plates are small. On /archive at
 * desktop width they already fill half the screen, so opening one would
 * only shrink it — there the tiles hold artwork rather than act as
 * controls. The homepage grid stays small at every width, so it keeps the
 * lightbox throughout; the test is the layout a tile sits in, not the
 * viewport alone.
 */
const compact = window.matchMedia('(max-width: 1023px)');

function zoomable(tile) {
    const wideShell = tile.closest('.shell--wide');
    return compact.matches || !wideShell || wideShell.getBoundingClientRect().width < 1024;
}

function syncTiles(mount) {
    mount.querySelectorAll('.archive-tile').forEach((tile) => {
        const name = tile.dataset.label || '';
        if (zoomable(tile)) {
            tile.tabIndex = 0;
            tile.setAttribute('aria-haspopup', 'dialog');
            tile.setAttribute('aria-label', `${name}, open larger`);
        } else {
            // Left out of the tab order rather than disabled, so the label
            // still appears on hover and the plate keeps its styling.
            tile.tabIndex = -1;
            tile.removeAttribute('aria-haspopup');
            tile.setAttribute('aria-label', name);
        }
    });
}

async function renderContent(mount, { limit = HOME_LIMIT } = {}) {
    if (!mount) return;

    // Stand the wall up before the request, so the page has its height from
    // the first paint. /archive asks for everything, which is more than a
    // screenful — a dozen plates is enough to fill one.
    mount.innerHTML = archiveGridSkeleton(Number.isFinite(limit) ? limit : 12);

    let all = [];
    try {
        const res = await fetch('/api/archive', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        all = Array.isArray(data.items) ? data.items : [];
    } catch (err) {
        console.warn('[archive] could not load published items', err);
        mount.innerHTML =
            '<li><p class="section__note">The archive is taking a moment. ' +
            '<a href="/archive" style="color:var(--text-primary)">Open it directly</a>.</p></li>';
        return;
    }

    items = Number.isFinite(limit) ? all.slice(0, limit) : all;

    mount.innerHTML = items
        .map((item, i) => `<li>
            <button type="button" class="archive-tile" data-index="${i}"
                data-label="${escape(label(item))}" style="aspect-ratio:${ratio(item.cover) || 'auto'}"
                aria-haspopup="dialog" aria-label="${escape(label(item))}, open larger">
                ${media(item, i)}
                <span class="archive-tile__label" aria-hidden="true">${escape(label(item))}</span>
            </button>
        </li>`)
        .join('') || '<li><p class="section__note">No archive items published yet.</p></li>';

    syncTiles(mount);
    watchImageSkeletons(mount);
    mount.querySelectorAll('.archive-tile video').forEach((video) => {
        const tile = video.closest('.archive-tile');
        if (tile.style.aspectRatio === 'auto') {
            video.addEventListener('loadedmetadata', () => {
                tile.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
            }, { once: true });
        }
        if (playback) playback.observe(video);
        else if (!still.matches) video.play().catch(() => {});
    });
    compact.addEventListener('change', () => syncTiles(mount));
    // Page edges can move without the browser viewport changing.
    new ResizeObserver(() => syncTiles(mount)).observe(mount);

    mount.addEventListener('click', (e) => {
        const tile = e.target.closest('.archive-tile');
        if (tile && zoomable(tile)) open(Number(tile.dataset.index));
    });

    const count = document.querySelector('[data-count="archive"]');
    if (count) count.textContent = String(all.length);
}

export function renderArchive(mount, options) {
    return withContentTransition(mount, () => renderContent(mount, options));
}
