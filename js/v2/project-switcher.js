const icons = {
    sterling: 'sterling', lemfi: 'lemfi', cadana: 'cadana',
    gomoney: 'gomoney', etihad: 'etihad',
};
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function avatar(project, className = '') {
    return icons[project.slug]
        ? `<img class="project-switcher__avatar ${className}" src="/assets/clients/icons/${icons[project.slug]}.svg" width="28" height="28" alt="" />`
        : `<span class="project-switcher__avatar project-switcher__initial ${className}" aria-hidden="true">${escape(project.name?.slice(0, 1) || 'P')}</span>`;
}

const check = '<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m4 10 4 4 8-8"/></svg>';
const lock = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" role="img" aria-label="Access code required"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';

/** A breadcrumb disclosure: hover with a mouse, tap or use the keyboard. */
export function initProjectSwitcher(projects, currentSlug) {
    const crumb = document.getElementById('crumb-case');
    const current = projects.find(project => project.slug === currentSlug);
    if (!crumb || !current || crumb.closest('.project-switcher')) return;

    const host = document.createElement('span');
    host.className = 'project-switcher crumbs__current';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'project-switcher__trigger';
    trigger.setAttribute('aria-label', `Switch project, ${current.name}`);
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', 'project-switcher-menu');
    trigger.innerHTML = `${avatar(current, 'project-switcher__avatar--current')}
        <svg class="project-switcher__chevron" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>`;
    crumb.replaceWith(host);
    trigger.insertBefore(crumb, trigger.lastElementChild);
    host.append(trigger);

    // Mount outside the sticky header so its backdrop/filter cannot clip or
    // reposition the floating panel when the header contracts into a pill.
    const menu = document.createElement('nav');
    menu.id = 'project-switcher-menu';
    menu.className = 'project-switcher__menu';
    menu.setAttribute('aria-label', 'Switch project');
    menu.hidden = true;
    menu.innerHTML = `<ul>${projects.filter(project => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug)).map(project => `<li>
        <a class="project-switcher__project" href="/work/${escape(project.slug)}"${project.slug === currentSlug ? ' aria-current="page"' : ''}>
            ${avatar(project)}
            <span class="project-switcher__text"><span class="project-switcher__name">${escape(project.name)}</span>
                <span class="project-switcher__type">${escape(project.type || 'Case study')}</span></span>
            <span class="project-switcher__status">${project.locked ? lock : project.slug === currentSlug ? check : ''}</span>
        </a>
    </li>`).join('')}</ul>
        <a class="project-switcher__all" href="/work">All work<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M4 12 12 4M4 4h8v8"/></svg></a>`;
    document.body.append(menu);
    const links = [...menu.querySelectorAll('a')];
    let closing;

    function cancelClose() { clearTimeout(closing); }
    function close(restoreFocus = false) {
        cancelClose();
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        if (restoreFocus) trigger.focus({ preventScroll: true });
    }
    function position() {
        const rect = trigger.getBoundingClientRect();
        const width = Math.min(280, document.documentElement.clientWidth - 32);
        menu.style.width = `${width}px`;
        menu.style.left = `${Math.max(16, Math.min(rect.left, document.documentElement.clientWidth - width - 16))}px`;
        menu.style.top = `${rect.bottom + 6}px`;
        menu.style.maxHeight = `${Math.max(120, innerHeight - rect.bottom - 22)}px`;
    }
    function open(focus = false, last = false) {
        cancelClose();
        position();
        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        if (focus) links[last ? links.length - 1 : 0]?.focus({ preventScroll: true });
    }
    function scheduleClose() {
        cancelClose();
        closing = setTimeout(() => {
            if (document.activeElement !== trigger && !menu.contains(document.activeElement)) close();
        }, 180);
    }

    host.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') open(); });
    host.addEventListener('pointerleave', scheduleClose);
    menu.addEventListener('pointerenter', cancelClose);
    menu.addEventListener('pointerleave', scheduleClose);
    trigger.addEventListener('click', event => {
        // A desktop click should not undo the menu the hover just opened.
        if (event.detail === 0 || matchMedia('(hover: hover) and (pointer: fine)').matches) open(true);
        else if (menu.hidden) open();
        else close();
    });
    trigger.addEventListener('keydown', event => {
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            open(true, event.key === 'ArrowUp');
        } else if (event.key === 'Tab' && !event.shiftKey && !menu.hidden) {
            event.preventDefault();
            links[0]?.focus();
        }
    });
    menu.addEventListener('keydown', event => {
        const index = links.indexOf(document.activeElement);
        let target;
        if (event.key === 'ArrowDown') target = links[(index + 1) % links.length];
        else if (event.key === 'ArrowUp') target = links[(index - 1 + links.length) % links.length];
        else if (event.key === 'Home') target = links[0];
        else if (event.key === 'End') target = links.at(-1);
        else if (event.key === 'Tab' && event.shiftKey && index === 0) {
            event.preventDefault();
            close(true);
        } else if (event.key === 'Tab' && !event.shiftKey && index === links.length - 1) {
            event.preventDefault();
            close();
            host.closest('header')?.querySelector('.header-actions button')?.focus();
        }
        if (target) { event.preventDefault(); target.focus(); }
    });
    document.addEventListener('keydown', event => {
        if (menu.hidden || event.key !== 'Escape') return;
        if (document.querySelector('dialog[open]')) { close(); return; }
        event.preventDefault();
        event.stopPropagation();
        close(menu.contains(document.activeElement));
    });
    document.addEventListener('pointerdown', event => {
        if (!host.contains(event.target) && !menu.contains(event.target)) close();
    });
    document.addEventListener('focusin', event => {
        if (!host.contains(event.target) && !menu.contains(event.target)) close();
    });
    window.addEventListener('scroll', () => close(), { passive: true });
    window.addEventListener('resize', () => close());
    window.addEventListener('pagehide', () => close());
    new ResizeObserver(() => { if (!menu.hidden) position(); }).observe(host.closest('header'));
}
