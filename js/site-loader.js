/**
 * Wait for portfolio typefaces before revealing the page.
 * Feed grid intro (infinite-grid.js) is unchanged — it runs after this resolves.
 */
(function () {
    const MIN_MS = 380;
    const FONTS = [
        '400 1em "Reckless"',
        '500 1em "Reckless"',
        '400 1em "Suisse Intl"',
        '500 1em "Suisse Intl"',
    ];

    function waitForFonts() {
        if (!document.fonts) return Promise.resolve();
        return Promise.all(
            FONTS.map((face) => document.fonts.load(face).catch(() => {}))
        ).then(() => document.fonts.ready);
    }

    function reveal() {
        const root = document.documentElement;
        const loader = document.getElementById('site-loader');

        root.classList.add('is-ready');
        root.classList.remove('is-loading');

        if (!loader) return;

        loader.classList.add('is-done');
        loader.addEventListener('transitionend', () => {
            loader.remove();
        }, { once: true });
    }

    window.siteReady = Promise.all([
        waitForFonts(),
        new Promise((resolve) => { window.setTimeout(resolve, MIN_MS); }),
    ]).then(reveal);

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.catch(() => {});
    }
})();
