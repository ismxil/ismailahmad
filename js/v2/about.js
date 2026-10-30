import { initBookingModal } from './booking-modal.js';
import { initDock } from './dock.js';
import { initStatus } from './presence.js';
import { initPile } from './pile.js';
import { articleSignature } from './icons.js';
import { renderWandering } from './wandering.js';

const bio = document.querySelector('.about-bio');
const signatureTemplate = document.createElement('template');
signatureTemplate.innerHTML = articleSignature;
const signature = signatureTemplate.content.firstElementChild;
signature.classList.replace('post-signature', 'about-signature');
bio.append(signature);

const themeButton = document.getElementById('theme-toggle');
themeButton.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (error) {}
});

initStatus();

initDock();
initBookingModal();
renderWandering(document.getElementById('wander-wall'));
document.getElementById('footer-year').textContent = String(new Date().getFullYear());
initPile(document.getElementById('pile'));
