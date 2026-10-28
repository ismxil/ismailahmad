import { withContentTransition } from './page-transition.js';
import { booksSkeleton, watchImageSkeletons } from './skeleton.js';

/**
 * Books — the Goodreads shelves, read through /api/books.
 *
 * The home page shows the first few, the ones being read now. /books shows
 * every shelf as a grid of covers with a floating filter at the foot of the
 * screen: a shelf, a sort and a topic. The choice is kept in the address, so
 * a filtered view can be shared.
 */

export const SHELVES = [
    { id: 'currently-reading', label: 'Reading' },
    { id: 'read', label: 'Read' },
    { id: 'to-read', label: 'Want to read' },
    { id: 'did-not-finish', label: 'Dropped' },
];
const shelfLabel = Object.fromEntries(SHELVES.map(s => [s.id, s.label]));

const SORTS = [
    { id: 'recent', label: 'Recent' },
    { id: 'best', label: 'Best' },
    { id: 'worst', label: 'Worst' },
    { id: 'az', label: 'A–Z' },
    { id: 'za', label: 'Z–A' },
];

// Goodreads tags that are bookkeeping rather than a subject.
const NOT_TOPICS = new Set(['might-read', 'recommended']);

const bookmark = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><path d="M4 2.75h8v10.5L8 10.5l-4 2.75z"/></svg>';
const star = '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="m8 1.8 1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z"/></svg>';
const chevron = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m4.5 10 3.5-3.5 3.5 3.5"/></svg>';

