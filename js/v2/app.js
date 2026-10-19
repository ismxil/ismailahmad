/**
 * v2 entry point — wires the home page together.
 */

import { renderProjects } from './projects.js';
import { renderWork } from './work.js';
import { renderBlogPreview } from './blog-preview.js';
import { renderArchive } from './archive.js';
import { initBookingModal } from './booking-modal.js';
import { initContactCard } from './contact-card.js';
import { initPresence } from './presence.js';
import { initDock } from './dock.js';
import { initPageSearch } from './page-search.js';
import { initChipStacks } from './chip-stack.js';

/* ── Theme ───────────────────────────────────────────────── */

function initTheme() {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const dark = document.documentElement.classList.toggle('dark');
        try {
            localStorage.setItem('theme', dark ? 'dark' : 'light');
        } catch (e) {
            /* private mode — the class still applies for this session */
        }
    });
}

/* ── Boot ────────────────────────────────────────────────── */

async function boot() {
    initTheme();
    initChipStacks();
    renderProjects(document.getElementById('personal-list'));
    initContactCard();
    initBookingModal();
    initPresence();
    initDock();

    // Blog and archive arrive over the network; wait for them so the
    // page search indexes the entries rather than empty lists.
    await Promise.allSettled([
        renderWork(document.getElementById('work-list'), { shuffleCovers: true }),
        renderBlogPreview(document.getElementById('blog-list')),
        renderArchive(document.getElementById('archive-grid')),
    ]);
    initPageSearch();

    const year = document.getElementById('footer-year');
    if (year) year.textContent = String(new Date().getFullYear());
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
