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

function galleryImages(project) {
    return [...new Set([project.hero, ...project.blocks
        .flatMap(block => block.type === 'image' ? [block.src]
            : block.type === 'pair' ? block.images.map(image => image.src) : [])]
        .filter(Boolean))].slice(0, 3);
}

// Avoid repeating the previous visit's image.
function projectCover(project) {
    const images = galleryImages(project);
    if (!images.length) return project.cover;
    const key = `project-cover:${project.slug}`;
    let previous;
    try { previous = sessionStorage.getItem(key); } catch (_) {}
    const choices = images.filter(src => src !== previous);
    const pool = choices.length ? choices : images;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    try { sessionStorage.setItem(key, selected); } catch (_) {}
    return selected;
}

export function renderWork(mount, { shuffleCovers = false } = {}) {
    if (!mount) return;

    mount.innerHTML = cases
        .map((c) => `<li>
            <a class="case-card" href="/work/${c.slug}">
                <span class="case-card__art">
                    <img src="/${escape(shuffleCovers ? projectCover(c) : c.cover)}" alt="" aria-hidden="true" loading="lazy"
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

    // Fall back to the project's original cover if a gallery asset fails.
    mount.querySelectorAll('img').forEach((image, index) => {
        image.addEventListener('error', () => {
            image.src = `/${cases[index].cover}`;
        }, { once: true });
    });

    if (shuffleCovers) rotateCovers(mount);

    const count = document.querySelector('[data-count="work"]');
    if (count) count.textContent = String(cases.length);
}

// One visible cover changes at a time. Decode first so slow connections
// keep the current artwork in place throughout the directional wipe.
function rotateCovers(mount) {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = motion.matches;
    let cursor = 0;
    let timer;
    let busy = false;
    let transitionIndex = 0;
    motion.addEventListener('change', () => { paused = motion.matches; });

    async function advance() {
        if (paused || busy || document.hidden || document.querySelector('dialog[open]')) return;
        const cards = [...mount.querySelectorAll('.case-card')];
        const candidates = cards.filter(card => {
            const rect = card.querySelector('.case-card__art').getBoundingClientRect();
            return rect.top < innerHeight && rect.bottom > 0 &&
                !card.matches(':hover, :focus-within');
        });
        if (!candidates.length) return;
        const card = candidates[cursor++ % candidates.length];
        const image = card.querySelector('img');
        const project = cases[cards.indexOf(card)];
        const choices = galleryImages(project).filter(src => `/${src}` !== image.getAttribute('src'));
        if (!choices.length) return;
        busy = true;
        const next = new Image();
        next.alt = '';
        next.setAttribute('aria-hidden', 'true');
        next.className = 'case-card__next';
        next.src = `/${choices[Math.floor(Math.random() * choices.length)]}`;
        let outgoing;
        let incoming;
        try {
            await next.decode();
            if (paused || document.hidden || !card.isConnected ||
                card.matches(':hover, :focus-within') || document.querySelector('dialog[open]')) return;
            image.parentElement.append(next);
            if (!motion.matches) {
                // Alternate horizontal and vertical reveals, with a sharp
                // entrance and a longer settle like a motion-design reel.
                const vertical = transitionIndex++ % 2 === 1;
                const timing = { duration: 850, easing: 'cubic-bezier(0.76, 0, 0.24, 1)', fill: 'forwards' };
                incoming = next.animate([
                    { clipPath: vertical ? 'inset(100% 0 0 0)' : 'inset(0 0 0 100%)',
                        transform: vertical ? 'translateY(18%) scale(1.3)' : 'translateX(18%) scale(1.3)' },
                    { clipPath: 'inset(0 0 0 0)', transform: 'translate(0, 0) scale(1)' },
                ], timing);
                outgoing = image.animate([
                    { transform: 'translate(0, 0) scale(1)' },
                    { transform: vertical ? 'translateY(-12%) scale(0.92)' : 'translateX(-12%) scale(0.92)' },
                ], timing);
                await incoming.finished;
            }
            image.src = next.getAttribute('src');
            await image.decode();
            try { sessionStorage.setItem(`project-cover:${project.slug}`, next.getAttribute('src').slice(1)); } catch (_) {}
        } catch (_) {
            // A failed gallery image leaves the current cover intact.
        } finally {
            outgoing?.cancel();
            incoming?.cancel();
            next.remove();
            busy = false;
        }
    }
    function start() { clearInterval(timer); timer = setInterval(advance, 3200); }
    start();
    window.addEventListener('pagehide', () => clearInterval(timer));
    window.addEventListener('pageshow', start);
}
