/**
 * Page search, opened with "/". The page's floating pill is Talk to me.
 *
 * Searches only what is on the page you are looking at: a case page offers
 * its own sections, the home page its sections and the work, experience
 * and writing entries inside them, an index page its list. The site-wide
 * menu in the header is the other half of the pair, opened with ⌘K.
 *
 * The index is read from the rendered DOM rather than declared per page,
 * so a page that gains content gains search entries with it.
 */

function slugify(text, index) {
    const base = String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `search-${base || 'item'}-${index}`;
}

/** Scroll targets: the landmarks of the page, in document order. */
function collectSections(targets) {
    const intro = document.querySelector('.case-intro');
    if (intro) {
        intro.id ||= 'search-overview';
        targets.push({ label: 'Overview', kind: 'section', id: intro.id });
    }

    const meta = document.querySelector('.case-meta');
    if (meta) {
        meta.id ||= 'search-details';
        targets.push({ label: 'Details', kind: 'section', id: meta.id });
    }

    document.querySelectorAll('.section__title, .case-body .case-block__title')
        .forEach((heading, i) => {
            const label = heading.textContent.trim();
            if (!label) return;
            // On the home page the heading sits inside the section, so jump
            // to the section itself and the heading comes with it.
            const anchor = heading.closest('.section') || heading;
            anchor.id ||= slugify(label, i);
            targets.push({ label, kind: 'section', id: anchor.id });
        });
}

/** Link targets: the actual entries a page lists. */
function collectEntries(targets) {
    const sources = [
        ['.case-card', '.case-card__title', 'case'],
        ['#personal-list .row', '.row__title', 'project'],
        ['#blog-list .lede', '.lede__title', 'blog'],
        ['.blog-list a', 'h2', 'blog'],
    ];

    for (const [itemSelector, labelSelector, kind] of sources) {
        document.querySelectorAll(itemSelector).forEach((el) => {
            const link = el.matches('a') ? el : el.querySelector('a');
            const label = (el.querySelector(labelSelector)?.textContent || '').trim();
            const href = link?.getAttribute('href');
            if (!label || !href) return;
            targets.push({ label, kind, href });
        });
    }
}

