import { initBookingModal } from './booking-modal.js';
import { initDock } from './dock.js';

document.getElementById('theme-toggle').addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (error) {}
});

// The "+N" tile unfolds the rest of the client icons.
const clients = document.getElementById('cv-clients');
const more = clients.querySelector('.cv-clients__more button');
more.addEventListener('click', () => {
    clients.classList.add('is-open');
    more.setAttribute('aria-expanded', 'true');
    clients.querySelector('.cv-clients__extra a').focus({ preventScroll: true });
});

// Printing shows the folded roles too.
const earlier = document.querySelector('.cv-more');
addEventListener('beforeprint', () => { earlier.dataset.wasOpen = earlier.open; earlier.open = true; });
addEventListener('afterprint', () => { earlier.open = earlier.dataset.wasOpen === 'true'; });

initDock();
initBookingModal();
document.getElementById('footer-year').textContent = String(new Date().getFullYear());
