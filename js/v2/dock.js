/**
 * Compact bottom menu shared by the home and project pages.
 *
 * `/` focuses it from anywhere, Escape closes it, arrows and Enter pick a
 * result. Targets are the page's own sections plus the work items, so one
 * keystroke reaches anything on the site.
 */

import { projectItems } from './projects.js';
import { getCases } from './case-data.js';

const PAGES = [
    // Navigation: where most people are headed. The sitemap follows with
    // everything else, and the cases and companies are appended to it.
    { label: 'Work', kind: 'page', href: 'work', group: 'nav' },
    { label: 'Case studies', kind: 'pdf', href: 'https://pdf.ismailahmad.com/', group: 'nav', external: true },
    { label: 'About', kind: 'page', href: 'about', group: 'nav' },
    { label: 'CV', kind: 'page', href: 'cv', group: 'nav' },
    { label: 'Blog', kind: 'page', href: 'blog', group: 'nav' },
    { label: 'Books', kind: 'page', href: 'books', group: 'nav' },
    { label: 'Archive', kind: 'page', href: 'archive' },
    { label: 'Personal', kind: 'section', href: '#personal' },
    { label: 'Version 1 of this site', kind: 'page', href: 'v1.html' },
];

const GROUPS = { nav: 'Navigation', sitemap: 'Sitemap' };

/**
 * The site-wide menu, opened by the header Menu button or "K" (⌘K works
 * too). The floating pill and "/" belong to page-search.js, which searches
 * only the page you are on.
 */
export function initDock() {
    if (document.getElementById('dock')) return;
    const dock = document.createElement('dialog');
    dock.id = 'dock';
    dock.className = 'command-menu';
    dock.setAttribute('aria-label', 'Pages and actions');
    const searchIcon = '<svg class="dock__mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m16.5 16.5 4 4"/></svg>';
    dock.innerHTML = `<div class="command-menu__bar">${searchIcon}
        <input id="dock-input" type="search" placeholder="Jump to…" aria-label="Jump to" autocomplete="off" spellcheck="false" />
        <button type="button" data-menu-close aria-label="Close menu"><kbd>esc</kbd></button>
        </div><div class="command-menu__results" id="dock-results"></div>`;
    document.body.appendChild(dock);
    const input = dock.querySelector('input');
    const results = dock.querySelector('#dock-results');
    const triggers = document.querySelectorAll('[data-dock-open]');
    const onHome = location.pathname === '/' || location.pathname === '/index.html';
    // Navigation leads; the sitemap follows. An empty query is the common
    // case, so what sits at the top is what most people act on.
    const resolve = href => href.startsWith('#') ? (onHome ? href : '/' + href)
        : /^https?:/.test(href) ? href : '/' + href.replace(/^\//, '');
    const targets = PAGES
        .map(t => ({ group: 'sitemap', ...t, href: resolve(t.href) }))
        .concat(projectItems.filter(p => p.website).map(p => ({ label: p.name, href: p.website, kind: 'project', external: true })));
    let active = 0;
    let matches = [];
    let previousFocus;
    let previousOverflow = '';
    getCases().then(cases => {
        targets.splice(PAGES.length, 0, ...cases.map(c => ({ label: c.name, kind: 'case', href: `/work/${c.slug}` })));
        if (dock.open) render();
    }).catch(() => { /* Page navigation remains available if the CMS is offline. */ });

    function highlight() {
        const links = results.querySelectorAll('a');
        links.forEach((link, i) => link.classList.toggle('is-selected', i === active));
        links[active]?.scrollIntoView({ block: 'nearest' });
    }

    function render() {
        const query = input.value.trim().toLowerCase();
        matches = Object.keys(GROUPS).flatMap(group =>
            targets.filter(t => (t.group || 'sitemap') === group && t.label.toLowerCase().includes(query)));
        active = 0;
        results.replaceChildren();
        matches.forEach((target, index) => {
            const group = target.group || 'sitemap';
            if (index === 0 || (matches[index - 1].group || 'sitemap') !== group) {
                const heading = document.createElement('p');
                heading.className = 'command-menu__group';
                heading.textContent = GROUPS[group];
                results.appendChild(heading);
            }
            const link = document.createElement('a');
            link.href = target.href;
            if (target.external) {
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            }
            link.dataset.index = String(index);
            const label = document.createElement('span');
            label.textContent = target.label;
            const kind = document.createElement('span');
            kind.className = 'dock__kind';
            kind.textContent = target.kind;
            link.append(label, kind);
            results.appendChild(link);
        });
        if (!matches.length) results.innerHTML = '<p class="command-menu__empty">No actions found.</p>';
        highlight();
        results.scrollTop = 0;
    }

    function open() {
        if (dock.open) return;
        previousFocus = document.activeElement;
        previousOverflow = document.body.style.overflow;
        input.value = '';
        render();
        dock.showModal();
        document.body.style.overflow = 'hidden';
        triggers.forEach(btn => btn.setAttribute('aria-expanded', 'true'));
        input.focus();
    }

    // release() must run on every dismissal route. Hanging it off the
    // dialog's 'close' event alone was not enough — that event does not fire
    // reliably, which left body overflow pinned to hidden (page unscrollable)
    // and the launcher hidden after the menu had gone. It is idempotent, so
    // calling it from the explicit path and the events is safe.
    function release() {
        document.body.style.overflow = previousOverflow;
        triggers.forEach(btn => btn.setAttribute('aria-expanded', 'false'));
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    }

    function close() {
        release();
        if (dock.open) dock.close();
    }

    dock.addEventListener('cancel', close);   // Escape
    dock.addEventListener('close', release);  // backstop
    dock.querySelector('[data-menu-close]').addEventListener('click', close);
    input.addEventListener('input', render);
    dock.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (matches.length) active = (active + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
            highlight();
        } else if (e.key === 'Enter' && e.target === input) {
            e.preventDefault();
            results.querySelectorAll('a')[active]?.click();
        }
    });
    results.addEventListener('click', e => {
        const link = e.target.closest('a');
        if (!link) return;
        close();
        if (link.getAttribute('href').startsWith('#')) {
            e.preventDefault();
            const target = document.querySelector(link.getAttribute('href'));
            target?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
            history.replaceState(null, '', link.getAttribute('href'));
        }
    });
    dock.addEventListener('click', e => {
        if (e.target !== dock) return;
        const box = dock.getBoundingClientRect();
        if (e.clientX < box.left || e.clientX > box.right || e.clientY < box.top || e.clientY > box.bottom) close();
    });
    triggers.forEach(btn => btn.addEventListener('click', open));
    document.addEventListener('keydown', e => {
        const editing = e.target instanceof Element && (e.target.isContentEditable || e.target.closest('input, textarea, select, [contenteditable], [role="textbox"]'));
        const plainK = e.key.toLowerCase() === 'k' && !editing && !e.metaKey && !e.ctrlKey && !e.altKey;
        const commandK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
        if (!plainK && !commandK) return;
        e.preventDefault();
        if (dock.open) close(); else open();
    });
}
