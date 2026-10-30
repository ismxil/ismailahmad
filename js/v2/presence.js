import { sanityConfig } from '../sanity-config.js';
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

export const STATUS = 'available';
export const STATUSES = {
    available: { label: 'Available', detail: 'Open to work' },
    limited: { label: 'Limited', detail: 'Open to select projects' },
    busy: { label: 'Busy', detail: 'Fully booked for now' },
};

export async function initStatus(key) {
    const paint = value => {
        const status = STATUSES[value];
        if (!status) return;
        const identity = document.querySelector('.identity');
        if (identity) {
            identity.dataset.status = value;
            identity.querySelector('.identity__status')?.setAttribute('aria-label', `${status.label}: ${status.detail}`);
            const detail = identity.querySelector('[data-status-detail]');
            if (detail) detail.textContent = status.label;
        }
        const contact = document.querySelector('[data-availability-contact]');
        if (contact) contact.textContent = { available: "I'm available for work.", limited: "I have limited availability for new projects.", busy: "I'm currently fully booked." }[value];
    };
    paint(key || STATUS);
    if (key) return;
    try {
        const url = new URL(`https://${sanityConfig.projectId}.api.sanity.io/v${sanityConfig.apiVersion}/data/query/${sanityConfig.dataset}`);
        url.searchParams.set('query', '*[_id == "site-settings"][0].availability');
        url.searchParams.set('perspective', 'published');
        const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
        if (response.ok) paint((await response.json()).result);
    } catch { /* Keep the default when the CMS is unavailable. */ }
}
