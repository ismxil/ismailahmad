(function () {
    var CTA_SELECTOR = '#about-talk-btn, [data-open-contact]';

    function openContactPanel() {
        var panel = document.getElementById('contact-panel');
        var closeBtn = document.getElementById('close-contact');
        if (!panel) return;
        panel.classList.add('is-open');
        panel.setAttribute('aria-hidden', 'false');
        if (closeBtn) closeBtn.focus();
    }

    function closeContactPanel() {
        var panel = document.getElementById('contact-panel');
        if (!panel) return;
        panel.classList.remove('is-open');
        panel.setAttribute('aria-hidden', 'true');
    }

    window.openContactPanel = openContactPanel;
    window.closeContactPanel = closeContactPanel;

    // Document-level delegation so page CTAs keep working across SPA
    // body swaps. Guard against duplicate listeners if this file re-runs.
    if (!window.__contactCtaDelegated) {
        window.__contactCtaDelegated = true;
        document.addEventListener('click', function (e) {
            var trigger = e.target.closest && e.target.closest(CTA_SELECTOR);
            if (!trigger) return;
            e.preventDefault();
            openContactPanel();
        });
    }

    window.initContactPanel = function () {
        var panel = document.getElementById('contact-panel');
        var closeBtn = document.getElementById('close-contact');
        var openContactBtn = document.getElementById('open-contact');
        var moreBtn = document.getElementById('contact-more-btn');

        if (!panel || !closeBtn) return;

        closeBtn.addEventListener('click', closeContactPanel);
        if (openContactBtn) openContactBtn.addEventListener('click', openContactPanel);
        if (moreBtn) moreBtn.addEventListener('click', openContactPanel);

        panel.addEventListener('click', function (e) {
            if (e.target === panel) closeContactPanel();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && panel.classList.contains('is-open')) {
                e.preventDefault();
                closeContactPanel();
            }
        });
    };
})();
