import { bindBookingTrigger } from './booking-modal.js';

const EMAIL = 'work@ismailahmad.com';
const arrow = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 14 14 6M6 6h8v8"/></svg>';
const linkedIn = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5A2.5 2.5 0 1 1 2.5 6 2.5 2.5 0 0 1 4.98 3.5ZM3 8.98h4V21H3ZM9.5 8.98h3.8v1.64h.05a4.2 4.2 0 0 1 3.78-2.08c4.04 0 4.79 2.66 4.79 6.12V21h-4v-5.5c0-1.31-.02-3-1.83-3-1.84 0-2.12 1.44-2.12 2.92V21h-4Z"/></svg>';

export function initConnect() {
    const triggers = document.querySelectorAll('[data-connect-open]');
    if (!triggers.length || document.getElementById('connect-dialog')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'connect-dialog';
    dialog.className = 'command-menu connect-dialog';
    dialog.setAttribute('aria-labelledby', 'connect-title');
    dialog.innerHTML = `
        <div class="command-menu__bar connect-dialog__head">
            <h2 id="connect-title">Contact</h2>
            <button type="button" data-connect-close aria-label="Close contact modal"><kbd>esc</kbd></button>
        </div>
        <div class="connect-dialog__body">
            <div class="connect-dialog__row">
                <div><h3>Email</h3><a class="connect-dialog__detail" href="mailto:${EMAIL}">${EMAIL}</a></div>
                <button type="button" class="connect-dialog__action" data-copy-email>
                    <span data-copy-label>Copy</span><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M12 4V3H3v9h1"/></svg>
                </button>
            </div>
            <div class="connect-dialog__row">
                <div><h3>Book a call</h3><p class="connect-dialog__detail">Let’s find a time to chat.</p></div>
                <a class="connect-dialog__action" href="https://cal.com/ismxil/intro30min" data-connect-book>Book <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m8 5 5 5-5 5"/></svg></a>
            </div>
            <div class="connect-dialog__row">
                <div><h3>Follow me</h3><p class="connect-dialog__detail">Find me on X and LinkedIn.</p></div>
                <div class="connect-dialog__socials">
                    <a href="https://x.com/ismxilahmad" target="_blank" rel="noopener noreferrer" aria-label="Follow Ismail on X"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M4.99707 1.1416L7.64941 5.00195L10.9941 1.11621L11.083 1.01172H12.8564L8.43652 6.14844L13.1357 12.9863H9.09277L9.00391 12.8564L6.19043 8.76074L2.55469 12.9863H0.780273L5.40234 7.61523L0.865234 1.01172H4.90723L4.99707 1.1416ZM9.86914 11.6807H10.6455L4.12305 2.35059H3.34766L9.86914 11.6807Z" fill-rule="evenodd" clip-rule="evenodd" fill="currentColor"/>
</svg></a>
                    <a href="https://linkedin.com/in/ismxil" target="_blank" rel="noopener noreferrer" aria-label="Connect with Ismail on LinkedIn">${linkedIn}</a>
                </div>
            </div>
            <p class="connect-dialog__status" role="status" hidden></p>
            <div class="connect-dialog__other">
                <h3>Elsewhere</h3>
                <a href="https://instagram.com/ismxilahmad" target="_blank" rel="noopener noreferrer">Instagram ${arrow}</a>
                <a href="https://github.com/ismxil" target="_blank" rel="noopener noreferrer">GitHub ${arrow}</a>
                <a href="/cv">View CV ${arrow}</a>
            </div>
        </div>`;
    document.body.appendChild(dialog);
    const copy = dialog.querySelector('[data-copy-email]');
    const label = dialog.querySelector('[data-copy-label]');
    const status = dialog.querySelector('[role="status"]');
    let previousFocus;
    let previousOverflow = '';
    let released = true;
    let copyTimer;

    function release() {
        if (released) return;
        released = true;
        clearTimeout(copyTimer);
        document.body.style.overflow = previousOverflow;
        triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'false'));
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
        released = false;
        status.hidden = true;
        label.textContent = 'Copy';
        dialog.showModal();
        document.body.style.overflow = 'hidden';
        triggers.forEach(trigger => trigger.setAttribute('aria-expanded', 'true'));
        dialog.querySelector('[data-connect-close]').focus();
    }
    copy.addEventListener('click', async () => {
        clearTimeout(copyTimer);
        status.hidden = false;
        try {
            await navigator.clipboard.writeText(EMAIL);
            label.textContent = 'Copied';
            status.textContent = 'Email address copied.';
            copyTimer = setTimeout(() => { label.textContent = 'Copy'; status.hidden = true; }, 2500);
        } catch {
            status.textContent = 'Copy unavailable. Select the email address to copy it, or click it to send a message.';
        }
    });
    const booking = dialog.querySelector('[data-connect-book]');
    booking.addEventListener('click', close);
    bindBookingTrigger(booking);
    dialog.querySelector('[data-connect-close]').addEventListener('click', close);
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', release);
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    });
    dialog.querySelector('.connect-dialog__other a[href="/cv"]').addEventListener('click', close);
    triggers.forEach(trigger => trigger.addEventListener('click', open));
}
