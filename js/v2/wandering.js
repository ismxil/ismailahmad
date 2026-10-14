import { withContentTransition } from './page-transition.js';
import { wanderWallSkeleton, watchImageSkeletons } from './skeleton.js';

/**
 * Wandering — a wall of small photographs, one run per place, each run
 * closed by the place's name.
 *
 * Pointing at a plate fades every other place back, so the run you are on
 * reads as one. Selecting it opens the place as a rail of large slides:
 * the plates on that row lift off the wall and travel into the rail, the
 * rest fade in after them. The rail loops, and is dragged, wheeled or
 * stepped with the arrow keys, settling each time on the slide nearest the
 * title.
 *
 * The rail is a native <dialog> opened with showModal(), like the lightbox
 * and the command menu, so focus trapping and Escape come with it.
 *
 * Places are published in Sanity as "Wandering place" documents and read
 * through /api/wandering.
 */

const TIMING = {
    compact: { appear: 145, cascade: 140, travel: 640 },
    wide: { appear: 190, cascade: 330, travel: 850 },
};
const EASE = 'cubic-bezier(0.33, 1, 0.68, 1)';
const CLOSE_MS = 220;
// A cycle shorter than this cannot fill a wide screen before it repeats.
const MIN_CYCLE = 6;

const wide = window.matchMedia('(min-width: 1024px)');
const still = window.matchMedia('(prefers-reduced-motion: reduce)');

let places = [];

/**
 * Sanity's image CDN resizes on request: the wall asks for a plate-sized
 * copy, the rail for one big enough to fill a slide on a retina screen.
 */
function sized(photo, width) {
    const join = photo.src.includes('?') ? '&' : '?';
    return `${photo.src}${join}w=${width}&q=80&auto=format`;
}

/** The hotspot set in Studio decides what stays in frame at 3:4. */
function focus(photo) {
    const f = photo.focus;
    return f && Number.isFinite(f.x) && Number.isFinite(f.y)
        ? ` style="object-position:${(f.x * 100).toFixed(1)}% ${(f.y * 100).toFixed(1)}%"`
        : '';
}

