/**
 * Compact bottom menu shared by the home and project pages.
 *
 * `/` focuses it from anywhere, Escape closes it, arrows and Enter pick a
 * result. Targets are the page's own sections plus the work items, so one
 * keystroke reaches anything on the site.
 */

import { experienceItems } from './experience.js';
import { cases } from '../../data/cases.js';

const PAGES = [
    { label: 'Experience', kind: 'section', href: '#experience' },
    { label: 'Work', kind: 'section', href: '#work' },
    { label: 'Writing', kind: 'section', href: '#writing' },
    { label: 'Archive', kind: 'section', href: '#archive' },
    { label: 'About', kind: 'page', href: '/profile' },
    { label: 'All archive', kind: 'page', href: 'feeds.html' },
    { label: 'All writing', kind: 'page', href: 'insights.html' },
    { label: 'CV', kind: 'page', href: '/assets/cv.pdf' },
    { label: 'Version 1 of this site', kind: 'page', href: 'v1.html' },
];

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
    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'dock-launcher';
    launcher.setAttribute('data-dock-open', '');
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.setAttribute('aria-controls', 'dock');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = `${searchIcon}<span>Jump to…</span><kbd>/</kbd>`;
    document.body.appendChild(launcher);
    const input = dock.querySelector('input');
    const results = dock.querySelector('#dock-results');
    const triggers = document.querySelectorAll('[data-dock-open]');
    const onHome = location.pathname === '/' || location.pathname === '/index.html';
    const targets = cases.map(c => ({ label: c.name, kind: 'case', href: `/work/${c.slug}` }))
        .concat(PAGES.map(t => ({ ...t, href: t.href.startsWith('#') ? (onHome ? t.href : '/' + t.href) : '/' + t.href.replace(/^\//, '') })))
        .concat(experienceItems.map(e => ({ label: e.company, href: e.url, kind: 'role' })));
    let active = 0;
    let matches = [];
    let previousFocus;
    let previousOverflow = '';

    function highlight() {
        const links = results.querySelectorAll('a');
        links.forEach((link, i) => link.classList.toggle('is-selected', i === active));
        links[active]?.scrollIntoView({ block: 'nearest' });
    }

    function render() {
        const query = input.value.trim().toLowerCase();
        matches = targets.filter(t => t.label.toLowerCase().includes(query));
        active = 0;
        results.replaceChildren();
        matches.forEach((target, index) => {
            const link = document.createElement('a');
            link.href = target.href;
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
        launcher.hidden = true;
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
        launcher.hidden = false;
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
        const slash = e.key === '/' && !editing && !e.metaKey && !e.ctrlKey && !e.altKey;
        const commandK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
        if (!slash && !commandK) return;
        e.preventDefault();
        if (dock.open) close(); else open();
    });
}
