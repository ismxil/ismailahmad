import { NOTE_AVATARS, noteAvatarMarkup } from './note-avatars.js';

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
            <textarea id="pile-note-text" name="body" placeholder="What’s on your mind?" maxlength="5000" required></textarea>
            <div class="note-editor__honeypot" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off" /></label></div>
            <p class="note-editor__status" role="status" hidden></p>
            <footer class="note-editor__footer">
                <div class="note-editor__identity">
                    <div class="note-avatar">
                        <button type="button" class="note-avatar__toggle" aria-label="Avatar: Sunny. Choose another avatar" aria-expanded="false" aria-controls="note-avatar-choices">${noteAvatarMarkup(NOTE_AVATARS[0])}</button>
                        <div class="note-avatar__choices" id="note-avatar-choices" role="group" aria-label="Choose an avatar" hidden>
                            ${NOTE_AVATARS.map((avatar, i) => `<button type="button" data-avatar="${avatar.id}" aria-label="${avatar.label}" aria-pressed="${i === 0}" title="${avatar.label}">${noteAvatarMarkup(avatar)}</button>`).join('')}
                        </div>
                    </div>
                    <input class="note-editor__name" name="name" placeholder="What's your name?" aria-label="Your name (optional)" maxlength="80" autocomplete="name" />
                </div>
                <button type="submit" class="note-editor__send">Send <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10 17 3l-4 14-3-6z"/><path d="m10 11 7-8"/></svg></button>
            </footer>
        </form>
        <section class="note-editor__receipt" aria-labelledby="note-receipt-title" tabindex="-1" hidden>
            <button type="button" class="note-editor__close" aria-label="Close confirmation">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg>
            </button>
            <div class="note-editor__receipt-body">
                <span class="note-editor__receipt-mark" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m13 24 8 8 15-17"/></svg></span>
                <h2 id="note-receipt-title">Sent</h2>
                <p>Thanks for the note!</p>
            </div>
        </section>`;
    document.body.append(dialog);
    const form = dialog.querySelector('form');
    const receipt = dialog.querySelector('.note-editor__receipt');
    const input = dialog.querySelector('textarea');
    const preview = note.querySelector('.pile-note__preview');
    const nameInput = dialog.querySelector('[name="name"]');
    const avatarToggle = dialog.querySelector('.note-avatar__toggle');
    const avatarChoices = dialog.querySelector('.note-avatar__choices');
    const sendButton = dialog.querySelector('.note-editor__send');
    const status = dialog.querySelector('.note-editor__status');
    const title = dialog.querySelector('#note-editor-title');
    const originalSendLabel = sendButton.innerHTML;
    const pileIcon = note.querySelector('.pile-note__open');
    const originalPileIcon = pileIcon.innerHTML;
    let avatarId = NOTE_AVATARS[0].id;
    let requestId;
    let sending = false;
    let sent = false;

    function closeAvatarChoices(returnFocus = false) {
        avatarChoices.hidden = true;
        avatarToggle.setAttribute('aria-expanded', 'false');
        if (returnFocus) avatarToggle.focus();
    }
    function changed() {
        requestId = undefined;
        status.hidden = true;
    }
    avatarToggle.addEventListener('click', () => {
        const open = avatarChoices.hidden;
        avatarChoices.hidden = !open;
        avatarToggle.setAttribute('aria-expanded', String(open));
        if (open) avatarChoices.querySelector('[aria-pressed="true"]').focus();
    });
    avatarChoices.addEventListener('click', event => {
        const choice = event.target.closest('[data-avatar]');
        if (!choice) return;
        avatarId = choice.dataset.avatar;
        const avatar = NOTE_AVATARS.find(avatar => avatar.id === avatarId);
        avatarToggle.innerHTML = noteAvatarMarkup(avatar);
        avatarToggle.setAttribute('aria-label', `Avatar: ${avatar.label}. Choose another avatar`);
        avatarChoices.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button === choice)));
        changed();
        closeAvatarChoices(true);
    });
    avatarChoices.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            event.preventDefault();
            event.stopPropagation();
            closeAvatarChoices(true);
        } else if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
            event.preventDefault();
            const choices = [...avatarChoices.querySelectorAll('button')];
            const direction = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
            choices[(choices.indexOf(document.activeElement) + direction + choices.length) % choices.length].focus();
        }
    });
    nameInput.addEventListener('input', changed);
    let previousOverflow = '';
    let previousFocus;
    let motion;
    let closing = false;
    let confirmationRun = 0;
    let confirmationMotions = [];
    let flight;

    function stopConfirmation() {
        confirmationRun++;
        confirmationMotions.forEach(animation => animation.cancel());
        confirmationMotions = [];
        flight?.remove();
        flight = undefined;
    }

    function renderReceipt() {
        input.value = '';
        preview.textContent = 'Sent';
        note.classList.add('is-sent');
        dialog.classList.add('is-sent');
        note.setAttribute('aria-label', 'Note sent. Write another note');
        pileIcon.innerHTML = '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 10 3 3 7-7"/></svg>';
        form.hidden = true;
        form.inert = true;
        receipt.hidden = false;
        dialog.setAttribute('aria-labelledby', 'note-receipt-title');
        if (dialog.open && !closing) receipt.focus({ preventScroll: true });
    }

    async function confirmSent() {
        stopConfirmation();
        const run = confirmationRun;
        if (reduceMotion.matches || !dialog.open || closing) {
            renderReceipt();
            return;
        }
        motion?.cancel();
        const button = sendButton.getBoundingClientRect();
        const paper = dialog.getBoundingClientRect();
        flight = document.createElement('span');
        flight.className = 'note-editor__flight';
        flight.setAttribute('aria-hidden', 'true');
        flight.style.left = `${button.x - paper.x + button.width / 2 - 24}px`;
        flight.style.top = `${button.y - paper.y + button.height / 2 - 24}px`;
        flight.innerHTML = '<svg viewBox="0 0 64 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m24 26 31-18-12 32-6-13Z" fill="#fffdf3"/><path d="M37 27 55 8"/><path d="M6 26h10M2 33h14M8 40h8" opacity=".4"/></svg>';
        dialog.append(flight);
        const swoosh = flight.animate([
            { transform: 'translate(-4px, 0) rotate(-8deg) scale(0.65)', opacity: 0 },
            { offset: 0.14, transform: 'translate(0, 0) rotate(-8deg) scale(1)', opacity: 1 },
            { offset: 0.35, transform: 'translate(-14px, 8px) rotate(-14deg) scale(1)', opacity: 1 },
            { transform: `translate(${paper.width * 0.65}px, ${-paper.height * 0.6}px) rotate(-26deg) scale(0.7)`, opacity: 0 },
        ], { duration: 520, easing: 'cubic-bezier(0.3, 0, 0.25, 1)', fill: 'forwards' });
        const fade = form.animate([
            { opacity: 1, transform: 'none' },
            { opacity: 0, transform: 'translateY(-12px) skewY(-1deg)' },
        ], { duration: 260, easing: 'ease-in', fill: 'forwards' });
        confirmationMotions.push(swoosh, fade);
        await swoosh.finished.catch(() => {});
        if (run !== confirmationRun) return;
        flight.remove();
        flight = undefined;
        const fold = dialog.animate([
            { transform: 'perspective(1000px) rotateY(0deg)' },
            { transform: 'perspective(1000px) rotateY(88deg) scale(0.98)' },
        ], { duration: 170, easing: 'ease-in', fill: 'forwards' });
        confirmationMotions.push(fold);
        await fold.finished.catch(() => {});
        if (run !== confirmationRun) return;
        renderReceipt();
        fold.cancel();
        const unfold = dialog.animate([
            { transform: 'perspective(1000px) rotateY(-88deg) scale(0.98)' },
            { offset: 0.8, transform: 'perspective(1000px) rotateY(3deg)' },
            { transform: 'none' },
        ], { duration: 300, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' });
        confirmationMotions.push(unfold);
        await unfold.finished.catch(() => {});
        if (run !== confirmationRun) return;
        stopConfirmation();
    }

    function originTransform() {
        const origin = note.getBoundingClientRect();
        const target = dialog.getBoundingClientRect();
        const dx = origin.x + origin.width / 2 - target.x - target.width / 2;
        const dy = origin.y + origin.height / 2 - target.y - target.height / 2;
        return `translate(${dx}px, ${dy}px) scale(${origin.width / target.width}, ${origin.height / target.height}) rotate(-6deg)`;
    }

    function open() {
        if (dialog.open) return;
        if (sent) {
            stopConfirmation();
            sent = false;
            form.hidden = false;
            form.inert = false;
            receipt.hidden = true;
            dialog.setAttribute('aria-labelledby', 'note-editor-title');
            pileIcon.innerHTML = originalPileIcon;
            input.value = '';
            input.readOnly = nameInput.readOnly = false;
            avatarToggle.disabled = sendButton.disabled = false;
            sendButton.innerHTML = originalSendLabel;
            title.textContent = preview.textContent = 'Leave a note';
            note.classList.remove('is-sent');
            dialog.classList.remove('is-sent');
            note.setAttribute('aria-label', 'Leave a note');
            changed();
        }
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
        stopConfirmation();
        if (sent) renderReceipt();
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
        stopConfirmation();
        if (sent) renderReceipt();
        motion?.cancel();
        closing = false;
        closeAvatarChoices();
        note.classList.remove('is-editing');
        document.body.style.overflow = previousOverflow;
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    }

    note.addEventListener('click', open);
    dialog.querySelectorAll('.note-editor__close').forEach(button => button.addEventListener('click', close));
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    dialog.addEventListener('close', release);
    dialog.addEventListener('click', event => {
        if (!event.target.closest('.note-avatar')) closeAvatarChoices();
        if (event.target !== dialog) return;
        const box = dialog.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
    });
    input.addEventListener('input', () => {
        changed();
        input.setCustomValidity('');
        preview.textContent = input.value.trim() || 'Leave a note';
        note.setAttribute('aria-label', input.value.trim() ? 'Edit your note' : 'Leave a note');
    });
    dialog.querySelector('form').addEventListener('submit', async event => {
        event.preventDefault();
        if (sending || sent) return;
        if (!input.value.trim()) {
            input.setCustomValidity('Write a note first.');
            input.reportValidity();
            return;
        }
        closeAvatarChoices();
        requestId ||= crypto.randomUUID();
        sending = true;
        sendButton.disabled = avatarToggle.disabled = true;
        input.readOnly = nameInput.readOnly = true;
        sendButton.textContent = 'Sending…';
        status.hidden = true;
        sendButton.setAttribute('aria-busy', 'true');
        try {
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: AbortSignal.timeout(15000),
                body: JSON.stringify({
                    message: input.value,
                    name: nameInput.value,
                    avatar: avatarId,
                    requestId,
                    website: dialog.querySelector('[name="website"]').value,
                }),
            });
            const result = await response.json().catch(() => null);
            if (!response.ok || !result?.ok) throw new Error(result?.error || 'Could not send your note. Please try again.');
            sent = true;
            await confirmSent();
        } catch (error) {
            status.textContent = ['TimeoutError', 'AbortError'].includes(error.name)
                ? 'The connection took too long. Please try again.'
                : error.message === 'Failed to fetch' ? 'Could not connect. Please try again.' : error.message;
            status.hidden = false;
            sendButton.innerHTML = originalSendLabel;
            sendButton.disabled = avatarToggle.disabled = false;
            input.readOnly = nameInput.readOnly = false;
        } finally {
            sending = false;
            sendButton.removeAttribute('aria-busy');
        }
    });
}
