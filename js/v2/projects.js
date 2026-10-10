/**
 * Projects — the home page's "Experience" rows.
 *
 * These are the pieces of work worth being known for, not employers. The
 * career progression behind them lives in experience.js and renders on the
 * about page; several of these sat under Accenture Song or Sterling Bank.
 */

export const projectItems = [
    {
        name: 'Cadana',
        role: 'Brand identity',
        years: '2023 — 2024',
        icon: 'assets/clients/icons/cadana.svg',
        url: 'https://cadanapay.com',
        external: true,
    },
    {
        name: 'Deutsche Bank',
        role: 'Design research',
        years: '2023 — 2024',
        icon: 'assets/clients/icons/deutsche-bank.svg',
        url: 'https://www.db.com',
        external: true,
    },
    {
        name: 'Motel One',
        role: 'Mobile check-in & room key',
        years: '2022 — 2024',
        icon: 'assets/clients/icons/motel-one.svg',
        url: '/archive',
        external: false,
    },
    {
        name: 'Lemfi',
        role: 'Card & remittance product',
        years: '2021 — 2024',
        icon: 'assets/clients/icons/lemfi.svg',
        url: '/work/lemfi',
        external: false,
    },
    {
        name: 'Etihad Credit Bureau',
        role: 'Credit data platform',
        years: '2021 — 2023',
        icon: 'assets/clients/icons/etihad.svg',
        url: '/work/etihad',
        external: false,
    },
    {
        name: 'Gomoney',
        role: 'Consumer banking app',
        years: '2020 — 2022',
        icon: 'assets/clients/icons/gomoney.svg',
        url: '/work/gomoney',
        external: false,
    },
];

function mark(item) {
    if (item.icon) {
        return `<span class="row__mark row__mark--icon">
            <img src="${item.icon}" alt="" aria-hidden="true" loading="lazy" />
        </span>`;
    }
    return `<span class="row__mark">
        <span class="row__monogram" aria-hidden="true">${item.name.charAt(0)}</span>
    </span>`;
}

export function renderProjects(mount) {
    if (!mount) return;

    mount.innerHTML = projectItems
        .map((item) => {
            const target = item.external
                ? ' target="_blank" rel="noopener noreferrer"'
                : '';
            return `<li>
                <a class="row" href="${item.url}"${target}>
                    ${mark(item)}
                    <span class="row__text">
                        <span class="row__title">${item.name}</span>
                        <span class="row__desc">${item.role}</span>
                    </span>
                    <span class="row__years">${item.years}</span>
                </a>
            </li>`;
        })
        .join('');

    const count = document.querySelector('[data-count="experience"]');
    if (count) count.textContent = String(projectItems.length);
}
