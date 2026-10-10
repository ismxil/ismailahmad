/**
 * Contact card — a small floating panel opened from the profile picture.
 *
 * Modelled on Koto's city card: a photo, the local time ticking, and a way
 * to say hello. Built as a native <dialog> like the menu and the lightbox,
 * so the backdrop, focus trap and Escape all come from the browser.
 */

const EMAIL = 'ismxilahmad@gmail.com';
const CITY = 'Berlin';
const TZ = 'Europe/Berlin';

const LINKS = [
    { label: 'LinkedIn', href: 'https://linkedin.com/in/ismxil' },
    { label: 'X', href: 'https://x.com/ismxilahmad' },
    { label: 'Behance', href: 'https://www.behance.net/ismxil' },
    { label: 'Instagram', href: 'https://instagram.com/ismxilahmad' },
    { label: 'GitHub', href: 'https://github.com/ismxil' },
    { label: 'CV', href: '/assets/cv.pdf' },
];

let dialog;
let tick;
let previousOverflow = '';

function clockFace() {
    // Hour ticks drawn once; the hands are positioned per frame in setTime()
    const ticks = Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        const x1 = 50 + Math.sin(a) * 38;
        const y1 = 50 - Math.cos(a) * 38;
        const x2 = 50 + Math.sin(a) * 42;
        const y2 = 50 - Math.cos(a) * 42;
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}"
            y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" opacity="0.25" />`;
    }).join('');

    return `<svg class="card-clock__face" viewBox="0 0 100 100" aria-hidden="true">
        ${ticks}
        <line class="card-clock__hour" x1="50" y1="50" x2="50" y2="28" stroke="currentColor"
            stroke-width="3.5" stroke-linecap="round" />
        <line class="card-clock__minute" x1="50" y1="50" x2="50" y2="18" stroke="currentColor"
            stroke-width="2.5" stroke-linecap="round" />
        <circle cx="50" cy="50" r="2.5" fill="currentColor" />
    </svg>`;
}

function setTime() {
    if (!dialog) return;

    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour').value);
    const minute = Number(parts.find((p) => p.type === 'minute').value);

    const label = dialog.querySelector('.card-clock__time');
    if (label) label.textContent = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    const h = dialog.querySelector('.card-clock__hour');
    const m = dialog.querySelector('.card-clock__minute');
    if (h) h.setAttribute('transform', `rotate(${(hour % 12) * 30 + minute * 0.5} 50 50)`);
    if (m) m.setAttribute('transform', `rotate(${minute * 6} 50 50)`);
}

function release() {
    document.body.style.overflow = previousOverflow;
    clearInterval(tick);
    tick = undefined;
}

function hide() {
    release();
    if (dialog?.open) dialog.close();
}

function build() {
    if (dialog) return dialog;

    dialog = document.createElement('dialog');
    dialog.className = 'contact-card';
    dialog.setAttribute('aria-label', 'Contact details');
    dialog.innerHTML = `
        <div class="card-head">
            <span class="card-city">${CITY}</span>
            <button type="button" data-close aria-label="Close"><kbd>esc</kbd></button>
        </div>

        <div class="card-tiles">
            <span class="card-photo">
                <img src="/assets/contact/profile.jpg" alt="Ismail Ahmad" width="280" height="347" />
            </span>
            <span class="card-clock">
                ${clockFace()}
                <span class="card-clock__time">--:--</span>
            </span>
        </div>

        <a class="card-hello" href="mailto:${EMAIL}">
            <span class="card-hello__label">Say hello</span>
            <span class="card-hello__value">${EMAIL}</span>
        </a>

        <div class="card-links">
            ${LINKS.map((l) => `<a class="chip" href="${l.href}" target="_blank"
                rel="noopener noreferrer">${l.label}</a>`).join('')}
        </div>`;
    document.body.appendChild(dialog);

    dialog.querySelector('[data-close]').addEventListener('click', hide);
    dialog.addEventListener('cancel', hide);
    dialog.addEventListener('close', release);
    dialog.addEventListener('click', (e) => {
        if (e.target === dialog) hide();
    });

    return dialog;
}

function open() {
    build();
    setTime();
    clearInterval(tick);
    tick = setInterval(setTime, 10000);
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
}

export function initContactCard() {
    const avatar = document.querySelector('.identity__avatar');
    if (!avatar) return;

    // The avatar was a plain <span>; make it a real control so it is
    // reachable by keyboard and announced as opening a dialog.
    avatar.setAttribute('role', 'button');
    avatar.setAttribute('tabindex', '0');
    avatar.setAttribute('aria-haspopup', 'dialog');
    avatar.setAttribute('aria-label', 'Contact details');
    avatar.classList.add('identity__avatar--button');

    avatar.addEventListener('click', open);
    avatar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open();
        }
    });
}
