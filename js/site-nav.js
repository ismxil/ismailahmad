(function () {
    window.initSiteNav = function () {
        var nav = document.getElementById('site-header-nav');
        var morph = document.getElementById('nav-morph');
        var moreBtn = document.getElementById('more-btn');
        var menu = document.getElementById('header-nav-menu');
        var pills = document.getElementById('header-nav-pills');
        var monthEl = document.getElementById('nav-clock-month');
        var weekdayEl = document.getElementById('nav-clock-weekday');
        var timeEl = document.getElementById('nav-clock-time');
        var tzEl = document.getElementById('nav-clock-tz');
        var contactMenuBtn = document.getElementById('nav-menu-contact');
        var clockTimer = null;

        if (!nav || !moreBtn || !menu) return;
        if (!morph) morph = nav;

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

        function measureClosedSize() {
            if (!morph || nav.classList.contains('is-menu-open')) return;
            morph.style.width = 'max-content';
            morph.style.height = 'auto';
            morph.style.removeProperty('--nav-closed-w');
            morph.style.removeProperty('--nav-closed-h');
            nav.style.removeProperty('--nav-closed-w');
            nav.style.removeProperty('--nav-closed-h');
            var width = morph.offsetWidth;
            var height = morph.offsetHeight || (pills ? pills.offsetHeight : 44);
            morph.style.setProperty('--nav-closed-w', width + 'px');
            morph.style.setProperty('--nav-closed-h', height + 'px');
            nav.style.setProperty('--nav-closed-w', width + 'px');
            nav.style.setProperty('--nav-closed-h', height + 'px');
            morph.style.width = '';
            morph.style.height = '';
        }

        function setMenuOpen(open) {
            if (open) measureClosedSize();
            nav.classList.toggle('is-menu-open', open);
            moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
            moreBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
            menu.setAttribute('aria-hidden', open ? 'false' : 'true');
            if (open) {
                updateClock();
                if (!clockTimer) clockTimer = setInterval(updateClock, 1000);
            } else if (clockTimer) {
                clearInterval(clockTimer);
                clockTimer = null;
                window.setTimeout(measureClosedSize, 450);
            }
        }

        moreBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            setMenuOpen(!nav.classList.contains('is-menu-open'));
        });

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

        window.addEventListener('resize', function () {
            if (!nav.classList.contains('is-menu-open')) measureClosedSize();
        });

        updateClock();
        measureClosedSize();
    };
})();
