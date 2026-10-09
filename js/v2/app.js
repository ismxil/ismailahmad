/**
 * v2 entry point — wires the home page together.
 */

import { renderExperience } from './experience.js';
import { renderWork } from './work.js';
import { renderWriting } from './writing.js';
import { renderArchive } from './archive.js';
import { initDock } from './dock.js';

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

/* ── Subscribe ───────────────────────────────────────────── */

function initSubscribe() {
    const form = document.getElementById('subscribe-form');
    const status = document.getElementById('subscribe-status');
    if (!form || !status) return;

    const input = form.querySelector('input[name="email"]');
    const button = form.querySelector('button');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = input.value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            status.textContent = 'That email does not look right.';
            input.focus();
            return;
        }

        button.disabled = true;
        status.textContent = 'Signing you up…';

        try {
            const res = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source: 'home-v2' }),
            });
            const data = await res.json().catch(() => ({}));

            if (res.ok && data.ok !== false) {
                form.reset();
                status.textContent = 'Done — check your inbox to confirm.';
            } else {
                status.textContent = data.error || 'That did not go through. Try again?';
            }
        } catch (err) {
            // The API is a Vercel function; it is absent on a plain static server
            status.textContent = 'Could not reach the server. Email me instead.';
        } finally {
            button.disabled = false;
        }
    });
}

/* ── Boot ────────────────────────────────────────────────── */

function boot() {
    initTheme();
    renderExperience(document.getElementById('experience-list'));
    renderWork(document.getElementById('work-list'));
    renderWriting(document.getElementById('writing-list'));
    renderArchive(document.getElementById('archive-grid'));
    initDock();
    initSubscribe();

    const year = document.getElementById('footer-year');
    if (year) year.textContent = String(new Date().getFullYear());
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
