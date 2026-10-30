const form = document.getElementById('portfolio-access');
const error = document.getElementById('portfolio-error');
let opened = false;
async function unlock() {
    if (opened) return;
    opened = true;
    document.body.classList.remove('is-locked');
    document.querySelector('.portfolio-gate').hidden = true;
    await import('./pdf.js');
}
form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    error.textContent = '';
    try {
        const response = await fetch('/api/case-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: 'portfolio', code: form.elements.code.value }) });
        const data = await response.json();
        if (response.ok && data.unlocked) await unlock();
        else error.textContent = data.error || 'Please try again.';
    } catch { error.textContent = 'Could not connect. Please try again.'; }
    finally { button.disabled = false; }
});
try {
    const response = await fetch('/api/case-access?slug=portfolio', { cache: 'no-store' });
    if (response.ok && (await response.json()).unlocked) await unlock();
} catch { /* The form remains available for retry. */ }