function escape(str) {
    return String(str == null ? '' : str).replace(/[&<>"]/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
}

/* ── Wall ────────────────────────────────────────────────── */

let wall;

/** Fades every place but one back; null brings them all forward again. */
function spotlight(group) {
    if (!wall) return;
    wall.classList.toggle('is-focusing', group != null);
    wall.querySelectorAll('[data-group]').forEach((el) => {
        el.classList.toggle('is-active', el.dataset.group === group);
    });
}

function wallHTML() {
    return places.map(({ place, photos }, g) => photos.map((photo, i) => `<li class="wander-cell" data-group="${g}">
            <button type="button" class="wander-frame" data-group="${g}" data-photo="${i}"
                aria-haspopup="dialog" aria-label="${escape(place)}, photo ${i + 1} of ${photos.length}">
                <img src="${escape(sized(photo, 400))}"${focus(photo)} alt="" loading="lazy" decoding="async" />
            </button>
        </li>`).join('') + `<li class="wander-note" data-group="${g}" aria-hidden="true">
            <span class="wander-note__line">${escape(place)}</span>
        </li>`).join('');
}

async function renderContent(mount) {
    // Hold the wall's height while the places are fetched.
    mount.innerHTML = wanderWallSkeleton();

    try {
        const res = await fetch('/api/wandering', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        places = (Array.isArray(data.places) ? data.places : [])
            .filter((p) => Array.isArray(p.photos) && p.photos.length);
    } catch (err) {
        console.warn('[wandering] could not load published places', err);
        places = [];
    }

    // Nothing published (or nothing reachable) — the section steps aside
    // rather than show an empty heading.
    if (!places.length) {
        mount.innerHTML = '';
        mount.closest('.section')?.setAttribute('hidden', '');
        return;
    }

    wall = mount;
    mount.innerHTML = wallHTML();
    watchImageSkeletons(mount);

    // Only a pointer that can hover gets the spotlight; on touch the tap
    // opens the place straight away and a dimmed wall would be left behind.
    mount.addEventListener('pointerover', (e) => {
        if (e.pointerType === 'touch') return;
        const cell = e.target.closest('[data-group]');
        // Crossing the gap between two plates of one place keeps the light on.
        if (cell) spotlight(cell.dataset.group);
    });
    mount.addEventListener('pointerleave', () => spotlight(null));
    mount.addEventListener('focusin', (e) => {
        const frame = e.target.closest('.wander-frame');
        if (frame) spotlight(frame.dataset.group);
    });
    mount.addEventListener('focusout', (e) => {
        if (!mount.contains(e.relatedTarget)) spotlight(null);
    });

    mount.addEventListener('click', (e) => {
        const frame = e.target.closest('.wander-frame');
        const note = e.target.closest('.wander-note');
        if (frame) open(Number(frame.dataset.group), Number(frame.dataset.photo));
        else if (note) open(Number(note.dataset.group), 0);
    });

    const count = document.querySelector('[data-count="wandering"]');
    if (count) count.textContent = String(places.length);
}

export function renderWandering(mount) {
    if (!mount) return;
    return withContentTransition(mount, () => renderContent(mount));
}

/* ── Rail ────────────────────────────────────────────────── */

let dialog;
let rail;
let title;
let cycles = [];
let hiddenFrames = [];
let running = [];
let timers = [];
let previousOverflow = '';
let closing = false;

// The rail is driven by hand rather than by native scrolling, so a drag,
// a flick, the wheel and the arrow keys all ease and settle the same way.
let target = 0;
let current = 0;
let velocity = 0;
let settled = true;
let frame = null;
let drag = null;
let wheelTimer;
let press = { onSlide: false, moved: 0 };

const closeIcon = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"
    stroke-linecap="round" aria-hidden="true"><path d="m4.5 4.5 11 11M15.5 4.5l-11 11" /></svg>`;

function build() {
    if (dialog) return;

    dialog = document.createElement('dialog');
    dialog.className = 'wander-modal';
    dialog.innerHTML = `
        <header class="wander-modal__head">
            <h2 class="wander-modal__title"></h2>
            <button type="button" class="wander-modal__close" aria-label="Close photos">${closeIcon}</button>
        </header>
        <div class="wander-modal__rail"></div>`;
    document.body.appendChild(dialog);

    rail = dialog.querySelector('.wander-modal__rail');
    title = dialog.querySelector('.wander-modal__title');

    dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
    dialog.querySelector('.wander-modal__close').addEventListener('click', close);
    // Anywhere that is not a slide is the backdrop. The rail holds the
    // pointer while pressed, so whether a press began on a slide — and
    // whether it was really a drag — is noted then rather than read from
    // the click, which always lands on the rail.
    dialog.addEventListener('click', (e) => {
        if (e.target.closest('.wander-modal__close')) return;
        if (rail.contains(e.target) && (press.onSlide || press.moved > 4)) return;
        close();
    });

    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });

    dialog.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        if (frame === null) current = target = rail.scrollLeft;
        target += delta;
        velocity = 0;
        // Hold off settling until the wheel (or a trackpad's momentum) stops.
        settled = true;
        clearTimeout(wheelTimer);
        wheelTimer = setTimeout(() => { settled = false; run(); }, 140);
        run();
    }, { passive: false });

    rail.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        drag = { id: e.pointerId, startX: e.clientX, lastX: e.clientX, from: rail.scrollLeft };
        press = { onSlide: !!e.target.closest('.wander-slide'), moved: 0 };
        current = target = rail.scrollLeft;
        velocity = 0;
        settled = false;
        rail.dataset.dragging = 'true';
        rail.setPointerCapture(e.pointerId);
        run();
    });
    rail.addEventListener('pointermove', (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        target = drag.from - (e.clientX - drag.startX);
        velocity = drag.lastX - e.clientX;
        drag.lastX = e.clientX;
        press.moved = Math.max(press.moved, Math.abs(e.clientX - drag.startX));
    });
    const release = (e) => {
        if (!drag || drag.id !== e.pointerId) return;
        if (rail.hasPointerCapture(e.pointerId)) rail.releasePointerCapture(e.pointerId);
        delete rail.dataset.dragging;
        drag = null;
        // Carry the flick on past the hand, then let it slow and settle.
        velocity *= 2.16;
        settled = false;
        run();
    };
    rail.addEventListener('pointerup', release);
    rail.addEventListener('pointercancel', release);
}

/** One slide's width plus the gap after it. */
function pitch() {
    const [a, b] = rail.querySelectorAll('.wander-slide');
    return a && b ? b.offsetLeft - a.offsetLeft : 0;
}

/**
 * Three copies of the place sit side by side and the view is kept in the
 * middle one: drift past either edge and it jumps a whole copy back, which
 * looks like nothing at all.
 */
function wrap() {
    const width = cycles[1].offsetLeft - cycles[0].offsetLeft;
    if (width <= 0) return 0;
    let shift = 0;
    if (rail.scrollLeft < 0.5 * width) shift = width;
    else if (rail.scrollLeft > 1.5 * width) shift = -width;
    if (shift) {
        rail.scrollLeft += shift;
        if (drag) drag.from += shift;
    }
    return shift;
}

/**
 * Each copy opens with an empty lead the width of the margin, so the place
 * starts beside its title rather than mid-loop. Once every lead is out of
 * sight they are dropped, and the loop closes up without a seam.
 */
function collapse() {
    if (rail.dataset.gaps === 'collapsed') return 0;
    const gaps = [...rail.querySelectorAll('.wander-modal__lead')];
    const seen = gaps.some((gap) => {
        const r = gap.getBoundingClientRect();
        return r.right > 0 && r.left < window.innerWidth;
    });
    if (!gaps[0]?.getBoundingClientRect().width || seen) return 0;

    const slides = [...rail.querySelectorAll('.wander-slide')];
    const anchor = slides.find((s) => s.getBoundingClientRect().right > 0) || slides[0];
    const before = anchor.getBoundingClientRect().left;
    rail.dataset.gaps = 'collapsed';
    const shift = before - anchor.getBoundingClientRect().left;
    rail.scrollLeft -= shift;
    return shift;
}

/** Where the rail would rest with the slide nearest the title aligned to it. */
function nearest() {
    const edge = title.getBoundingClientRect().left;
    let best = Infinity;
    rail.querySelectorAll('.wander-slide').forEach((slide) => {
        const d = slide.getBoundingClientRect().left - edge;
        if (Math.abs(d) < Math.abs(best)) best = d;
    });
    return Number.isFinite(best) ? current + best : current;
}

function tick() {
    if (!drag) {
        target += velocity;
        velocity *= 0.93;
        if (!settled && Math.abs(velocity) < 0.6) {
            velocity = 0;
            target = nearest();
            settled = true;
        }
    }

    const gap = collapse();
    current -= gap;
    target -= gap;

    const d = target - current;
    current += d * (drag ? 0.55 : 0.18);
    rail.scrollLeft = current;

    const shift = wrap();
    current += shift;
    target += shift;

    if (!drag && settled && Math.abs(d) < 0.25) {
        current = target;
        rail.scrollLeft = target;
        frame = null;
        return;
    }
    frame = requestAnimationFrame(tick);
}

function run() {
    if (frame === null) frame = requestAnimationFrame(tick);
}

function step(direction) {
    if (frame === null) current = target = rail.scrollLeft;
    velocity = 0;
    settled = true;
    target = nearest() + direction * pitch();
    run();
}

/* ── Opening and closing ─────────────────────────────────── */

function slidesHTML(photos, start) {
    const n = photos.length;
    const repeat = Math.max(1, Math.ceil(MIN_CYCLE / n));
    // Every copy starts at the photo that was chosen, so the loop still
    // reads in order and the chosen one leads.
    const order = Array.from({ length: n * repeat }, (_, k) => (start + k) % n);
    return [0, 1, 2].map((c) => `<div class="wander-modal__cycle"${c === 1 ? '' : ' aria-hidden="true"'}>
            <span class="wander-modal__lead" aria-hidden="true"></span>
            ${order.map((i, k) => `<figure class="wander-slide"${c === 1 && k < n ? ` data-photo="${i}"` : ''}>
                <img src="${escape(sized(photos[i], 1400))}"${focus(photos[i])} alt="${c === 1 && k < n ? escape(photos[i].alt || '') : ''}"
                    draggable="false" decoding="async" loading="${c === 1 ? 'eager' : 'lazy'}" />
            </figure>`).join('')}
        </div>`).join('');
}

function forget() {
    running.forEach((a) => a.cancel());
    running = [];
    timers.forEach(clearTimeout);
    timers = [];
}

function open(g, start) {
    const { place, photos } = places[g];
    if (!photos?.length) return;
    build();
    forget();
    spotlight(null);
    closing = false;

    title.textContent = place;
    dialog.setAttribute('aria-label', `${place}, ${photos.length} photos`);
    rail.innerHTML = slidesHTML(photos, start);
    delete rail.dataset.gaps;
    cycles = [...rail.querySelectorAll('.wander-modal__cycle')];

    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.dataset.state = 'opening';
    dialog.showModal();
    dialog.querySelector('.wander-modal__close').focus({ preventScroll: true });

    rail.scrollLeft = cycles[1].offsetLeft;
    current = target = rail.scrollLeft;
    velocity = 0;
    settled = true;

    travel(g, start);
}

/**
 * The plates on the chosen plate's row travel into their slides; scaled and
 * offset so each starts exactly over its plate, then let go. Plates on other
 * rows would have to cross the wall to get there, so their slides fade in
 * once the travellers have landed, nearest first.
 */
function travel(g, start) {
    const timing = wide.matches ? TIMING.wide : TIMING.compact;
    dialog.style.setProperty('--wander-duration', `${timing.travel}ms`);

    const frameFor = (i) => wall?.querySelector(`.wander-frame[data-group="${g}"][data-photo="${i}"]`);
    const lead = frameFor(start);
    const leadTop = lead?.getBoundingClientRect().top;

    const pairs = [...cycles[1].querySelectorAll('[data-photo]')].flatMap((slide) => {
        const from = frameFor(Number(slide.dataset.photo));
        const r = from?.getBoundingClientRect();
        return r && r.width > 0 && Math.abs(r.top - leadTop) <= 2 ? [{ slide, from }] : [];
    });

    if (still.matches || !pairs.length) {
        dialog.dataset.state = 'open';
        return;
    }

    const travellers = new Set(pairs.map((p) => p.slide));
    const rest = [...rail.querySelectorAll('.wander-slide')].filter((s) => !travellers.has(s));
    rest.forEach((s) => { s.style.opacity = '0'; });

    // Measured before anything moves, then set all at once.
    const moves = pairs.map(({ slide, from }) => {
        const a = from.getBoundingClientRect();
        const b = slide.getBoundingClientRect();
        const x = a.left + a.width / 2 - (b.left + b.width / 2);
        const y = a.top + a.height / 2 - (b.top + b.height / 2);
        return { slide, from, transform: `translate(${x}px, ${y}px) scale(${a.width / b.width})` };
    });

    const last = Math.max(moves.length - 1, 0);
    const gap = last ? timing.cascade / last : 0;

    dialog.style.visibility = 'hidden';
    const ready = moves.map(({ slide }) => slide.querySelector('img').decode().catch(() => {}));

    Promise.all(ready).then(() => {
        if (closing || !dialog.open) return;
        moves.forEach(({ slide, from, transform }, k) => {
            slide.style.transform = transform;
            slide.style.zIndex = String(40 - k);
            if (k) slide.style.opacity = '0';
            from.style.visibility = 'hidden';
            hiddenFrames.push(from);
        });
        dialog.style.removeProperty('visibility');

        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (closing) return;
            moves.forEach(({ slide, transform }, k) => {
                const delay = k * gap;
                const move = slide.animate(
                    [{ transform }, { transform: 'none' }],
                    { delay, duration: timing.travel, easing: EASE, fill: 'both' },
                );
                move.onfinish = () => {
                    slide.style.removeProperty('transform');
                    slide.style.removeProperty('z-index');
                };
                running.push(move);
                if (!k) return;
                const show = slide.animate(
                    [{ opacity: 0 }, { opacity: 1 }],
                    { delay, duration: timing.appear, easing: EASE, fill: 'both' },
                );
                show.onfinish = () => slide.style.removeProperty('opacity');
                running.push(show);
            });

            timers.push(setTimeout(() => {
                if (closing) return;
                const edge = moves[0].slide.getBoundingClientRect().left;
                const queue = rest
                    .map((slide) => ({ slide, d: Math.abs(slide.getBoundingClientRect().left - edge) }))
                    .sort((a, b) => a.d - b.d);
                const each = queue.length > 1 ? timing.cascade / (queue.length - 1) : 0;
                queue.forEach(({ slide }, k) => {
                    const show = slide.animate(
                        [{ opacity: 0 }, { opacity: 1 }],
                        { delay: k * each, duration: timing.appear, easing: EASE, fill: 'both' },
                    );
                    show.onfinish = () => slide.style.removeProperty('opacity');
                    running.push(show);
                });
                dialog.dataset.state = 'open';
            }, timing.travel + last * gap));
        }));
    });
}

function close() {
    if (!dialog?.open || closing) return;
    closing = true;
    clearTimeout(wheelTimer);
    dialog.dataset.state = 'closing';

    const done = () => {
        forget();
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
        drag = null;
        hiddenFrames.forEach((f) => f.style.removeProperty('visibility'));
        hiddenFrames = [];
        dialog.style.removeProperty('visibility');
        document.body.style.overflow = previousOverflow;
        dialog.close();
        rail.innerHTML = '';
        closing = false;
    };
    if (still.matches) done();
    else timers.push(setTimeout(done, CLOSE_MS));
}
