/**
 * Work — the six case studies shown as rows on the home page.
 *
 * Copy and links are lifted from the v1 card data so the two versions tell
 * the same story. Items without a public client URL point at the feed page,
 * which is where their case lives.
 */

export const workItems = [
    {
        title: 'Lemfi',
        desc: 'Diaspora remittance and product ecosystem.',
        cover: 'assets/cover/lemfi.png',
        url: 'https://lemfi.com/en-gb/credit',
        external: true,
    },
    {
        title: 'Cadana',
        desc: 'A payroll brand young workers trust before their employer tells them to.',
        cover: 'assets/cover/cadana.png',
        url: 'https://cadanapay.com',
        external: true,
    },
    {
        title: 'Gomoney',
        desc: 'Turning registration drop-off into sign-ups.',
        cover: 'assets/cover/gomoney.png',
        url: 'https://gomoney.global/product/account',
        external: true,
    },
    {
        title: 'Etihad Credit Bureau',
        desc: 'Every customer had their credit data. Most could not use it to decide anything.',
        cover: 'assets/cover/ecb.png',
        url: 'https://etihadbureau.ae',
        external: true,
    },
    {
        title: 'Commerzbank',
        desc: 'Research into how corporate clients actually read their own money.',
        cover: 'assets/cover/commerze.png',
        url: 'feeds.html#feed-15',
        external: false,
    },
    {
        title: 'Motel One',
        desc: 'The digital stay — booking, check-in and the room key in one app.',
        cover: 'assets/cover/motel-one.webp',
        url: 'feeds.html#motel-one',
        external: false,
    },
];

const ARROW = `<svg class="work-card__arrow" viewBox="0 0 18 18" fill="none" stroke="currentColor"
    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M6.5 11.5 11.5 6.5M7.5 6.5h4v4" /></svg>`;

/** Cover art, or a monogram plate for a case with nothing in assets/cover/. */
function art(item) {
    if (item.cover) {
        return `<img src="${item.cover}" alt="" aria-hidden="true" loading="lazy" decoding="async" />`;
    }
    return `<span class="work-card__monogram" aria-hidden="true">${item.title.charAt(0)}</span>`;
}

export function renderWork(mount) {
    if (!mount) return;

    mount.innerHTML = workItems
        .map((item) => {
            const target = item.external
                ? ' target="_blank" rel="noopener noreferrer"'
                : '';
            return `<li>
                <a class="work-card" href="${item.url}"${target}>
                    <span class="work-card__art">${art(item)}</span>
                    <span class="work-card__text">
                        <span class="work-card__title">${item.title}${ARROW}</span>
                        <span class="work-card__desc">${item.desc}</span>
                    </span>
                </a>
            </li>`;
        })
        .join('');

    const count = document.querySelector('[data-count="work"]');
    if (count) count.textContent = String(workItems.length);
}
