/**
 * Section jump — the floating pill on a case page.
 *
 * The site-wide menu in the header searches across pages; this one stays
 * inside the project you are reading, listing its own sections (Intro,
 * Problem, Solution, Results, Reflection…) so a long case is navigable
 * without scrolling back and forth.
 *
 * Built from the headings the case actually rendered, so it matches each
 * project rather than assuming a fixed set.
 */

function slugify(text, index) {
    const base = String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `section-${base || 'part'}-${index}`;
}

/** Reads the page for anything worth jumping to, in document order. */
function collectTargets() {
    const targets = [];

    const intro = document.querySelector('.case-intro');
    if (intro) {
        intro.id ||= 'section-overview';
        targets.push({ label: 'Overview', id: intro.id });
    }

    const meta = document.querySelector('.case-meta');
    if (meta) {
        meta.id ||= 'section-details';
        targets.push({ label: 'Details', id: meta.id });
    }

    document.querySelectorAll('.case-body .case-block__title').forEach((heading, i) => {
        const label = heading.textContent.trim();
        if (!label) return;
        heading.id ||= slugify(label, i);
        targets.push({ label, id: heading.id });
    });

    return targets;
}

export function initSectionJump() {
    const targets = collectTargets();
    // A case with no headings has nothing to jump between
    if (targets.length < 2) return;

    const icon = `<svg class="dock__mark" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <path d="M4 6h16M4 12h10M4 18h7" /></svg>`;

    const dialog = document.createElement('dialog');
    dialog.className = 'command-menu';
    dialog.id = 'section-jump';
    dialog.setAttribute('aria-label', 'Jump to a section of this project');
    dialog.tabIndex = -1;
    dialog.innerHTML = `<div class="command-menu__bar">${icon}
        <input id="section-jump-input" type="search" placeholder="Jump to a section…"
            aria-label="Jump to a section" autocomplete="off" spellcheck="false" />
        <button type="button" data-menu-close aria-label="Close"><kbd>esc</kbd></button>
        </div><div class="command-menu__results" id="section-jump-results"></div>`;
    document.body.appendChild(dialog);

    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'dock-launcher';
    launcher.setAttribute('aria-haspopup', 'dialog');
    launcher.setAttribute('aria-controls', 'section-jump');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = `${icon}<span>Jump to a section…</span><kbd>/</kbd>`;
    document.body.appendChild(launcher);

    const input = dialog.querySelector('input');
    const results = dialog.querySelector('#section-jump-results');
    let matches = [];
    let active = 0;
    let previousFocus;
    let previousOverflow = '';

    function highlight() {
        const links = results.querySelectorAll('a');
        links.forEach((link, i) => link.classList.toggle('is-selected', i === active));
        links[active]?.scrollIntoView({ block: 'nearest' });
    }

    function render() {
        const query = input.value.trim().toLowerCase();
        matches = targets.filter((t) => t.label.toLowerCase().includes(query));
        active = 0;
        results.replaceChildren();
        matches.forEach((target, index) => {
            const link = document.createElement('a');
            link.href = `#${target.id}`;
            link.dataset.index = String(index);
            const label = document.createElement('span');
            label.textContent = target.label;
            const kind = document.createElement('span');
            kind.className = 'dock__kind';
            kind.textContent = 'section';
            link.append(label, kind);
            results.appendChild(link);
        });
        if (!matches.length) results.innerHTML = '<p class="command-menu__empty">No section found.</p>';
        highlight();
        results.scrollTop = 0;
    }

    // Idempotent, and called from every dismissal route — the dialog's
    // 'close' event alone does not fire reliably here.
    function release() {
        document.body.style.overflow = previousOverflow;
        launcher.hidden = false;
        launcher.setAttribute('aria-expanded', 'false');
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    }

    function close() {
        release();
        if (dialog.open) dialog.close();
    }

    function open() {
        if (dialog.open) return;
        previousFocus = document.activeElement;
        previousOverflow = document.body.style.overflow;
        input.value = '';
        render();
        dialog.showModal();
        launcher.hidden = true;
        launcher.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        input.focus();
    }

    function go(index) {
        const target = matches[index];
        if (!target) return;
        close();
        const el = document.getElementById(target.id);
        if (!el) return;
        el.scrollIntoView({
            behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
            block: 'start',
        });
        history.replaceState(null, '', `#${target.id}`);
    }

    launcher.addEventListener('click', open);
    dialog.querySelector('[data-menu-close]').addEventListener('click', close);
    dialog.addEventListener('cancel', close);
    dialog.addEventListener('close', release);
    input.addEventListener('input', render);

    dialog.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (matches.length) {
                active = (active + (e.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
            }
            highlight();
        } else if (e.key === 'Enter' && e.target === input) {
            e.preventDefault();
            go(active);
        }
    });

    results.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        e.preventDefault();
        go(Number(link.dataset.index));
    });

    dialog.addEventListener('click', (e) => {
        if (e.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        if (e.clientX < box.left || e.clientX > box.right ||
            e.clientY < box.top || e.clientY > box.bottom) close();
    });

    // "/" opens this one; the header Menu button still reaches the site-wide
    // search, so both stay available without competing for the shortcut.
    document.addEventListener('keydown', (e) => {
        const editing = e.target instanceof Element && (e.target.isContentEditable ||
            e.target.closest('input, textarea, select, [contenteditable], [role="textbox"]'));
        const slash = e.key === '/' && !editing && !e.metaKey && !e.ctrlKey && !e.altKey;
        if (!slash) return;
        e.preventDefault();
        if (dialog.open) close(); else open();
    });
}
