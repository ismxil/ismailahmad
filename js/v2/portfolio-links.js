import { openAccessDialog } from './case-access.js';

let initialized = false;
let opening = false;

/** Ask for access on the current page before navigating to the portfolio. */
export function initPortfolioLinks() {
    if (initialized) return;
    initialized = true;
    document.addEventListener('click', async event => {
        const link = event.target.closest('a[href]');
        if (!link || new URL(link.href).origin !== 'https://pdf.ismailahmad.com') return;
        event.preventDefault();
        if (opening || document.querySelector('.case-access-dialog[open]')) return;
        opening = true;
        if (!document.querySelector('link[href="/css/v2/access.css"]')) {
            const styles = document.createElement('link');
            styles.rel = 'stylesheet';
            styles.href = '/css/v2/access.css';
            const loaded = new Promise(resolve => { styles.onload = styles.onerror = resolve; });
            document.head.append(styles);
            await loaded;
        }
        opening = false;
        openAccessDialog({ slug: 'portfolio' }, () => location.assign(link.href));
    });
}
