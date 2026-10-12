import { arrowRightIcon, mailIcon } from './icons.js';

/**
 * The quiet invitation at the end of an article.
 *
 * One field, one arrow, no dialog and no overlay — it waits at the end of
 * the piece for anyone who got that far. Posts to /api/subscribe, which
 * holds the Kit key server-side.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MARKUP = `
    <p class="subscribe__lead" role="status" aria-live="polite">Enjoyed reading this?</p>
    <p class="subscribe__note">I share occasional thoughts on design, business, life. Delivered to your inbox.</p>
    <form class="subscribe__form" novalidate>
        <label class="subscribe__field">
            <span class="subscribe__label">Your email address</span>
            <input type="email" name="email" inputmode="email" autocomplete="email"
                placeholder="Your email address" maxlength="254" required />
        </label>
        <button type="submit" aria-label="Subscribe" disabled>
            ${arrowRightIcon}
        </button>
        <label class="subscribe__trap" aria-hidden="true">
            Leave this field empty
            <input type="text" name="website" tabindex="-1" autocomplete="off" />
        </label>
    </form>
    <p class="subscribe__fine">No noise. Just ideas worth sharing.</p>
    <p class="subscribe__status" role="status" aria-live="polite"></p>`;

/**
 * @param {HTMLElement} mount
 * @param {string} source  Which page earned the signup, e.g. "article:fawning".
 */
export function renderSubscribe(mount, source = 'website') {
    if (!mount) return;
    mount.className = 'subscribe';
    mount.innerHTML = MARKUP;

    const form = mount.querySelector('form');
    const input = form.querySelector('input[name="email"]');
    const trap = form.querySelector('input[name="website"]');
    const button = form.querySelector('button');
    const status = mount.querySelector('.subscribe__status');
    const lead = mount.querySelector('.subscribe__lead');
    const note = mount.querySelector('.subscribe__note');
    let submitting = false;
    const validEmail = () => {
        const email = input.value.trim();
        return email.length <= 254 && EMAIL_RE.test(email) && input.validity.valid;
    };
    const updateValidity = () => {
        button.disabled = submitting || !validEmail();
        input.removeAttribute('aria-invalid');
        if (!submitting) status.textContent = '';
    };
    input.addEventListener('input', updateValidity);
    input.addEventListener('change', updateValidity);
    input.addEventListener('blur', () => {
        if (input.value.trim() && !validEmail()) {
            input.setAttribute('aria-invalid', 'true');
            status.textContent = 'Please enter a valid email address.';
        }
    });
    updateValidity();

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const email = input.value.trim();
        if (submitting) return;
        if (!validEmail()) {
            input.setAttribute('aria-invalid', 'true');
            status.textContent = 'That email does not look right.';
            input.focus();
            return;
        }

        submitting = true;
        button.disabled = true;
        input.disabled = true;
        status.textContent = 'One moment…';

        try {
            const response = await fetch('/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, source, website: trap.value, referrer: location.href }),
            });
            const data = await response.json().catch(() => ({}));

            if (response.ok && data.ok !== false) {
                form.remove();
                if (data.state !== 'active') lead.insertAdjacentHTML('beforebegin', mailIcon);
                lead.textContent = data.state === 'active' ? 'You are on the list.' : 'Almost there';
                note.textContent = data.state === 'active' ? 'Thank you for subscribing.' : 'Check your inbox to confirm your subscription.';
                mount.querySelector('.subscribe__fine').remove();
                status.textContent = '';
                // The signup shows up in Vercel Analytics next to the article
                // that produced it. inject() in analytics.js defines window.va;
                // on a local server or with analytics blocked it is absent.
                window.va?.('event', { name: 'subscribe', data: { source } });
                return;
            }
            status.textContent = data.error || 'That did not go through. Try again?';
        } catch {
            status.textContent = 'Could not reach the server. Please try again.';
        } finally {
            submitting = false;
            input.disabled = false;
            button.disabled = !validEmail();
        }
    });
}
