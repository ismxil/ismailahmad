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

// Signed and dated like a paper Lebenslauf, as of the day it is read.
const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
document.getElementById('cv-place-date').textContent = `Berlin, ${month}`;

initDock();
document.getElementById('footer-year').textContent = String(new Date().getFullYear());
