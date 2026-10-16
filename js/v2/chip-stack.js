/**
 * Folded chip runs — a pill of overlapping logos that unfolds into the
 * full chips. A mouse opens it on hover and folds it again once the pointer
 * leaves the paragraph (not the pill, since the pill reflows the text as it
 * grows and would slide out from under the cursor). A tap or keyboard focus
 * opens it and it stays open; keyboard focus opens it while focus is inside.
 */

export function initChipStacks() {
    document.querySelectorAll('[data-chip-stack]').forEach((stack) => {
        const area = stack.closest('p') || stack;
        let pinned = false;
        let hovered = false;
        let focused = false;

        const sync = () => stack.classList.toggle('is-open', pinned || hovered || focused);

        stack.addEventListener('pointerenter', (e) => {
            if (e.pointerType !== 'mouse') return;
            hovered = true;
            sync();
        });
        area.addEventListener('pointerleave', (e) => {
            if (e.pointerType !== 'mouse') return;
            hovered = false;
            sync();
        });

        // While folded, the first tap opens the pill instead of following
        // whichever logo happened to be under the finger.
        stack.addEventListener('click', (e) => {
            if (stack.classList.contains('is-open')) return;
            e.preventDefault();
            pinned = true;
            sync();
        });

        // Keyboard focus only — a tap focuses the link too on some browsers,
        // and opening there would let the click above go straight through.
        stack.addEventListener('focusin', (e) => {
            if (!e.target.matches(':focus-visible')) return;
            focused = true;
            sync();
        });
        stack.addEventListener('focusout', (e) => {
            if (stack.contains(e.relatedTarget)) return;
            focused = false;
            sync();
        });
    });
}
