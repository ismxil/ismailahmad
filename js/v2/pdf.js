import { deck, slideSrc, thumbSrc } from './pdf-deck.js';

const $ = id => document.getElementById(id);
const total = deck.slides.length;
const pad = n => String(n).padStart(2, '0');
const titleOf = n => deck.slides[n - 1].title;
const clamp = n => Math.min(Math.max(n, 1), total);

const speaker = new URLSearchParams(location.search).has('speaker');
const seen = new Set();
let page = 0;

// Every open window of the deck follows whichever one turned the page, so
// the speaker view drives an audience window on the projector.
const channel = 'BroadcastChannel' in window ? new BroadcastChannel('pdf-deck') : null;
channel?.addEventListener('message', event => {
    if (event.data?.page) go(event.data.page, { broadcast: false });
});

document.getElementById('theme-toggle').addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (error) {}
});

/* ── Reader ──────────────────────────────────────────────── */

const img = $('slide-img');
const links = $('slide-links');

const progress = deck.slides.map((slide, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', `Page ${i + 1}: ${slide.title}`);
    button.title = `${i + 1} · ${slide.title}`;
    button.addEventListener('click', () => go(i + 1));
    $('progress').append(button);
    return button;
});

const gridItems = deck.slides.map((slide, i) => {
    const item = document.createElement('li');
    item.innerHTML = `<button type="button"><img loading="lazy" alt="" width="480" height="270"><span><b>${pad(i + 1)}</b>${slide.title}</span></button>`;
    item.querySelector('img').src = thumbSrc(i + 1);
    item.querySelector('button').addEventListener('click', () => { go(i + 1); $('grid').close(); });
    $('grid-list').append(item);
    return item.querySelector('button');
});

function linkLayer(container, n) {
    container.replaceChildren(...(deck.slides[n - 1].links || []).map(link => {
        const a = document.createElement('a');
        a.href = link.href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.setAttribute('aria-label', `Open ${new URL(link.href).hostname.replace(/^www\./, '')}`);
        Object.assign(a.style, { left: `${link.x}%`, top: `${link.y}%`, width: `${link.w}%`, height: `${link.h}%` });
        return a;
    }));
}

const preloaded = new Set();
function preload(n) {
    if (n < 1 || n > total || preloaded.has(n)) return;
    preloaded.add(n);
    new Image().src = slideSrc(n);
}

async function go(n, { broadcast = true } = {}) {
    n = clamp(n);
    if (n === page) return;
    const direction = n > page ? 'is-forward' : 'is-back';
    const first = page === 0;
    page = n;
    seen.add(n);

    $('counter').textContent = `${pad(n)} / ${pad(total)}`;
    $('slide-title').textContent = titleOf(n);
    document.title = n === 1 ? 'Portfolio — Ismail Ahmad, Senior Product Designer' : `${titleOf(n)} — Ismail Ahmad`;
    $('prev').disabled = n === 1;
    $('next').disabled = n === total;
    progress.forEach((button, i) => {
        button.classList.toggle('is-seen', seen.has(i + 1));
        button.setAttribute('aria-current', String(i + 1 === n));
    });
    gridItems.forEach((button, i) => button.setAttribute('aria-current', String(i + 1 === n)));

    // The address keeps the page, so a shared link opens where it was copied.
    if (location.hash.slice(1) !== String(n)) history.replaceState(null, '', n === 1 ? location.pathname + location.search : `#${n}`);
    if (broadcast) channel?.postMessage({ page: n });

    // Swap only once the next image is decoded, so a turn never flashes empty.
    const next = new Image();
    next.src = slideSrc(n);
    await next.decode().catch(() => {});
    if (page !== n) return;
    img.src = next.src;
    img.alt = `Page ${n}: ${titleOf(n)}`;
    if (!first) {
        img.classList.remove('is-forward', 'is-back');
        void img.offsetWidth;
        img.classList.add(direction);
    }
    linkLayer(links, n);
    [n + 1, n + 2, n - 1].forEach(preload);

    if (speaker) renderSpeaker();
}

$('prev').addEventListener('click', () => go(page - 1));
$('next').addEventListener('click', () => go(page + 1));
img.addEventListener('animationend', () => img.classList.remove('is-forward', 'is-back'));

