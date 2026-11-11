/**
 * Experiments — the playable side projects that otherwise only live at
 * their own URLs or inside a case study. A horizontal rail of tall plates,
 * scrolled natively (touch, trackpad, shift-wheel) with snap points, plus
 * previous/next buttons in the section head for mouse and keyboard users.
 */

export const experimentItems = [
    {
        name: 'Card Studio',
        caption: 'Design a Sterling bank card',
        image: '/assets/experiments/card-studio.webp',
        alt: 'Card Studio editing a red Sterling card with Verve branding',
        href: '/assets/card-studio/index.html',
        external: true,
    },
    {
        name: 'Tiny Lagos',
        caption: 'A painted map of the city',
        image: '/assets/experiments/tiny-lagos.webp',
        alt: 'Painted miniature map of Lagos with the airport and Marina',
        href: 'https://tiny-lagos.ismailahmad.com/',
        external: true,
    },
    {
        name: 'Shader Studio',
        caption: 'Animated posters from a smiley',
        image: '/assets/experiments/shader-studio.webp',
        alt: 'A glossy black 3D smiley on a green poster',
        href: '/create',
        external: true,
    },
    {
        name: 'The desk',
        caption: 'Spin a record, leave a note',
        image: '/assets/experiments/desk.webp',
        alt: 'A vinyl player, photographs and books on the About page',
        href: '/about#pile',
    },
    {
        name: 'Version 1',
        caption: 'The first version of this site',
        image: '/assets/experiments/version-one.webp',
        alt: 'The first version of this site with a large name heading',
        href: '/v1',
    },
];

const escape = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function renderExperiments(mount) {
    if (!mount) return;

    mount.innerHTML = experimentItems
        .map((item) => {
            const target = item.external ? ' target="_blank" rel="noopener"' : '';
            return `<li class="experiment">
                <a class="experiment__link" href="${escape(item.href)}"${target}>
                    <span class="experiment__media">
                        <img src="${escape(item.image)}" alt="${escape(item.alt)}" width="640" height="800" loading="lazy" decoding="async" />
                    </span>
                    <span class="experiment__title">${escape(item.name)}</span>
                    <span class="experiment__caption">${escape(item.caption)}</span>
                </a>
            </li>`;
        })
        .join('');

    const count = document.querySelector('[data-count="experiments"]');
    if (count) count.textContent = String(experimentItems.length);

    const section = mount.closest('.section');
    const prev = section?.querySelector('[data-rail="prev"]');
    const next = section?.querySelector('[data-rail="next"]');
    if (!prev || !next) return;

    const still = window.matchMedia('(prefers-reduced-motion: reduce)');
    // One step is one plate plus the gap, so each press lands on a snap point.
    function step() {
        const first = mount.querySelector('.experiment');
        if (!first) return mount.clientWidth;
        const gap = parseFloat(getComputedStyle(mount).columnGap) || 0;
        return first.getBoundingClientRect().width + gap;
    }
    function update() {
        const max = mount.scrollWidth - mount.clientWidth - 1;
        prev.disabled = mount.scrollLeft <= 1;
        next.disabled = mount.scrollLeft >= max;
        section.toggleAttribute('data-rail-static', max <= 0);
    }
    const scroll = (dir) => mount.scrollBy({ left: dir * step(), behavior: still.matches ? 'auto' : 'smooth' });
    prev.addEventListener('click', () => scroll(-1));
    next.addEventListener('click', () => scroll(1));
    mount.addEventListener('scroll', update, { passive: true });
    new ResizeObserver(update).observe(mount);
    update();
}
