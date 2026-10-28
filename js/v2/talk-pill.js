import { bindBookingTrigger } from './booking-modal.js';

let suppressed = false;
let updateVisibility = () => {};

/** Search temporarily hides the invitation without overriding its scroll gate. */
export function setTalkPillHidden(hidden) {
    suppressed = hidden;
    updateVisibility();
}

/** Called only by Home, CV and Archive, independently of page search. */
export function initTalkPill() {
    if (document.querySelector('.dock-float')) return;
    const footer = document.querySelector('.site-footer');
    if (!footer) return;
    const talk = document.createElement('a');
    talk.className = 'talk-pill';
    talk.href = 'https://cal.com/ismxil/intro30min';
    talk.innerHTML = `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17,8v-1c0-1.6569-1.3431-3-3-3H6c-1.6569,0-3,1.3431-3,3v1h14Z" fill="currentColor" stroke="none"/><path d="M6 4V2M14 4V2M14 17v-6M11 14h6"/><path d="m17,9.2395v-2.2395c0-1.6569-1.3431-3-3-3H6c-1.6569,0-3,1.3431-3,3v6c0,1.6569,1.3431,3,3,3h2.1492"/></svg><span>Talk to me</span>`;
    bindBookingTrigger(talk);
    const float = document.createElement('div');
    float.className = 'dock-float';
    float.append(talk);
    float.hidden = true;
    let slot = document.querySelector('[data-page-search-slot]');
    if (!slot) {
        slot = document.createElement('div');
        slot.className = 'page-search-slot';
        slot.setAttribute('data-page-search-slot', '');
        footer.before(slot);
    }
    document.body.appendChild(float);

    // Reveal shortly before the footer reaches the viewport, then lift above it.
    // Outside the shell, fixed positioning is unaffected by page animations.
    let positionFrame = 0;
    updateVisibility = () => {
        const footerTop = footer.getBoundingClientRect().top;
        const base = window.innerWidth >= 640 ? 24 : 16;
        float.hidden = suppressed || footerTop > window.innerHeight + 160;
        float.style.setProperty('--search-bottom', `${Math.max(base, window.innerHeight - footerTop + 16)}px`);
    };
    function schedulePosition() {
        if (positionFrame) return;
        positionFrame = window.requestAnimationFrame(() => {
            positionFrame = 0;
            updateVisibility();
        });
    }
    window.addEventListener('scroll', schedulePosition, { passive: true });
    window.addEventListener('resize', schedulePosition);
    window.addEventListener('pageshow', schedulePosition);
    if ('ResizeObserver' in window) {
        const observer = new window.ResizeObserver(schedulePosition);
        observer.observe(document.body);
        observer.observe(footer);
    }
    updateVisibility();
}
