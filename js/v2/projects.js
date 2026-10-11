/** Personal ventures shown on the homepage. Career history lives in experience.js. */

export const projectItems = [
    {
        slug: 'cadara-studio', name: 'Cadara Studio', role: 'A boutique design studio',
        description: 'Cadara Studio is my boutique design studio, bringing together my interests in design and entrepreneurship.',
        icon: '/assets/clients/icons/cadara.svg', url: '/personal/cadara-studio', website: 'https://cadarastudio.com',
    },
    {
        slug: 'qaba', name: 'Qaba', role: 'Kickoff your business in Africa',
        description: 'Qaba is a project focused on helping people kick off their business in Africa.',
        icon: '/assets/clients/icons/qaba.svg', url: '/personal/qaba', website: 'https://qaba.africa',
    },
    {
        slug: 'wandarer', name: 'Wandarer', role: 'A community of wanderers',
        description: 'Wandarer is a community for wanderers — a place to connect through a shared curiosity about the world.',
        icon: '/assets/clients/icons/wndrground.svg', url: '/personal/wandarer', website: 'https://wandarer.com',
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
            return `<li>
                <a class="row" href="${item.url}" aria-label="View ${item.name} project">
                    ${mark(item)}
                    <span class="row__text">
                        <span class="row__title">${item.name}</span>
                        <span class="row__desc">${item.role}</span>
                    </span>
                    <span class="row__ext" aria-hidden="true">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m9 6 6 6-6 6" />
                        </svg>
                    </span>
                </a>
            </li>`;
        })
        .join('');

    const count = document.querySelector('[data-count="personal"]');
    if (count) count.textContent = String(projectItems.length);
}
