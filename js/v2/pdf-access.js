import { openAccessDialog } from './case-access.js';

let opened = false;
async function unlock() {
    if (opened) return;
    opened = true;
    document.body.classList.remove('is-locked');
    document.querySelector('.portfolio-gate').hidden = true;
    await import('./pdf.js');
}
const showGate = () => openAccessDialog({ slug: 'portfolio' }, unlock);
document.getElementById('portfolio-open').addEventListener('click', showGate);
try {
    const response = await fetch('/api/case-access?slug=portfolio', { cache: 'no-store' });
    if (response.ok && (await response.json()).unlocked) await unlock();
    else showGate();
} catch { showGate(); }