function collectTargets() {
    const targets = [];
    collectSections(targets);
    collectEntries(targets);

    // Two sections rendering the same heading would otherwise both appear
    const seen = new Set();
    return targets.filter((t) => {
        const key = `${t.kind}:${t.label}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

import { bindBookingTrigger } from './booking-modal.js';

export function initPageSearch() {
    const targets = collectTargets();
    // Nothing worth searching on a page with one thing on it
    if (targets.length < 2) return;

    const icon = `<svg class="dock__mark" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7" /><path d="m16.5 16.5 4 4" /></svg>`;

    const dialog = document.createElement('dialog');
    dialog.className = 'command-menu';
    dialog.id = 'page-search';
    dialog.setAttribute('aria-label', 'Search this page');
    dialog.tabIndex = -1;
    dialog.innerHTML = `<div class="command-menu__bar">${icon}
        <input id="page-search-input" type="search" placeholder="Search this page…"
            aria-label="Search this page" autocomplete="off" spellcheck="false" />
        <button type="button" data-menu-close aria-label="Close"><kbd>esc</kbd></button>
        </div><div class="command-menu__results" id="page-search-results"></div>`;
    document.body.appendChild(dialog);

    // The floating pill is an invitation to talk; search stays on "/".
    const talk = document.createElement('a');
    talk.className = 'talk-pill';
    talk.href = 'https://cal.com/ismxil/intro30min';
    talk.innerHTML = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17,8v-1c0-1.6569-1.3431-3-3-3H6c-1.6569,0-3,1.3431-3,3v1h14Z" fill="currentColor" stroke="none"/><path d="M6 4V2M14 4V2M14 17v-6M11 14h6"/><path d="m17,9.2395v-2.2395c0-1.6569-1.3431-3-3-3H6c-1.6569,0-3,1.3431-3,3v6c0,1.6569,1.3431,3,3,3h2.1492"/></svg><span>Talk to me</span>`;
    bindBookingTrigger(talk);
    const float = document.createElement('div');
    float.className = 'dock-float';
    float.append(talk);
    // Reserve its landing space above the footer; float over the viewport elsewhere.
    const footer = document.querySelector('.site-footer');
    let slot = document.querySelector('[data-page-search-slot]');
    if (!slot) {
        slot = document.createElement('div');
        slot.className = 'page-search-slot';
        slot.setAttribute('data-page-search-slot', '');
    }
    if (footer) footer.before(slot);
    else if (!slot.isConnected) (document.querySelector('.shell') || document.body).append(slot);
    document.body.appendChild(float);

    // As the copyright enters the viewport, lift the pill above it.
    // Keep the pill outside the shell so page animations cannot trap fixed positioning.
    let positionFrame = 0;
    function positionPill() {
        positionFrame = 0;
        const base = window.innerWidth >= 640 ? 24 : 16;
        const footerTop = footer?.getBoundingClientRect().top ?? window.innerHeight;
        float.style.setProperty('--search-bottom', `${Math.max(base, window.innerHeight - footerTop + 16)}px`);
    }
    function schedulePosition() {
        if (!positionFrame) positionFrame = window.requestAnimationFrame(positionPill);
    }
    window.addEventListener('scroll', schedulePosition, { passive: true });
    window.addEventListener('resize', schedulePosition);
    if ('ResizeObserver' in window) {
        const observer = new window.ResizeObserver(schedulePosition);
        observer.observe(document.body);
        if (footer) observer.observe(footer);
    }
    positionPill();

    const input = dialog.querySelector('input');
    const results = dialog.querySelector('#page-search-results');
    let matches = [];
    let active = 0;
    let previousFocus;
    let previousOverflow = '';

    function highlight() {
        const links = results.querySelectorAll('a');
        links.forEach((link, i) => link.classList.toggle('is-selected', i === active));
        links[active]?.scrollIntoView({ block: 'nearest' });
    }

    function render() {
        const query = input.value.trim().toLowerCase();
        matches = targets.filter((t) => t.label.toLowerCase().includes(query));
        active = 0;
        results.replaceChildren();
        matches.forEach((target, index) => {
            const link = document.createElement('a');
            link.href = target.href || `#${target.id}`;
            link.dataset.index = String(index);
            const label = document.createElement('span');
            label.textContent = target.label;
            const kind = document.createElement('span');
            kind.className = 'dock__kind';
            kind.textContent = target.kind;
            link.append(label, kind);
            results.appendChild(link);
        });
        if (!matches.length) results.innerHTML = '<p class="command-menu__empty">Nothing on this page matches.</p>';
        highlight();
        results.scrollTop = 0;
    }

    // Idempotent, and called from every dismissal route — the dialog's
    // 'close' event alone does not fire reliably here.
    function release() {
        document.body.style.overflow = previousOverflow;
        float.hidden = false;
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    }

    function close() {
        release();
        if (dialog.open) dialog.close();
    }

    function open() {
        if (dialog.open) return;
        previousFocus = document.activeElement;
        previousOverflow = document.body.style.overflow;
        input.value = '';
        render();
        dialog.showModal();
        float.hidden = true;
        document.body.style.overflow = 'hidden';
        input.focus();
    }

    function go(index) {
        const target = matches[index];
        if (!target) return;
        close();
        if (target.href) {
            window.location.href = target.href;
            return;
        }
        const el = document.getElementById(target.id);
        if (!el) return;
        el.scrollIntoView({
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
            block: 'start',
        });
        history.replaceState(null, '', `#${target.id}`);
    }

    dialog.querySelector('[data-menu-close]').addEventListener('click', close);
    dialog.addEventListener('cancel', close);
    dialog.addEventListener('close', release);
    input.addEventListener('input', render);

    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (matches.length) {
                active = (active + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
            }
            highlight();
        } else if (e.key === 'Enter' && e.target === input) {
            e.preventDefault();
            go(active);
        }
    });

    results.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        e.preventDefault();
        go(Number(link.dataset.index));
    });

    dialog.addEventListener('click', (e) => {
        if (e.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        if (e.clientX < box.left || e.clientX > box.right ||
            e.clientY < box.top || e.clientY > box.bottom) close();
    });

    // "/" belongs to this page search; ⌘K opens the site-wide menu
    document.addEventListener('keydown', (e) => {
        const editing = e.target instanceof Element && (e.target.isContentEditable ||
            e.target.closest('input, textarea, select, [contenteditable], [role="textbox"]'));
        if (e.key !== '/' || editing || e.metaKey || e.ctrlKey || e.altKey) return;
        e.preventDefault();
        if (dialog.open) close(); else open();
    });
}
