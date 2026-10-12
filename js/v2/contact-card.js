import { mediaPlayIcon, mediaPauseIcon, mediaNextIcon, mediaPreviousIcon } from './icons.js';

/**
 * Contact card — a floating panel opened from the profile picture.
 *
 * Laid out after Koto's city card: the place name, a photo of the studio
 * carrying the "say hello" address, then a row of three tiles — what's
 * playing, the local time, and where that is on a map.
 *
 * Built as a native <dialog> like the menu and the lightbox, so the
 * backdrop, focus trap and Escape all come from the browser.
 */

const EMAIL = 'work@ismailahmad.com';
const PLACE = 'Studio, Berlin';
const CITY = 'Berlin';
const TZ = 'Europe/Berlin';

const TRACKS = [
    { title: 'Essence', artist: 'TWO LANES', cover: '/assets/audio/01-cover.jpg', src: '/assets/audio/01-essence.m4a' },
    { title: 'Immersion', artist: 'TWO LANES', cover: '/assets/audio/02-cover.jpg', src: '/assets/audio/02-immersion.m4a' },
    { title: 'Inner Motion', artist: 'TWO LANES', cover: '/assets/audio/03-cover.jpg', src: '/assets/audio/03-inner_motion.m4a' },
];
let trackIndex = 0;
let track = TRACKS[trackIndex];

