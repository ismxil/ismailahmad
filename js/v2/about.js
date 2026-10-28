import { initBookingModal } from './booking-modal.js';
import { initDock } from './dock.js';
import { experienceItems } from './experience.js';
import { renderBooksPreview } from './books.js';
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

const experience = document.getElementById('about-experience');
experienceItems.forEach(item => {
    const entry = document.createElement('div');
    const years = document.createElement('p');
    years.className = 'about-experience__years';
    years.textContent = item.years;
    const company = document.createElement('p');
    company.className = 'about-experience__company';
    company.textContent = item.company;
    const role = document.createElement('p');
    role.textContent = item.role;
    entry.append(years, company, role);
    experience.appendChild(entry);
});

initDock();
initBookingModal();
renderWandering(document.getElementById('wander-wall'));
renderBooksPreview(document.getElementById('about-books'));
document.getElementById('footer-year').textContent = String(new Date().getFullYear());
initPile(document.getElementById('pile'));
