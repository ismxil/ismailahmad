import { coffeeIcon, walkingIcon, sleepingIcon } from './icons.js';

/**
 * The bubble above the portrait: what Ismail is probably up to right now.
 *
 * The hours are Berlin's, not the reader's — the line is about him, so a
 * visitor in Lagos still sees "taking a walk" when it is evening here.
 * Hover and the photo swap is pure CSS; this only keeps the words true,
 * reading the clock again on every hover rather than once at load.
 */
const TZ = 'Europe/Berlin';

const STATES = [
    { until: 5, text: 'finding it hard to sleep?', icon: sleepingIcon },
    { until: 17, text: 'busy, working at a cafe', icon: coffeeIcon },
    { until: 22, text: 'taking a walk', icon: walkingIcon },
    { until: 24, text: 'finding it hard to sleep?', icon: sleepingIcon },
];

function berlinHour(now = new Date()) {
    const hour = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(now);
    return Number(hour) % 24;
}

export function presenceFor(hour) {
    return STATES.find(state => hour < state.until) || STATES[STATES.length - 1];
}

export function initPresence() {
    const portrait = document.querySelector('.identity__portrait');
    const bubble = portrait?.querySelector('.identity__presence');
    if (!bubble) return;

    const paint = () => {
        const { text, icon } = presenceFor(berlinHour());
        bubble.innerHTML = `${icon}<span>${text}</span>`;
    };

    paint();
    // The reader may leave the page open across a change of hour.
    portrait.addEventListener('pointerenter', paint);
    portrait.addEventListener('focusin', paint);
}
