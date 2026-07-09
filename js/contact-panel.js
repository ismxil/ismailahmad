(function () {
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
