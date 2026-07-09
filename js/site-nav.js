(function () {
    window.initSiteNav = function () {
        var nav = document.getElementById('site-header-nav');
        var moreBtn = document.getElementById('more-btn');
        var menu = document.getElementById('header-nav-menu');
        var closeBtn = document.getElementById('header-nav-menu-close');
        var monthEl = document.getElementById('nav-clock-month');
        var weekdayEl = document.getElementById('nav-clock-weekday');
        var timeEl = document.getElementById('nav-clock-time');
        var tzEl = document.getElementById('nav-clock-tz');
        var contactMenuBtn = document.getElementById('nav-menu-contact');
        var clockTimer = null;

        if (!nav || !moreBtn || !menu) return;

        function updateClock() {
            var now = new Date();
            if (monthEl) monthEl.textContent = now.toLocaleString(undefined, { month: 'long' });
            if (weekdayEl) weekdayEl.textContent = now.toLocaleString(undefined, { weekday: 'long' });
            if (timeEl) {
                timeEl.textContent = now.toLocaleString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                });
            }
            if (tzEl) {
                var parts = new Intl.DateTimeFormat(undefined, {
                    timeZoneName: 'short'
                }).formatToParts(now);
                var tzName = '';
                for (var i = 0; i < parts.length; i++) {
                    if (parts[i].type === 'timeZoneName') {
                        tzName = parts[i].value;
                        break;
                    }
                }
                tzEl.textContent = tzName || Intl.DateTimeFormat().resolvedOptions().timeZone;
            }
        }

        function setMenuOpen(open) {
            nav.classList.toggle('is-menu-open', open);
            moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            menu.setAttribute('aria-hidden', open ? 'false' : 'true');
            if (open) {
                updateClock();
                if (!clockTimer) clockTimer = setInterval(updateClock, 1000);
                if (closeBtn) closeBtn.focus();
            } else if (clockTimer) {
                clearInterval(clockTimer);
                clockTimer = null;
            }
        }

        moreBtn.addEventListener('click', function () {
            setMenuOpen(true);
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                setMenuOpen(false);
                moreBtn.focus();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && nav.classList.contains('is-menu-open')) {
                e.preventDefault();
                setMenuOpen(false);
                moreBtn.focus();
            }
        });

        document.addEventListener('click', function (e) {
            if (!nav.classList.contains('is-menu-open')) return;
            if (nav.contains(e.target)) return;
            setMenuOpen(false);
        });

        function openContactFromMenu() {
            setMenuOpen(false);
            if (typeof window.openContactPanel === 'function') {
                window.openContactPanel();
            }
        }

        if (contactMenuBtn) contactMenuBtn.addEventListener('click', openContactFromMenu);

        document.querySelectorAll('[data-nav-home], .home-logo, .brand-home, .site-header__home').forEach(function (link) {
            link.setAttribute('href', 'index.html');
        });

        updateClock();
    };
})();
