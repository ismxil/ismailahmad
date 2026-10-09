import { initDock } from './dock.js';
import { experienceItems } from './experience.js';

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
document.getElementById('footer-year').textContent = String(new Date().getFullYear());
