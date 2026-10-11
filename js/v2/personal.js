import { projectItems } from './projects.js';
import { escapeHTML } from './blog-data.js';

export function renderPersonalProject() {
    const mount = document.getElementById('personal-project');
    const slug = location.pathname.replace(/\/+$/, '').split('/').pop();
    const item = projectItems.find(project => project.slug === slug);
    if (!item) {
        document.title = 'Project not found — Ismail Ahmad';
        mount.innerHTML = '<h1 class="case-headline">Project not found</h1><p class="case-actions"><a class="chip" href="/#personal">View personal projects</a></p>';
        return;
    }
    document.title = `${item.name} — Ismail Ahmad`;
    document.querySelector('meta[name="description"]').content = item.description;
    document.getElementById('crumb-project').textContent = item.name;
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = `https://www.ismailahmad.com${item.url}`;
    document.head.appendChild(canonical);
    const next = projectItems[(projectItems.indexOf(item) + 1) % projectItems.length];
    mount.innerHTML = `
        <header>
            <img class="personal-overview__icon" src="${item.icon}" width="80" height="80" alt="" />
            <h1 class="case-headline">${escapeHTML(item.name)}</h1>
            <p class="personal-overview__tagline">${escapeHTML(item.role)}</p>
        </header>
        <section class="personal-overview__description" aria-labelledby="overview-heading">
            <h2 class="case-block__title" id="overview-heading">Overview</h2>
            <div class="case-prose"><p>${escapeHTML(item.description)}</p></div>
            <p class="case-actions"><a class="chip" href="${item.website}" target="_blank" rel="noopener noreferrer"
                aria-label="Visit ${escapeHTML(item.name)} website (opens in a new tab)">
                ${new URL(item.website).hostname} <span aria-hidden="true">↗</span>
            </a></p>
        </section>
        <nav class="case-next" aria-label="More personal projects">
            <a href="${next.url}"><span class="case-next__label">Next project</span>
                <span class="case-next__name">${escapeHTML(next.name)} <span aria-hidden="true">→</span></span>
            </a>
        </nav>`;
}
