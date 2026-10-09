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
        logo: 'assets/clients/cadana.svg',
        url: 'https://cadanapay.com',
        external: true,
    },
    {
        company: 'Commerzbank',
        role: 'Design Research',
        years: '2023 — 2024',
        logo: 'assets/clients/commerz.svg',
        url: 'feeds.html#feed-15',
        external: false,
    },
    {
        company: 'Motel One',
        role: 'Product Designer',
        years: '2022 — 2024',
        logo: '',
        url: 'feeds.html#motel-one',
        external: false,
    },
    {
        company: 'Lemfi',
        role: 'Lead Product Designer',
        years: '2021 — 2024',
        logo: 'assets/clients/lemfi.svg',
        url: 'https://lemfi.com/en-gb/credit',
        external: true,
    },
    {
        company: 'Etihad Credit Bureau',
        role: 'Senior UX Designer',
        years: '2021 — 2023',
        logo: 'assets/clients/eithad.svg',
        url: 'https://etihadbureau.ae',
        external: true,
    },
    {
        company: 'Gomoney',
        role: 'Lead Product Designer',
        years: '2020 — 2022',
        logo: 'assets/clients/gomoney.svg',
        url: 'https://gomoney.global/product/account',
        external: true,
    },
];

/** Logo plate, or a monogram where assets/clients/ has no file. */
function mark(item) {
    if (item.logo) {
        return `<img src="${item.logo}" alt="" aria-hidden="true" loading="lazy" />`;
    }
    return `<span class="row__monogram" aria-hidden="true">${item.company.charAt(0)}</span>`;
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
                    <span class="row__mark">${mark(item)}</span>
                    <span class="row__text">
                        <span class="row__title">${item.company}</span>
                        <span class="row__desc">${item.role}</span>
                    </span>
                    <span class="row__years">${item.years}</span>
                </a>
            </li>`;
        })
        .join('');

    const count = document.querySelector('[data-count="experience"]');
    if (count) count.textContent = String(experienceItems.length);
}
