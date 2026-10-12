import { coffeeIcon, walkingIcon, sleepingIcon } from './icons.js';

/**
 * The bubble above the portrait: what Ismail is probably up to right now.
 *
 * The hour is the reader's own, so the line lands with their day rather
 * than a clock they cannot see. Hovering and the photo swap are pure CSS;
 * this only keeps the words true, reading the clock again on every hover
 * rather than once at load.
 */
const STATES = [
    { until: 7, text: 'finding it hard to sleep?', icon: sleepingIcon },
    { until: 18, text: 'busy, working at a cafe', icon: coffeeIcon },
    { until: 21, text: 'taking a walk', icon: walkingIcon },
    { until: 24, text: 'finding it hard to sleep?', icon: sleepingIcon },
];

export function presenceFor(hour) {
    return STATES.find(state => hour < state.until) || STATES[STATES.length - 1];
}

export function initPresence() {
    const portrait = document.querySelector('.identity__portrait');
    const bubble = portrait?.querySelector('.identity__presence');
    if (!bubble) return;

    const paint = () => {
        const { text, icon } = presenceFor(new Date().getHours());
        bubble.innerHTML = `${icon}<span>${text}</span>`;
    };

    paint();
    // The reader may leave the page open across a change of hour.
    portrait.addEventListener('pointerenter', paint);
    portrait.addEventListener('focusin', paint);
}