// Click the slide's right two-thirds to go on, the left third to go back.
$('slide').addEventListener('click', event => {
    if (event.target.closest('a')) return;
    const { left, width } = event.currentTarget.getBoundingClientRect();
    go(page + (event.clientX - left < width / 3 ? -1 : 1));
});

// Swipe
let touch = null;
$('stage').addEventListener('touchstart', event => {
    if (event.touches.length === 1) touch = { x: event.touches[0].clientX, y: event.touches[0].clientY };
}, { passive: true });
$('stage').addEventListener('touchend', event => {
    if (!touch) return;
    const dx = event.changedTouches[0].clientX - touch.x;
    const dy = event.changedTouches[0].clientY - touch.y;
    touch = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(page + (dx < 0 ? 1 : -1));
});

// Grid
const grid = $('grid');
function openGrid() {
    grid.showModal();
    gridItems[page - 1].scrollIntoView({ block: 'center' });
    gridItems[page - 1].focus();
}
$('grid-toggle').addEventListener('click', openGrid);
$('grid-close').addEventListener('click', () => grid.close());
grid.addEventListener('click', event => { if (event.target === grid) grid.close(); });

// Full screen, with the chrome fading once the pointer rests
const fullscreen = $('fullscreen-toggle');
if (!document.fullscreenEnabled) fullscreen.hidden = true;
const toggleFullscreen = () => document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen().catch(() => {});
fullscreen.addEventListener('click', toggleFullscreen);
let idle;
function wake() {
    document.body.classList.remove('is-idle');
    clearTimeout(idle);
    if (document.fullscreenElement && !speaker) idle = setTimeout(() => document.body.classList.add('is-idle'), 2200);
}
document.addEventListener('pointermove', wake);
document.addEventListener('fullscreenchange', wake);

document.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.target.closest('input, textarea, [contenteditable]')) {
        if (event.key === 'Escape') event.target.blur();
        return;
    }
    const key = event.key;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(key) && !grid.open) {
        if ((key === 'Enter' || key === ' ') && event.target.closest('button, a, label')) return;
        go(page + (event.shiftKey && key === ' ' ? -1 : 1));
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(key) && !grid.open) go(page - 1);
    else if (key === 'Home') go(1);
    else if (key === 'End') go(total);
    else if (key === 'g' || key === 'G') grid.open ? grid.close() : openGrid();
    else if (key === 'f' || key === 'F') toggleFullscreen();
    else if ((key === 's' || key === 'S') && !speaker) openSpeaker();
    else return;
    event.preventDefault();
    wake();
});

window.addEventListener('hashchange', () => go(Number(location.hash.slice(1)) || 1));

/* ── Upright phones: every page in one column ────────────── */

const column = window.matchMedia('(max-width: 700px) and (orientation: portrait)');
let columnBuilt = false;
function buildColumn() {
    if (columnBuilt || !column.matches || speaker) return;
    columnBuilt = true;
    const watcher = new IntersectionObserver(entries => {
        for (const entry of entries) {
            if (entry.isIntersecting) go(Number(entry.target.dataset.page), { broadcast: false });
        }
    }, { rootMargin: '-45% 0px -45% 0px' });
    deck.slides.forEach((slide, i) => {
        const figure = document.createElement('figure');
        figure.className = 'pdf-slide';
        figure.dataset.page = i + 1;
        figure.innerHTML = '<img loading="lazy" width="2560" height="1440"><div class="pdf-slide__links"></div>';
        const image = figure.querySelector('img');
        image.src = slideSrc(i + 1);
        image.alt = `Page ${i + 1}: ${slide.title}`;
        linkLayer(figure.querySelector('.pdf-slide__links'), i + 1);
        $('scroll').append(figure);
        watcher.observe(figure);
    });
    if (page > 1) $('scroll').children[page - 1].scrollIntoView();
}
column.addEventListener('change', buildColumn);

/* ── Speaker view ────────────────────────────────────────── */
// Notes are written in the speaker view and kept in this browser only, so
// visitors never see them. Export/Import moves them between machines.

const NOTES_KEY = 'pdf-notes';
const readNotes = () => { try { return JSON.parse(localStorage.getItem(NOTES_KEY)) || {}; } catch { return {}; } };
let notes = readNotes();

