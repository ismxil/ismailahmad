import { initDock } from './dock.js';

document.getElementById('theme-toggle').addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (error) {}
});

initDock();
document.getElementById('footer-year').textContent = String(new Date().getFullYear());
