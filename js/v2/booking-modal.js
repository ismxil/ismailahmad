const CAL_LINK = 'ismxil/intro30min';
let embedReady;

/** Cal's native popup supplies the overlay, responsive calendar and close control. */
function loadEmbed() {
    if (embedReady) return embedReady;
    embedReady = new Promise((resolve, reject) => {
        if (window.Cal?.loaded) {
            resolve(window.Cal);
            return;
        }
        // Cal's documented queue lets the embed consume commands during startup.
        const cal = window.Cal = window.Cal || function (...args) { cal.q.push(args); };
        cal.q = cal.q || [];
        cal.ns = cal.ns || {};
        cal.loaded = true;
        const script = document.createElement('script');
        script.src = 'https://app.cal.com/embed/embed.js';
        script.onload = () => resolve(window.Cal);
        script.onerror = () => reject(new Error('Calendar could not load'));
        document.head.append(script);
        cal('init', { origin: 'https://cal.com' });
        cal('ui', { theme: 'light', layout: 'month_view', hideEventTypeDetails: false });
    });
    return embedReady;
}

export function initBookingModal() {
    document.querySelectorAll('[data-book-call]').forEach(trigger => {
        let opening = false;
        trigger.addEventListener('click', async event => {
            event.preventDefault();
            if (opening) return;
            opening = true;
            trigger.setAttribute('aria-busy', 'true');
            try {
                const cal = await loadEmbed();
                cal('modal', {
                    calLink: CAL_LINK,
                    config: { theme: 'light', layout: 'month_view' },
                });
            } catch {
                // The ordinary booking link remains usable if the embed is blocked.
                window.location.assign(trigger.href);
            } finally {
                opening = false;
                trigger.removeAttribute('aria-busy');
            }
        });
    });
}
