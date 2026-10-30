/** A centred, resizable page frame. No saved preference: every visit starts
 * at the page's original width. Loaded only by pages that opt in. */
const shell = document.querySelector('[data-resizable-shell]');

if (shell) {
    // Case-study text stays in its reading column; only the media follows
    // the rails. Home and archive continue resizing their entire shell.
    const mediaOnly = Boolean(shell.querySelector('#case'));
    if (mediaOnly) shell.setAttribute('data-resize-media', '');
    const desktop = matchMedia('(min-width: 900px) and (pointer: fine)');
    const minimum = 480;
    const frame = document.createElement('div');
    frame.className = 'shell-resize';
    frame.setAttribute('role', 'group');
    frame.setAttribute('aria-label', 'Page width');

    for (const side of ['left', 'right']) {
        const handle = document.createElement('button');
        handle.type = 'button';
        handle.className = `shell-resize__handle shell-resize__handle--${side}`;
        handle.dataset.side = side;
        handle.setAttribute('role', 'slider');
        handle.setAttribute('aria-label', `Resize page from ${side} edge`);
        handle.setAttribute('aria-orientation', 'horizontal');
        handle.setAttribute('aria-description', 'Drag to resize. Arrow keys adjust width. Home or double-click resets. End expands fully.');
        const hint = document.createElement('span');
        hint.className = 'shell-resize__hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.textContent = 'Drag';
        handle.append(hint);
        frame.append(handle);
    }
    document.body.append(frame);

    let drag;
    let requestedWidth;
    const maximum = () => document.documentElement.clientWidth;
    const frameWidth = () => mediaOnly && desktop.matches && requestedWidth != null
        ? Math.min(requestedWidth, maximum()) : shell.getBoundingClientRect().width;

    function sync() {
        const rect = shell.getBoundingClientRect();
        const width = frameWidth();
        const left = rect.left + (rect.width - width) / 2;
        frame.style.left = `${left}px`;
        frame.style.width = `${width}px`;
        shell.style.setProperty('--shell-left', `${rect.left}px`);
        shell.toggleAttribute('data-shell-toc-hidden', left < 200);
        frame.querySelectorAll('.shell-resize__hint').forEach(hint => {
            hint.textContent = requestedWidth == null ? 'Drag' : 'Double-click to reset';
        });
        shell.toggleAttribute('data-shell-compact', desktop.matches && rect.width < 1024);
        for (const handle of frame.children) {
            handle.setAttribute('aria-valuemin', String(minimum));
            handle.setAttribute('aria-valuemax', String(maximum()));
            handle.setAttribute('aria-valuenow', String(Math.round(width)));
            handle.setAttribute('aria-valuetext', `${Math.round(width)} pixels${requestedWidth == null ? ', default width' : ''}`);
        }
    }

    function resize(width) {
        requestedWidth = Math.round(Math.min(maximum(), Math.max(minimum, width)));
        shell.style.setProperty('--resized-width', `${requestedWidth}px`);
        shell.classList.add('is-custom-width');
        sync();
    }

    function reset() {
        requestedWidth = undefined;
        shell.classList.remove('is-custom-width');
        shell.style.removeProperty('--resized-width');
        sync();
    }

    function finish() {
        if (!drag) return;
        const { handle, id } = drag;
        drag = undefined;
        if (handle.hasPointerCapture(id)) handle.releasePointerCapture(id);
        frame.classList.remove('is-dragging');
        document.documentElement.classList.remove('is-resizing');
    }

    frame.addEventListener('pointerdown', event => {
        const handle = event.target.closest('button');
        if (!desktop.matches || !handle || event.button !== 0 || !event.isPrimary) return;
        event.preventDefault();
        handle.focus({ preventScroll: true });
        drag = { handle, id: event.pointerId, x: event.clientX, width: frameWidth() };
        handle.setPointerCapture(event.pointerId);
        frame.classList.add('is-dragging');
        document.documentElement.classList.add('is-resizing');
    });
    frame.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== drag.id) return;
        const direction = drag.handle.dataset.side === 'right' ? 1 : -1;
        // Both edges move because the page remains centred.
        resize(drag.width + (event.clientX - drag.x) * 2 * direction);
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        frame.addEventListener(event, finish);
    }
    window.addEventListener('blur', finish);
    frame.addEventListener('dblclick', reset);
    frame.addEventListener('keydown', event => {
        const width = frameWidth();
        const step = event.shiftKey ? 100 : 40;
        if (event.key === 'ArrowRight' || event.key === 'ArrowUp') resize(width + step);
        else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') resize(width - step);
        else if (event.key === 'End') resize(maximum());
        else if (event.key === 'Home' || event.key === 'Escape') { finish(); reset(); }
        else return;
        event.preventDefault();
        event.stopPropagation();
    });
    desktop.addEventListener('change', () => { finish(); reset(); });
    window.addEventListener('resize', () => {
        finish();
        if (requestedWidth != null) resize(requestedWidth);
        else sync();
    });
    new ResizeObserver(sync).observe(shell);
    sync();
}
