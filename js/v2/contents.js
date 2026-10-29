/**
 * Contents — the index pinned to the left margin of long pages (case
 * studies, articles). Desktop only; the CSS hides it everywhere else.
 */

function escape(str) {
    return String(str == null ? '' : str).replace(/[&<>"]/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
    ));
}

/** Turns headings into readable fragment ids, suffixing repeats. */
export function anchorIds(labels, reserved = []) {
    const used = new Set(reserved);
    return labels.map((label) => {
        const base = String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'section';
        let id = base;
        for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
        used.add(id);
        return id;
    });
}

/**
 * back: { href, label }. items: [{ id, label, sub? }] in reading order.
 * Returns '' when there is nothing to list, so short pages stay bare.
 */
export function contentsHTML(back, items) {
    if (items.length < 2) return '';
    return `<nav class="page-toc" aria-label="On this page">
        <a class="page-toc__back" href="${escape(back.href)}">
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"
                stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M13 8H3M7 4 3 8l4 4" />
            </svg>
            ${escape(back.label)}
        </a>
        <ul class="page-toc__list">${items.map((item) => `<li${item.sub ? ' class="page-toc__sub"' : ''}>
            <a href="#${escape(item.id)}">${escape(item.label)}</a>
        </li>`).join('')}</ul>
    </nav>`;
}

/** Marks the section being read: the last target to pass the upper third. */
export function trackContents(root = document) {
    const links = [...root.querySelectorAll('.page-toc__list a')];
    const targets = links.map((a) => document.getElementById(a.hash.slice(1)));
    if (!links.length || targets.some((t) => !t)) return;

    let frame = 0;
    function update() {
        frame = 0;
        const line = window.innerHeight / 3;
        let current = 0;
        targets.forEach((t, i) => { if (t.getBoundingClientRect().top <= line) current = i; });
        // At the very bottom, the final section may be too short to reach the line
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
            current = targets.length - 1;
        }
        links.forEach((a, i) => {
            if (i === current) a.setAttribute('aria-current', 'location');
            else a.removeAttribute('aria-current');
        });
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
}
