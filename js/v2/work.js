/**
 * Work — the case studies, as cover cards that open the full case page.
 *
 * Content comes from data/cases.js (ported from the v1 project data), not
 * from the feed, so every tile here is a real write-up rather than a shot.
 */

import { cases } from '../../data/cases.js';

const ARROW = `<svg class="case-card__arrow" viewBox="0 0 18 18" fill="none" stroke="currentColor"
    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M7.25 4.75 11.5 9l-4.25 4.25" /></svg>`;

function escape(str) {
    return String(str == null ? '' : str).replace(/[&<>"]/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
}

export function renderWork(mount) {
    if (!mount) return;

    mount.innerHTML = cases
        .map((c) => `<li>
            <a class="case-card" href="/work/${c.slug}">
                <span class="case-card__art">
                    <img src="/${escape(c.cover)}" alt="" aria-hidden="true" loading="lazy"
                        decoding="async" />
                </span>
                <span class="case-card__text">
                    <span class="case-card__title">${escape(c.name)}${ARROW}</span>
                    <span class="case-card__desc">${escape(c.headline)}</span>
                    <span class="case-card__meta">${escape(c.type)} · ${escape(c.years)}</span>
                </span>
            </a>
        </li>`)
        .join('');

    const count = document.querySelector('[data-count="work"]');
    if (count) count.textContent = String(cases.length);
}