function openSpeaker() {
    window.open(`${location.pathname}?speaker#${page}`, 'pdf-speaker', 'popup,width=1280,height=800');
}

function renderSpeaker() {
    $('sp-now').src = slideSrc(page);
    $('sp-now').alt = `Page ${page}: ${titleOf(page)}`;
    $('sp-now-title').textContent = titleOf(page);
    $('sp-counter').textContent = `${pad(page)} / ${pad(total)}`;
    const hasNext = page < total;
    $('sp-next-img').src = hasNext ? slideSrc(page + 1) : slideSrc(page);
    $('sp-next-img').style.opacity = hasNext ? '' : '0.3';
    $('sp-next-title').textContent = hasNext ? titleOf(page + 1) : 'End of deck';
    $('sp-prev').disabled = page === 1;
    $('sp-next').disabled = page === total;
    if (document.activeElement !== $('sp-notes') || $('sp-notes').dataset.page !== String(page)) {
        $('sp-notes').value = notes[page] || '';
        $('sp-notes').dataset.page = page;
    }
    $('sp-saved').textContent = '';
}

if (speaker) {
    document.body.classList.add('is-speaker');
    $('speaker').hidden = false;
    $('stage').setAttribute('aria-hidden', 'true');

    $('sp-prev').addEventListener('click', () => go(page - 1));
    $('sp-next').addEventListener('click', () => go(page + 1));
    $('sp-now').closest('.pdf-slide').addEventListener('click', () => go(page + 1));
    $('sp-next-img').closest('.pdf-slide').addEventListener('click', () => go(page + 1));
    $('sp-audience').addEventListener('click', () => window.open(`${location.pathname}#${page}`, 'pdf-audience'));

    let saving;
    $('sp-notes').addEventListener('input', event => {
        const n = Number(event.target.dataset.page);
        const text = event.target.value;
        if (text.trim()) notes[n] = text; else delete notes[n];
        clearTimeout(saving);
        saving = setTimeout(() => {
            try {
                localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
                $('sp-saved').textContent = '· saved on this device';
            } catch (error) {
                $('sp-saved').textContent = '· could not save';
            }
        }, 300);
    });
    // Another speaker window editing notes keeps this one current.
    window.addEventListener('storage', event => {
        if (event.key !== NOTES_KEY) return;
        notes = readNotes();
        if (document.activeElement !== $('sp-notes')) $('sp-notes').value = notes[page] || '';
    });

    $('sp-export').addEventListener('click', () => {
        const titled = Object.fromEntries(Object.entries(notes).map(([n, text]) => [n, { title: titleOf(Number(n)), notes: text }]));
        const file = new Blob([JSON.stringify(titled, null, 2)], { type: 'application/json' });
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(file), download: 'portfolio-speaker-notes.json' });
        a.click();
        URL.revokeObjectURL(a.href);
    });
    $('sp-import').addEventListener('change', async event => {
        const [file] = event.target.files;
        if (!file) return;
        try {
            const imported = JSON.parse(await file.text());
            for (const [n, value] of Object.entries(imported)) {
                const text = typeof value === 'string' ? value : value?.notes;
                if (Number(n) >= 1 && Number(n) <= total && text) notes[n] = text;
            }
            localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
            $('sp-notes').value = notes[page] || '';
            $('sp-saved').textContent = '· notes imported';
        } catch (error) {
            $('sp-saved').textContent = '· that file is not a notes export';
        }
        event.target.value = '';
    });

    // Timer and clock
    let started = null;
    let banked = 0;
    const elapsed = () => banked + (started ? Date.now() - started : 0);
    const mmss = ms => { const s = Math.floor(ms / 1000); return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; };
    const tick = () => {
        $('sp-timer').textContent = mmss(elapsed());
        $('sp-clock').textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };
    $('sp-timer-toggle').addEventListener('click', event => {
        if (started) { banked = elapsed(); started = null; event.target.textContent = 'Resume'; }
        else { started = Date.now(); event.target.textContent = 'Pause'; }
        tick();
    });
    $('sp-timer-reset').addEventListener('click', () => {
        started = null; banked = 0;
        $('sp-timer-toggle').textContent = 'Start';
        tick();
    });
    tick();
    setInterval(tick, 1000);
}

go(Number(location.hash.slice(1)) || 1, { broadcast: false });
buildColumn();
