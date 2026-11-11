/**
 * Contents — the index pinned to the left margin of long pages (case
 * studies, articles). Desktop only; the CSS hides it everywhere else.
 * Articles add a pill version for smaller screens (contentsPillHTML).
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

/**
 * The same index for phones and tablets: a small progress ring pinned to
 * the lower-left corner, dimmed so it does not compete with the prose.
 * Tapping it opens the list above it.
 */
export function contentsPillHTML(items) {
    // A piece without sections still shows how far along the reader is;
    // the ring then simply returns to the top.
    const listed = items.length >= 2;
    const panel = listed ? `<div class="toc-pill__panel" id="toc-pill-panel" hidden>
            <ul class="toc-pill__list">${items.map((item) => `<li${item.sub ? ' class="toc-pill__sub"' : ''}>
                <a href="#${escape(item.id)}">${escape(item.label)}</a>
            </li>`).join('')}</ul>
        </div>` : '';
    const attrs = listed
        ? 'aria-expanded="false" aria-controls="toc-pill-panel" aria-label="Contents"'
        : 'aria-label="Back to top" data-toc-top';
    return `<div class="toc-pill">
        ${panel}
        <button type="button" class="toc-pill__button" ${attrs}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle class="toc-pill__track" cx="12" cy="12" r="9" pathLength="100" />
                <circle class="toc-pill__progress" cx="12" cy="12" r="9" pathLength="100"
                    stroke-dasharray="100" stroke-dashoffset="100" />
            </svg>
        </button>
    </div>`;
}

/** Wires the pill: progress through `body`, open and close, jumping. */
export function initContentsPill(pill, body) {
    if (!pill) return;
    const button = pill.querySelector('.toc-pill__button');
    const panel = pill.querySelector('.toc-pill__panel');
    const ring = pill.querySelector('.toc-pill__progress');

    if (!panel) {
        button.addEventListener('click', () => window.scrollTo({
            top: 0,
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
        }));
    }

    function setOpen(open) {
        if (!panel) return;
        panel.hidden = !open;
        button.setAttribute('aria-expanded', String(open));
        pill.classList.toggle('is-open', open);
    }
    if (panel) {
        button.addEventListener('click', () => setOpen(panel.hidden));
        panel.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
    }
    document.addEventListener('click', (e) => { if (!pill.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panel && !panel.hidden) { setOpen(false); button.focus(); }
    });

    let frame = 0;
    function update() {
        frame = 0;
        const box = body.getBoundingClientRect();
        const start = box.top + window.scrollY - window.innerHeight / 3;
        const end = box.bottom + window.scrollY - window.innerHeight;
        const p = end > start ? (window.scrollY - start) / (end - start) : 1;
        const clamped = Math.min(1, Math.max(0, p));
        ring.setAttribute('stroke-dashoffset', String(100 - clamped * 100));
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
}

/**
 * Marks the section being read: the last target to pass the upper third.
 * Every index on the page (the margin list and the pill) is kept in step.
 */
export function trackContents(root = document) {
    const links = [...root.querySelectorAll('.page-toc__list a, .toc-pill__list a')];
    const ids = [...new Set(links.map((a) => a.hash.slice(1)))];
    const targets = ids.map((id) => document.getElementById(id));
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
        links.forEach((a) => {
            if (a.hash.slice(1) === ids[current]) a.setAttribute('aria-current', 'location');
            else a.removeAttribute('aria-current');
        });
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
}
