


export function renderAccessGate(mount, item, unlocked, { focus = true } = {}) {
    mount.innerHTML = `<section class="case-access" aria-labelledby="case-access-title">
        <img class="case-access__mark" src="/assets/icons/lock.svg" width="56" height="56" alt="" />
        <h1 id="case-access-title">Enter access code</h1>
        <p class="case-access__description">Please enter 6-digit access code.</p>
        <form class="case-access__form" novalidate>
            <label class="visually-hidden" for="case-access-code">Six-digit access code</label>
            <div class="access-code" data-active="first">
                <input id="case-access-code" class="access-code__input" name="code" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required aria-describedby="case-access-error" spellcheck="false" />
                <div class="access-code__digits" aria-hidden="true">
                    ${[0, 1].map(() => `<span class="access-code__group">${Array.from({ length: 3 }, () => '<span class="access-code__digit">0</span>').join('')}</span>`).join('')}
                </div>
            </div>
            <p id="case-access-error" class="case-access__error" role="alert" hidden></p>
            <button class="case-access__submit" type="submit">View case study</button>
        </form>
        <p class="case-access__help">Some of my work aren’t public for confidentiality reasons.<br><a class="case-access__request" href="mailto:work@ismailahmad.com?subject=Etihad%20case%20study%20access">Request access.</a></p>
    </section>`;
    const form = mount.querySelector('form');
    const input = form.querySelector('input');
    const button = form.querySelector('button');
    const error = mount.querySelector('#case-access-error');
    const digits = [...mount.querySelectorAll('.access-code__digit')];
    const field = mount.querySelector('.access-code');
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    let shake;
    let sending = false;

    input.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '').slice(0, 6);
        field.dataset.active = input.value.length < 3 ? 'first' : 'last';
        digits.forEach((digit, index) => {
            digit.textContent = input.value[index] || '0';
            digit.classList.toggle('is-filled', index < input.value.length);
        });
        error.hidden = true;
        input.removeAttribute('aria-invalid');
        field.classList.remove('is-invalid');
        shake?.cancel();
    });
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (sending) return;
        if (!/^[0-9]{6}$/.test(input.value)) {
            error.textContent = 'Please enter all six digits.';
            error.hidden = false;
            input.setAttribute('aria-invalid', 'true');
            field.classList.add('is-invalid');
            input.focus();
            return;
        }
        sending = true;
        input.readOnly = button.disabled = true;
        button.textContent = 'Opening…';
        form.setAttribute('aria-busy', 'true');
        error.hidden = true;
        try {
            const response = await fetch('/api/case-access', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: item.slug, code: input.value }),
                cache: 'no-store', signal: AbortSignal.timeout(15000),
            });
            const data = await response.json();
            if (!response.ok || !data.case) {
                const failure = new Error(data.error || 'Could not open this case study. Please try again.');
                failure.invalidCode = response.status === 401;
                throw failure;
            }
            input.value = '';
            unlocked(data.case);
        } catch (failure) {
            error.textContent = ['TimeoutError', 'AbortError', 'TypeError'].includes(failure.name)
                ? 'Could not connect. Please try again.' : failure.message;
            error.hidden = false;
            input.setAttribute('aria-invalid', String(Boolean(failure.invalidCode)));
            field.classList.toggle('is-invalid', Boolean(failure.invalidCode));
            if (failure.invalidCode && !reducedMotion.matches) {
                shake?.cancel();
                shake = field.animate([0, -9, 9, -7, 7, -3, 3, 0].map(x => ({ transform: `translateX(${x}px)` })), { duration: 380, easing: 'ease-in-out' });
                shake.finished.catch(() => {});
            }
            input.readOnly = button.disabled = false;
            button.textContent = 'View case study';
            input.focus();
            input.select();
        } finally {
            sending = false;
            form.removeAttribute('aria-busy');
        }
    });

    if (focus && innerWidth >= 640) input.focus({ preventScroll: true });
    return () => { shake?.cancel(); };
}

/** The preview remains in place while the reader enters the access code. */
export function openAccessDialog(item, unlocked) {
    const dialog = document.createElement('dialog');
    dialog.className = 'case-access-dialog';
    dialog.setAttribute('aria-labelledby', 'case-access-title');
    dialog.innerHTML = '<button type="button" class="case-access-dialog__close" aria-label="Close access code"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15"/></svg></button><div class="case-access-dialog__body"></div>';
    document.body.append(dialog);
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    let destroyGate;
    let cleaned = false;
    function cleanUp() {
        if (cleaned) return;
        cleaned = true;
        destroyGate?.();
        document.body.style.overflow = previousOverflow;
        dialog.remove();
        if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    }
    destroyGate = renderAccessGate(dialog.querySelector('.case-access-dialog__body'), item, content => {
        dialog.close();
        cleanUp();
        unlocked(content);
    }, { focus: false });
    dialog.querySelector('.case-access-dialog__close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', cleanUp, { once: true });
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    if (innerWidth >= 640) dialog.querySelector('input').focus({ preventScroll: true });
}
