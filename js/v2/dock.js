/**
 * Jump dock — the fixed pill at the bottom of the page.
 *
 * `/` focuses it from anywhere, Escape closes it, arrows and Enter pick a
 * result. Targets are the page's own sections plus the work items, so one
 * keystroke reaches anything on the site.
 */

import { experienceItems } from './experience.js';

const PAGES = [
    { label: 'Experience', kind: 'section', href: '#experience' },
    { label: 'Work', kind: 'section', href: '#work' },
    { label: 'Writing', kind: 'section', href: '#writing' },
    { label: 'Clients', kind: 'section', href: '#clients' },
    { label: 'Stay in touch', kind: 'section', href: '#contact' },
    { label: 'About', kind: 'page', href: 'about.html' },
    { label: 'All work', kind: 'page', href: 'feeds.html' },
    { label: 'All writing', kind: 'page', href: 'insights.html' },
    { label: 'CV', kind: 'page', href: '/profile' },
    { label: 'Version 1 of this site', kind: 'page', href: 'v1.html' },
];

export function initDock() {
    const dock = document.getElementById('dock');
    const input = document.getElementById('dock-input');
    const results = document.getElementById('dock-results');
    if (!dock || !input || !results) return;

    const targets = PAGES.concat(
        experienceItems.map((e) => ({ label: e.company, kind: 'role', href: e.url }))
    );

    let active = 0;
    let matches = [];

    function render(query) {
        const q = query.trim().toLowerCase();
        matches = q
            ? targets.filter((t) => t.label.toLowerCase().includes(q))
            : targets;

        if (active >= matches.length) active = 0;

        if (!matches.length) {
            results.innerHTML = '<li class="dock__empty">Nothing matches that.</li>';
            return;
        }

        results.innerHTML = matches
            .map((t, i) => `<li aria-selected="${i === active}">
                <a href="${t.href}" data-index="${i}">
                    <span>${t.label}</span>
                    <span class="dock__kind">${t.kind}</span>
                </a>
            </li>`)
            .join('');
    }

    function open() {
        dock.classList.add('dock--open');
        render(input.value);
        input.focus();
    }

    function close() {
        dock.classList.remove('dock--open');
        input.value = '';
        input.blur();
        active = 0;
    }

    function go(index) {
        const target = matches[index];
        if (!target) return;
        close();
        if (target.href.startsWith('#')) {
            const el = document.querySelector(target.href);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', target.href);
        } else {
            window.location.href = target.href;
        }
    }

    input.addEventListener('focus', open);
    input.addEventListener('input', () => render(input.value));

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            close();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            active = Math.min(active + 1, matches.length - 1);
            render(input.value);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            active = Math.max(active - 1, 0);
            render(input.value);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            go(active);
        }
    });

    results.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-index]');
        if (!link) return;
        e.preventDefault();
        go(Number(link.dataset.index));
    });

    document.querySelectorAll('[data-dock-open]').forEach((btn) => {
        btn.addEventListener('click', open);
    });

    // `/` is a shortcut only when the user is not already typing somewhere
    document.addEventListener('keydown', (e) => {
        if (e.key !== '/' || e.metaKey || e.ctrlKey || e.altKey) return;
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
        e.preventDefault();
        open();
    });

    // Clicking away dismisses, but only while the panel is actually open
    document.addEventListener('click', (e) => {
        if (!dock.classList.contains('dock--open')) return;
        if (!dock.contains(e.target) && !e.target.closest('[data-dock-open]')) close();
    });
}
