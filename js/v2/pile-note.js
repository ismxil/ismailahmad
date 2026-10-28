/** Lift the sticky note into a writing surface. The draft lives in this page. */
export function initPileNote(note) {
    if (!note) return;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const dialog = document.createElement('dialog');
    dialog.id = 'note-editor';
    dialog.className = 'note-editor';
    dialog.setAttribute('aria-labelledby', 'note-editor-title');
    dialog.tabIndex = -1;
    dialog.innerHTML = `
        <form class="note-editor__form">
            <header class="note-editor__header">
                <h2 id="note-editor-title">Leave a note</h2>
                <button type="button" class="note-editor__close" aria-label="Close note">
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>
                </button>
            </header>
            <label class="visually-hidden" for="pile-note-text">Your note</label>
            <textarea id="pile-note-text" name="body" placeholder="What’s on your mind?" required></textarea>
            <footer class="note-editor__footer">
                <p>Opens in your email app.</p>
                <button type="submit" class="note-editor__send">Open email <span aria-hidden="true">↗</span></button>
            </footer>
        </form>`;
    document.body.append(dialog);
    const input = dialog.querySelector('textarea');
    const preview = note.querySelector('.pile-note__preview');
    let previousOverflow = '';
    let previousFocus;
    let motion;
    let closing = false;

    function originTransform() {
        const origin = note.getBoundingClientRect();
        const target = dialog.getBoundingClientRect();
        const dx = origin.x + origin.width / 2 - target.x - target.width / 2;
        const dy = origin.y + origin.height / 2 - target.y - target.height / 2;
        return `translate(${dx}px, ${dy}px) scale(${origin.width / target.width}, ${origin.height / target.height}) rotate(-6deg)`;
    }

    function open() {
        if (dialog.open) return;
        previousFocus = document.activeElement;
        previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        dialog.showModal();
        input.focus({ preventScroll: true });
        if (!reduceMotion.matches) {
            motion = dialog.animate([
                { transform: originTransform(), opacity: 0.7 },
                { offset: 0.7, transform: 'scale(1.025) rotate(0.5deg)', opacity: 1 },
                { transform: 'none', opacity: 1 },
            ], { duration: 540, easing: 'cubic-bezier(0.2, 0.7, 0.2, 1)' });
        }
        note.classList.add('is-editing');
    }

    async function close() {
        if (!dialog.open || closing) return;
        closing = true;
        motion?.cancel();
        if (!reduceMotion.matches) {
            motion = dialog.animate([
                { transform: 'none', opacity: 1 },
                { transform: originTransform(), opacity: 0 },
            ], { duration: 240, easing: 'cubic-bezier(0.4, 0, 0.8, 0.4)' });
            await motion.finished.catch(() => {});
        }
        dialog.close();
    }

    function release() {
        motion?.cancel();
        closing = false;
        note.classList.remove('is-editing');
        document.body.style.overflow = previousOverflow;
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    }

    note.addEventListener('click', open);
    dialog.querySelector('.note-editor__close').addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', release);
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    });
    input.addEventListener('input', () => {
        input.setCustomValidity('');
        preview.textContent = input.value.trim() || 'Leave a note';
        note.setAttribute('aria-label', input.value.trim() ? 'Edit your note' : 'Leave a note');
    });
    dialog.querySelector('form').addEventListener('submit', event => {
        event.preventDefault();
        if (!input.value.trim()) {
            input.setCustomValidity('Write a note first.');
            input.reportValidity();
            return;
        }
        const subject = encodeURIComponent('A note from your About page');
        const body = encodeURIComponent(input.value);
        window.location.href = `mailto:work@ismailahmad.com?subject=${subject}&body=${body}`;
    });
}
