/**
 * Secondary-page header — contracts into a pill once the page moves.
 *
 * The same behaviour on every page that carries .site-header--sticky, so
 * the header reads as one fixture of the site rather than something each
 * page reinvents.
 */

export function initStickyHeader(header = document.querySelector('.site-header--sticky')) {
    if (!header) return;

    function update() {
        // Separate enter/exit thresholds keep the pill stable near the top.
        const threshold = header.classList.contains('is-scrolled') ? 16 : 48;
        header.classList.toggle('is-scrolled', window.scrollY > threshold);
    }

    window.addEventListener('scroll', update, { passive: true });
    // Restoring a scrolled page from the back/forward cache fires no scroll.
    window.addEventListener('pageshow', update);
    update();
}
