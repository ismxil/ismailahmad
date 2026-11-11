/**
 * A clear button for search fields, replacing the browser's own (Chrome
 * draws a blue ×, Safari a grey one, Firefox none). It sits inside the
 * field, shows only while there is text, and hands focus back to the
 * input so typing can carry on.
 */
/** The circled ×, two-tone so it reads like the old esc key cap. */
export const closeIcon = `<svg class="x-icon" viewBox="0 0 20 20" aria-hidden="true">
    <circle class="x-icon__disc" cx="10" cy="10" r="8" />
    <path class="x-icon__mark" d="M7.25 7.25l5.5 5.5M12.75 7.25l-5.5 5.5" />
</svg>`;

export function attachSearchClear(input) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'search-clear';
    button.setAttribute('aria-label', 'Clear search');
    button.innerHTML = closeIcon;
    input.after(button);

    const sync = () => { button.hidden = !input.value; };
    button.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the field
    button.addEventListener('click', () => {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
    });
    input.addEventListener('input', sync);
    sync();
    return sync;
}
