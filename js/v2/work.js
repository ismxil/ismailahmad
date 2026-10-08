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

const ARROW = `<svg class="row__arrow" viewBox="0 0 18 18" fill="none" stroke="currentColor"
    stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M6.5 11.5 11.5 6.5M7.5 6.5h4v4" /></svg>`;

/** Monogram fallback for a case with no cover in assets/cover/. */
function mark(item) {
    if (item.cover) {
        return `<img src="${item.cover}" alt="" aria-hidden="true" loading="lazy" />`;
    }
    return `<span aria-hidden="true" style="font-size:15px;font-weight:500;color:var(--text-primary)">${
        item.title.charAt(0)
    }</span>`;
}

export function renderWork(mount) {
    if (!mount) return;

    mount.innerHTML = workItems
        .map((item) => {
            const target = item.external
                ? ' target="_blank" rel="noopener noreferrer"'
                : '';
            return `<li>
                <a class="row" href="${item.url}"${target}>
                    <span class="row__mark">${mark(item)}</span>
                    <span class="row__text">
                        <span class="row__title">${item.title}</span>
                        <span class="row__desc">${item.desc}</span>
                    </span>
                    ${ARROW}
                </a>
            </li>`;
        })
        .join('');

    const count = document.querySelector('[data-count="work"]');
    if (count) count.textContent = String(workItems.length);
}