function escape(str) {
    return String(str == null ? '' : str).replace(/[&<>"]/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
}

const topicLabel = tag => tag.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** "Deep Work: Rules for Focused Success…" reads as "Deep Work" on a card. */
const shortTitle = title => title.split(/:\s| \(/)[0];

let request;
/** One request per page, shared by every caller. */
export function getBooks() {
    request ||= fetch('/api/books')
        .then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
        .then(data => (Array.isArray(data.books) ? data.books : []).map((book, order) => ({ ...book, order })));
    return request;
}

function bookHTML(book, { status = true, eager = false } = {}) {
    const loading = eager ? 'eager' : 'lazy';
    const art = book.cover
        ? `<img src="${escape(book.cover)}" alt="" loading="${loading}" decoding="async" />`
        : `<span class="book__blank">${escape(shortTitle(book.title))}</span>`;
    const stars = book.rating
        ? `<span class="book__stars" role="img" aria-label="Rated ${book.rating} out of 5">${star.repeat(book.rating)}</span>`
        : '';
    const label = status
        ? `<span class="book__status" data-shelf="${escape(book.shelf)}">${bookmark}${escape(shelfLabel[book.shelf] || book.shelf)}</span>`
        : '';
    return `<li class="book">
        <a class="book__link" href="${escape(book.url)}" target="_blank" rel="noopener" title="${escape(`${book.title} — ${book.author}`)}">
            <span class="book__cover">${art}</span>
            <span class="book__text">
                ${label}
                <span class="book__title">${escape(shortTitle(book.title))}</span>
                <span class="book__author">${escape(book.author)}</span>
                ${stars}
            </span>
        </a>
    </li>`;
}

/* ── Home ────────────────────────────────────────────────── */

const PREVIEW = 4;

/** What is being read now, topped up with the latest finished. */
export function renderBooksPreview(mount) {
    if (!mount) return;
    return withContentTransition(mount, async () => {
        mount.innerHTML = booksSkeleton(PREVIEW);
        let books = [];
        try { books = await getBooks(); } catch (err) { console.warn('[books] could not load shelves', err); }
        const shown = books.filter(b => b.shelf === 'currently-reading')
            .concat(books.filter(b => b.shelf === 'read'))
            .slice(0, PREVIEW);
        if (!shown.length) {
            mount.innerHTML = '';
            mount.closest('section')?.setAttribute('hidden', '');
            return;
        }
        mount.innerHTML = shown.map(b => bookHTML(b, { status: false })).join('');
        watchImageSkeletons(mount);
        const count = document.querySelector('[data-count="books"]');
        if (count) count.textContent = String(books.length);
    });
}

/* ── /books ──────────────────────────────────────────────── */

const compare = {
    recent: (a, b) => a.order - b.order,
    // Unrated books keep their place behind the rated ones either way.
    best: (a, b) => (b.rating || -1) - (a.rating || -1) || a.order - b.order,
    worst: (a, b) => (a.rating || 9) - (b.rating || 9) || a.order - b.order,
    az: (a, b) => a.title.localeCompare(b.title),
    za: (a, b) => b.title.localeCompare(a.title),
};

function readState() {
    const params = new URLSearchParams(location.search);
    return {
        shelf: params.get('shelf') || 'currently-reading',
        sort: compare[params.get('sort')] ? params.get('sort') : 'recent',
        topic: params.get('topic') || '',
    };
}

function writeState(state) {
    const params = new URLSearchParams();
    if (state.shelf !== 'currently-reading') params.set('shelf', state.shelf);
    if (state.sort !== 'recent') params.set('sort', state.sort);
    if (state.topic) params.set('topic', state.topic);
    const query = params.toString();
    history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}`);
}

/**
 * The floating filter: status, sort and topic each open a short menu
 * upwards, out of the way of the covers.
 */
function filterHTML(topics) {
    const statuses = [{ id: 'all', label: 'All' }, ...SHELVES.map(s => ({
        ...s, label: s.id === 'currently-reading' ? 'Currently reading' : s.label,
    }))];
    const menu = (name, label, options) => `<div class="book-filter__menu">
            <button type="button" class="book-filter__toggle" data-menu="${name}" aria-haspopup="menu" aria-label="${label}" aria-expanded="false" aria-controls="book-filter-${name}">
                <span class="book-filter__toggle-label">${label}</span><span class="book-filter__value" data-value="${name}"></span>${chevron}
            </button>
            <div class="book-filter__options" id="book-filter-${name}" role="menu" aria-label="${label}" hidden>
                <div class="book-filter__menu-title" aria-hidden="true">${label}</div>
                ${options.map(o => `<button type="button" role="menuitemradio" aria-checked="false" data-${name}="${escape(o.id)}">${escape(o.label)}</button>`).join('')}
            </div>
        </div>`;
    return `${menu('shelf', 'Status', statuses)}
        <span class="book-filter__rule" aria-hidden="true"></span>
        ${menu('sort', 'Sort', SORTS)}
        ${topics.length ? menu('topic', 'Topic', [{ id: '', label: 'Any topic' }, ...topics.map(t => ({ id: t, label: topicLabel(t) }))]) : ''}`;
}

export async function initBooksPage() {
    const grid = document.getElementById('books-grid');
    const summary = document.getElementById('books-summary');
    let books = [];
    await withContentTransition(grid, async () => {
        grid.innerHTML = booksSkeleton(12);
        try { books = await getBooks(); } catch (err) { console.warn('[books] could not load shelves', err); }
        if (!books.length) grid.innerHTML = '';
    });
    if (!books.length) {
        summary.textContent = 'The shelves could not be reached just now. Try again in a moment.';
        return;
    }

    const tally = new Map();
    books.forEach(b => b.tags.forEach(t => { if (!NOT_TOPICS.has(t)) tally.set(t, (tally.get(t) || 0) + 1); }));
    const topics = [...tally.keys()].sort((a, b) => tally.get(b) - tally.get(a) || a.localeCompare(b));

    const state = readState();
    if (state.shelf !== 'all' && !SHELVES.some(s => s.id === state.shelf)) state.shelf = 'currently-reading';
    if (!topics.includes(state.topic)) state.topic = '';

    const filter = document.createElement('nav');
    filter.className = 'book-filter';
    filter.setAttribute('aria-label', 'Filter books');
    filter.innerHTML = filterHTML(topics);
    document.body.append(filter);
    const placement = liftAboveFooter(filter, grid, summary);

    let first = true;
    function render() {
        const anchor = first ? null : placement.capture();
        const inTopic = state.topic ? books.filter(b => b.tags.includes(state.topic)) : books;
        const shown = inTopic.filter(b => state.shelf === 'all' || b.shelf === state.shelf).sort(compare[state.sort]);

        filter.querySelectorAll('[role="menuitemradio"]').forEach(option => {
            const name = ['shelf', 'sort', 'topic'].find(key => option.dataset[key] != null);
            option.setAttribute('aria-checked', String(state[name] === option.dataset[name]));
        });
        filter.querySelector('[data-value="shelf"]').textContent = state.shelf === 'all' ? 'All'
            : state.shelf === 'currently-reading' ? 'Currently reading' : shelfLabel[state.shelf];
        filter.querySelector('[data-value="sort"]').textContent = SORTS.find(s => s.id === state.sort).label;
        const topicValue = filter.querySelector('[data-value="topic"]');
        if (topicValue) topicValue.textContent = state.topic ? topicLabel(state.topic) : 'Any';
        filter.querySelectorAll('.book-filter__toggle').forEach(toggle => {
            const label = toggle.querySelector('.book-filter__toggle-label').textContent;
            const value = toggle.querySelector('.book-filter__value').textContent;
            toggle.setAttribute('aria-label', `${label}: ${value}`);
        });

        grid.innerHTML = shown.length
            ? shown.map((b, i) => bookHTML(b, { eager: i < 8 })).join('')
            : '<li class="books-empty">Nothing on this shelf for that topic.</li>';
        watchImageSkeletons(grid);
        const shelf = state.shelf === 'all' ? 'books' : `${shelfLabel[state.shelf].toLowerCase()}`;
        summary.textContent = `${shown.length} ${state.shelf === 'all' ? (shown.length === 1 ? 'book' : 'books') : shelf}${state.topic ? ` on ${topicLabel(state.topic).toLowerCase()}` : ''}.`;
        placement.restore(anchor);
        if (!first) {
            writeState(state);
            if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
                grid.animate([{ opacity: 0, transform: 'translateY(4px)' }, { opacity: 1, transform: 'none' }], { duration: 220, easing: 'ease-out' });
            }
        }
        first = false;
    }

    function closeMenus(except) {
        filter.querySelectorAll('.book-filter__toggle').forEach(toggle => {
            if (toggle === except) return;
            toggle.setAttribute('aria-expanded', 'false');
            document.getElementById(toggle.getAttribute('aria-controls')).hidden = true;
        });
    }

    filter.addEventListener('click', (e) => {
        const toggle = e.target.closest('.book-filter__toggle');
        const option = e.target.closest('[role="menuitemradio"]');
        if (toggle) {
            const open = toggle.getAttribute('aria-expanded') !== 'true';
            closeMenus(toggle);
            toggle.setAttribute('aria-expanded', String(open));
            const options = document.getElementById(toggle.getAttribute('aria-controls'));
            options.hidden = !open;
            if (open) options.querySelector('[aria-checked="true"]')?.focus({ preventScroll: true });
        } else if (option) {
            if (option.dataset.shelf != null) state.shelf = option.dataset.shelf;
            else if (option.dataset.sort != null) state.sort = option.dataset.sort;
            else state.topic = option.dataset.topic;
            const toggleFor = option.closest('.book-filter__menu').querySelector('.book-filter__toggle');
            closeMenus();
            render();
            toggleFor.focus({ preventScroll: true });
        }
    });
    filter.addEventListener('keydown', (e) => {
        const options = e.target.closest('.book-filter__options');
        if (e.key === 'Escape') {
            const toggle = e.target.closest('.book-filter__menu')?.querySelector('.book-filter__toggle');
            closeMenus();
            toggle?.focus({ preventScroll: true });
        } else if (options && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            const items = [...options.querySelectorAll('button')];
            const next = (items.indexOf(e.target) + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
            items[next].focus({ preventScroll: true });
        }
    });
    document.addEventListener('click', (e) => { if (!filter.contains(e.target)) closeMenus(); });

    render();
}

/** Float over the books, then settle above the footer rather than below it. */
function liftAboveFooter(filter, grid, summary) {
    const footer = document.querySelector('.site-footer');
    let frame = 0;
    const base = () => window.innerWidth >= 640 ? 24 : 12;
    const footerTop = () => footer?.getBoundingClientRect().top ?? window.innerHeight;
    function reserveViewport() {
        // offsetTop ignores the brief result-change transform animation.
        let top = 0;
        for (let element = grid; element; element = element.offsetParent) top += element.offsetTop;
        grid.style.setProperty('--books-grid-top', `${top}px`);
    }
    function place() {
        frame = 0;
        filter.style.setProperty('--filter-bottom', `${Math.max(base(), window.innerHeight - footerTop() + 16)}px`);
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(place); };
    addEventListener('scroll', schedule, { passive: true });
    const resize = () => { reserveViewport(); schedule(); };
    addEventListener('resize', resize);
    if ('ResizeObserver' in window) {
        const observer = new ResizeObserver(schedule);
        observer.observe(document.body);
        if (footer) observer.observe(footer);
        observer.observe(grid);
        new ResizeObserver(resize).observe(summary);
    }
    reserveViewport();
    place();
    return {
        capture() {
            const top = footerTop();
            return { footerTop: top, raised: top < window.innerHeight - base() + 16 };
        },
        restore(anchor) {
            reserveViewport();
            if (anchor?.raised) {
                // Keep the footer and controls at their current viewport position.
                window.scrollTo({ top: window.scrollY + footerTop() - anchor.footerTop, behavior: 'instant' });
            } else if (anchor && footerTop() < window.innerHeight - base() + 16) {
                // A much shorter list can clamp a deep scroll to the page end.
                // Start those new results at the top before the next paint.
                window.scrollTo({ top: 0, behavior: 'instant' });
            }
            place();
        },
    };
}
