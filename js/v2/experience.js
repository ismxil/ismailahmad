/**
 * Experience — the résumé snippet: one row per role.
 *
 * Taken verbatim from the CV (Ismail Ahmad Resume, 2026), so these are
 * employers rather than clients. An earlier version listed Cadana, Etihad,
 * Motel One and the rest here, but those are project clients — Etihad,
 * Deutsche Bank, Commerzbank and Motel One all sit under Accenture Song,
 * and Gomoney under Sterling Bank. They belong in Work, not here.
 */

export const experienceItems = [
    {
        company: 'Cadara Studio',
        role: 'Founder Designer',
        years: '2025 — Present',
        location: 'Berlin',
        logo: '',
        url: '/work',
        external: false,
    },
    {
        company: 'Accenture Song',
        role: 'Senior Product Designer, UX',
        years: '2023 — 2024',
        location: 'Berlin',
        logo: 'assets/clients/accenture.svg',
        url: '/work',
        external: false,
    },
    {
        company: 'Lemfi',
        role: 'Senior Product Designer, Mobile Lead',
        years: '2022 — 2023',
        location: 'California, remote',
        icon: 'assets/clients/icons/lemfi.svg',
        url: 'https://lemfi.com/en-gb/credit',
        external: true,
    },
    {
        company: 'Sterling Bank',
        role: 'Senior Product Designer',
        years: '2021 — 2023',
        location: 'Lagos',
        logo: 'assets/clients/sterling.svg',
        url: 'https://gomoney.global/product/account',
        external: true,
    },
    {
        company: 'Mezovest',
        role: 'Senior Product Designer',
        years: '2020 — 2021',
        location: 'Lagos',
        logo: '',
        url: '/archive',
        external: false,
    },
    {
        company: 'NCK Technology',
        role: 'Designer',
        years: '2017 — 2020',
        location: 'Lagos',
        logo: '',
        url: '/archive',
        external: false,
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
                    <span class="row__years">${item.years}</span>
                </a>
            </li>`;
        })
        .join('');

    const count = document.querySelector('[data-count="experience"]');
    if (count) count.textContent = String(experienceItems.length);
}
