/**
 * Experience — the résumé snippet: one row per company.
 *
 * Roles come from the v1 case tags; dates come from data/feed-items.json.
 * Only companies where both are known are listed, so nothing here is
 * invented. Rows carry the company logo and nothing else by way of art.
 */

export const experienceItems = [
    {
        company: 'Cadana',
        role: 'Lead Product Designer',
        years: '2023 — 2024',
        icon: 'assets/clients/icons/cadana.svg',
        url: 'https://cadanapay.com',
        external: true,
    },
    {
        company: 'Deutsche Bank',
        role: 'Design Research',
        years: '2023 — 2024',
        icon: 'assets/clients/icons/deutsche-bank.svg',
        url: 'https://www.db.com',
        external: true,
    },
    {
        company: 'Motel One',
        role: 'Product Designer',
        years: '2022 — 2024',
        icon: 'assets/clients/icons/motel-one.svg',
        url: 'feeds.html#motel-one',
        external: false,
    },
    {
        company: 'Lemfi',
        role: 'Lead Product Designer',
        years: '2021 — 2024',
        icon: 'assets/clients/icons/lemfi.svg',
        url: 'https://lemfi.com/en-gb/credit',
        external: true,
    },
    {
        company: 'Etihad Credit Bureau',
        role: 'Senior UX Designer',
        years: '2021 — 2023',
        icon: 'assets/clients/icons/etihad.svg',
        url: 'https://etihadbureau.ae',
        external: true,
    },
    {
        company: 'Gomoney',
        role: 'Lead Product Designer',
        years: '2020 — 2022',
        icon: 'assets/clients/icons/gomoney.svg',
        url: 'https://gomoney.global/product/account',
        external: true,
    },
];

/**
 * Three tiers, best first:
 *  - icon:  a square brand icon that carries its own background and radius,
 *           so it fills the plate edge to edge
 *  - logo:  a wordmark lockup, which needs the grey plate and padding behind it
 *  - neither: a monogram
 */
function mark(item) {
    if (item.icon) {
        return `<span class="row__mark row__mark--icon">
            <img src="${item.icon}" alt="" aria-hidden="true" loading="lazy" />
        </span>`;
    }
    if (item.logo) {
        return `<span class="row__mark">
            <img src="${item.logo}" alt="" aria-hidden="true" loading="lazy" />
        </span>`;
    }
    return `<span class="row__mark">
        <span class="row__monogram" aria-hidden="true">${item.company.charAt(0)}</span>
    </span>`;
}

export function renderExperience(mount) {
    if (!mount) return;

    mount.innerHTML = experienceItems
        .map((item) => {
            const target = item.external
                ? ' target="_blank" rel="noopener noreferrer"'
                : '';
            return `<li>
                <a class="row" href="${item.url}"${target}>
                    ${mark(item)}
                    <span class="row__text">
                        <span class="row__title">${item.company}</span>
                        <span class="row__desc">${item.role}</span>
                    </span>
                    <span class="row__ext" aria-hidden="true">
                        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.6"
                            stroke-linecap="round" stroke-linejoin="round">
                            <path d="M6.5 11.5 11.5 6.5M11.5 6.5H6.5M11.5 6.5v5" />
                        </svg>
                    </span>
                </a>
            </li>`;
        })
        .join('');

    const count = document.querySelector('[data-count="experience"]');
    if (count) count.textContent = String(experienceItems.length);
}