const LINKS = [
    { label: 'Instagram', href: 'https://instagram.com/ismxilahmad' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/ismxil' },
    { label: 'GitHub', href: 'https://github.com/ismxil' },
    { label: 'CV', href: '/assets/cv.pdf' },
];

let dialog;
let audio;
let tick;
let previousOverflow = '';

function clockFace() {
    const ticks = Array.from({ length: 12 }, (_, i) => {
        const a = (i * 30 * Math.PI) / 180;
        const x1 = 50 + Math.sin(a) * 37;
        const y1 = 50 - Math.cos(a) * 37;
        const x2 = 50 + Math.sin(a) * 43;
        const y2 = 50 - Math.cos(a) * 43;
        return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}"
            y2="${y2.toFixed(1)}" stroke="currentColor" stroke-width="1.5"
            stroke-linecap="round" opacity="0.25" />`;
    }).join('');

    return `<svg class="card-clock__face" viewBox="0 0 100 100" aria-hidden="true">
        ${ticks}
        <line class="card-clock__hour" x1="50" y1="50" x2="50" y2="30" stroke="currentColor"
            stroke-width="3" stroke-linecap="round" />
        <line class="card-clock__minute" x1="50" y1="50" x2="50" y2="20" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" />
        <circle cx="50" cy="50" r="2.5" fill="currentColor" />
    </svg>`;
}

function setTime() {
    if (!dialog) return;

    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
        timeZoneName: 'short',
    });
    const parts = fmt.formatToParts(now);
    const hour = Number(parts.find((p) => p.type === 'hour').value);
    const minute = Number(parts.find((p) => p.type === 'minute').value);
    const zone = parts.find((p) => p.type === 'timeZoneName')?.value || '';

    const t = dialog.querySelector('.card-clock__time');
    if (t) {
        t.innerHTML = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
            + `<span class="card-clock__zone">${zone}</span>`;
    }

    const h = dialog.querySelector('.card-clock__hour');
    const m = dialog.querySelector('.card-clock__minute');
    if (h) h.setAttribute('transform', `rotate(${(hour % 12) * 30 + minute * 0.5} 50 50)`);
    if (m) m.setAttribute('transform', `rotate(${minute * 6} 50 50)`);
}

function setPlaying(on) {
    const card = dialog?.querySelector('.card-player');
    const btn = dialog?.querySelector('[data-play]');
    if (!card || !btn) return;
    card.classList.toggle('is-playing', on);
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('.card-player__icon').innerHTML = on ? mediaPauseIcon : mediaPlayIcon;
    btn.setAttribute('aria-label', `${on ? 'Pause' : 'Play'} ${track.title} by ${track.artist}`);
}

/**
 * Closing the card puts the panel away, nothing more. The record is not
 * the dialog's to stop — once it is playing, only the pause control or a
 * reload should end it, so dismissing the player leaves it running.
 */
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
    dialog.tabIndex = -1;
    dialog.innerHTML = `
        <div class="card-head">
            <span class="card-city">${PLACE}</span>
            <button type="button" data-close aria-label="Close"><kbd>esc</kbd></button>
        </div>

        <a class="card-hero" href="mailto:${EMAIL}">
            <img src="/assets/contact/studio.jpg" alt="Ismail's studio desk in Berlin"
                width="1200" height="750" />
            <span class="card-hero__hello">
                <span class="card-hero__label">Say hello</span>
                <span class="card-hero__value">${EMAIL}</span>
            </span>
        </a>

        <div class="card-tiles">
            <span class="card-tile card-player">
                <span class="card-player__disc" aria-hidden="true">
                    <img src="${track.cover}" alt="" />
                    <span class="card-player__ring card-player__ring--1"></span>
                    <span class="card-player__ring card-player__ring--2"></span>
                    <span class="card-player__ring card-player__ring--3"></span>
                    <span class="card-player__ring card-player__ring--4"></span>
                </span>
                <span class="card-player__controls">
                    <button type="button" class="card-player__btn" data-prev
                        aria-label="Previous track" title="Previous track">
                        ${mediaPreviousIcon}
                    </button>
                    <button type="button" class="card-player__btn card-player__btn--main" data-play
                        aria-pressed="false" aria-label="Play ${track.title} by ${track.artist}">
                        <span class="card-player__icon" aria-hidden="true">${mediaPlayIcon}</span>
                    </button>
                    <button type="button" class="card-player__btn" data-next
                        aria-label="Next track: ${TRACKS[1].title}" title="Next track">
                        ${mediaNextIcon}
                    </button>
                </span>
                <span class="card-player__title" data-title>${track.title}</span>
            </span>

            <span class="card-tile card-clock">
                ${clockFace()}
                <span class="card-clock__time card-tile__tag">--:--</span>
            </span>

            <span class="card-tile card-map">
                <img src="/assets/contact/berlin-map.png" alt="Map of Berlin"
                    width="256" height="256" />
                <span class="card-tile__tag">${CITY}</span>
                <span class="card-map__credit">© OpenStreetMap</span>
            </span>
        </div>

        <p class="card-audio-status" role="status" hidden></p>

        <div class="card-links">
            ${LINKS.map((l) => `<a class="chip" href="${l.href}" target="_blank"
                rel="noopener noreferrer">${l.label}</a>`).join('')}
        </div>`;
    document.body.appendChild(dialog);

    audio = new Audio(track.src);
    audio.preload = 'none';
    audio.addEventListener('ended', () => nextTrack(true));
    audio.addEventListener('pause', () => setPlaying(false));
    audio.addEventListener('play', () => setPlaying(true));

    const status = dialog.querySelector('.card-audio-status');
    function playbackError(error) {
        if (error?.name === 'AbortError') return;
        setPlaying(false);
        status.hidden = false;
        status.textContent = 'Could not play this track. Please try again.';
    }
    /** Step the record on by `step` sleeves, wrapping at either end. */
    function changeTrack(step, keepPlaying = !audio.paused) {
        audio.pause();
        trackIndex = (trackIndex + step + TRACKS.length) % TRACKS.length;
        track = TRACKS[trackIndex];
        audio.src = track.src;
        dialog.querySelector('.card-player__disc > img').src = track.cover;
        dialog.querySelector('[data-title]').textContent = track.title;
        dialog.querySelector('[data-next]').setAttribute('aria-label',
            `Next track: ${TRACKS[(trackIndex + 1) % TRACKS.length].title}`);
        dialog.querySelector('[data-prev]').setAttribute('aria-label',
            `Previous track: ${TRACKS[(trackIndex - 1 + TRACKS.length) % TRACKS.length].title}`);
        setPlaying(false);
        status.hidden = false;
        status.textContent = `${track.title} by ${track.artist}`;
        if (keepPlaying) audio.play().catch(playbackError);
    }
    function nextTrack(keepPlaying = !audio.paused) { changeTrack(1, keepPlaying); }
    dialog.querySelector('[data-next]').addEventListener('click', () => changeTrack(1));
    dialog.querySelector('[data-prev]').addEventListener('click', () => changeTrack(-1));
    audio.addEventListener('error', playbackError);
    dialog.querySelector('[data-play]').addEventListener('click', () => {
        status.hidden = true;
        if (audio.paused) {
            audio.play().catch(playbackError);
        } else {
            audio.pause();
        }
    });

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
    // The record may have been left running while the card was away.
    setPlaying(!!audio && !audio.paused);
    dialog.showModal();
    dialog.focus();
}

export function initContactCard() {
    const avatar = document.querySelector('.identity__avatar');
    if (!avatar) return;

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
