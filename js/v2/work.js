import { selectWork } from './work-selection.js';
import { withContentTransition } from './page-transition.js';
import { caseCardsSkeleton, watchImageSkeletons } from './skeleton.js';

/**
 * Work — the case studies, as cover cards that open the full case page.
 *
 * Content comes from published Sanity case studies.
 */

import { getCases, caseAsset } from './case-data.js';

const ARROW = `<svg class="case-card__arrow" viewBox="0 0 18 18" fill="none" stroke="currentColor"
    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M7.25 4.75 11.5 9l-4.25 4.25" /></svg>`;

function escape(str) {
    return String(str == null ? '' : str).replace(/[&<>"]/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
}

function galleryImages(project) {
    const selected = [...new Set((project.rotatingCovers || []).filter(Boolean))];
    return selected.length ? selected : [project.cover].filter(Boolean);
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

// A cover video stands in for the rotating images. It loops muted and only
// while on screen; reduced motion leaves it on its first frame.
const still = matchMedia('(prefers-reduced-motion: reduce)');
const playback = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
            if (isIntersecting && !still.matches) target.play().catch(() => {});
            else target.pause();
        });
    }, { rootMargin: '200px 0px' })
    : null;

function art(c, shuffleCovers) {
    if (c.coverVideo) {
        return `<video src="${escape(caseAsset(c.coverVideo))}" poster="${escape(caseAsset(c.cover))}"
                        muted loop playsinline disablepictureinpicture preload="metadata"
                        aria-hidden="true"></video>`;
    }
    return `<img src="${escape(caseAsset(shuffleCovers ? projectCover(c) : c.cover))}" alt="" aria-hidden="true" loading="lazy"
                        decoding="async" />`;
}

async function renderContent(mount, { shuffleCovers = false } = {}) {
    if (!mount) return;
    // Stand the grid up before the request, so the section has its height
    // from the first paint and the cards do not drop in under the fold.
    mount.innerHTML = caseCardsSkeleton();
    let published;
    try {
        published = await getCases();
    } catch {
        mount.innerHTML = '<li><p class="section__note">Case studies are temporarily unavailable. <a href="/work">Try again</a>.</p></li>';
        return;
    }

    const { visible: cases, total } = selectWork(published, mount.hasAttribute('data-work-preview'));
    mount.innerHTML = cases
        .map((c) => `<li>
            <a class="case-card" href="/work/${c.slug}">
                <span class="case-card__art">
                    ${art(c, shuffleCovers)}
                </span>
                <span class="case-card__text">
                    <span class="case-card__title">${escape(c.name)}${c.locked ? '<svg class="case-card__lock" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-label="Protected case study"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>' : ARROW}</span>
                    <span class="case-card__desc">${escape(c.headline)}</span>
                    <span class="case-card__meta">${escape(c.type)} · ${escape(c.years)}</span>
                </span>
            </a>
        </li>`)
        .join('') || '<li><p class="section__note">No case studies published yet.</p></li>';

    // Fall back to the project's original cover if a gallery asset fails.
    mount.querySelectorAll('.case-card').forEach((card, index) => {
        card.querySelector('img')?.addEventListener('error', (e) => {
            e.target.src = caseAsset(cases[index].cover);
        }, { once: true });
        const video = card.querySelector('video');
        if (!video) return;
        if (playback) playback.observe(video);
        else if (!still.matches) video.play().catch(() => {});
    });

    watchImageSkeletons(mount);

    if (shuffleCovers) rotateCovers(mount, cases);

    const count = document.querySelector('[data-count="work"]');
    if (count) count.textContent = String(total);
}

// One visible cover changes at a time. Decode first so slow connections
// keep the current artwork in place throughout the directional wipe.
function rotateCovers(mount, cases) {
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
            if (card.querySelector('.image-skeleton, video')) return false;
            const rect = card.querySelector('.case-card__art').getBoundingClientRect();
            return rect.top < innerHeight && rect.bottom > 0 &&
                !card.matches(':hover, :focus-within');
        });
        if (!candidates.length) return;
        const card = candidates[cursor++ % candidates.length];
        const image = card.querySelector('img');
        const project = cases[cards.indexOf(card)];
        const gallery = galleryImages(project);
        if (gallery.length < 2) return;
        const current = gallery.findIndex(src => caseAsset(src) === image.getAttribute('src'));
        const selected = gallery[(current + 1) % gallery.length];
        busy = true;
        const next = new Image();
        next.alt = '';
        next.setAttribute('aria-hidden', 'true');
        next.className = 'case-card__next';
        next.src = caseAsset(selected);
        let promoted = false;
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
                await incoming.finished;
            }
            // Keep the decoded, already-visible incoming node. Swapping the
            // old node's src here causes a second paint/decode at the handoff.
            image.remove();
            next.classList.remove('case-card__next');
            promoted = true;
            try { sessionStorage.setItem(`project-cover:${project.slug}`, selected); } catch (_) {}
        } catch (_) {
            // A failed gallery image leaves the current cover intact.
        } finally {
            incoming?.cancel();
            if (!promoted) next.remove();
            busy = false;
        }
    }
    function start() { clearInterval(timer); timer = setInterval(advance, 3200); }
    start();
    window.addEventListener('pagehide', () => clearInterval(timer));
    window.addEventListener('pageshow', start);
}

export function renderWork(mount, options) {
    return withContentTransition(mount, () => renderContent(mount, options));
}
