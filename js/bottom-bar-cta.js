/**
 * Shared Stay in touch CTA: Substack subscribe + show-at-page-bottom.
 * Used on Home (#bottom-bar), About (.about-footer), Feed (.page-footer).
 */
(function () {
    var DEFAULT_ENDPOINT = 'https://wandarer.com/api/v1/free';
    var io = null;
    var scrollFallback = null;

    function syncEmailState(field, input) {
        if (!field || !input) return;
        field.classList.toggle('has-value', input.value.trim().length > 0);
    }

    function postSubscribe(endpoint, email, source) {
        var body = new URLSearchParams({
            email: email,
            source: source || 'website_footer'
        });

        return fetch(endpoint + '?nojs=true', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
            mode: 'cors',
            credentials: 'omit'
        }).then(function (res) {
            if (!res.ok) throw new Error('subscribe failed');
        });
    }

    function fallbackFormPost(endpoint, email) {
        var tmp = document.createElement('form');
        tmp.method = 'POST';
        tmp.action = endpoint;
        tmp.target = '_blank';
        tmp.rel = 'noopener';
        tmp.style.display = 'none';
        var field = document.createElement('input');
        field.type = 'hidden';
        field.name = 'email';
        field.value = email;
        tmp.appendChild(field);
        document.body.appendChild(tmp);
        tmp.submit();
        tmp.remove();
    }

    /**
     * @param {HTMLFormElement} form
     * @param {{
     *   fieldSelector?: string,
     *   inputSelector?: string,
     *   source?: string,
     *   successPlaceholder?: string
     * }} [options]
     */
    function initSubscribeForm(form, options) {
        if (!form) return;
        options = options || {};

        var field = form.querySelector(
            options.fieldSelector || '.home-cta__email, .insights-email, [data-subscribe-field]'
        );
        var input = form.querySelector(
            options.inputSelector || 'input[type="email"]'
        );
        if (!field || !input) return;

        // Avoid duplicate listeners across SPA revisits of the same node
        // (shouldn't happen after body swap, but safe if init runs twice).
        if (form.dataset.subscribeBound === '1') return;
        form.dataset.subscribeBound = '1';

        function sync() {
            syncEmailState(field, input);
        }

        input.addEventListener('input', sync);
        sync();

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var email = input.value.trim();
            if (!email || !input.checkValidity()) {
                input.reportValidity();
                return;
            }

            var endpoint = form.getAttribute('action') || DEFAULT_ENDPOINT;
            var source = options.source
                || form.getAttribute('data-subscribe-source')
                || 'website_footer';

            postSubscribe(endpoint, email, source).then(function () {
                form.classList.add('is-success');
                input.value = '';
                input.placeholder = options.successPlaceholder || 'Subscribed';
                sync();
                window.setTimeout(function () {
                    input.placeholder = 'Your email';
                    form.classList.remove('is-success');
                }, 2400);
            }).catch(function () {
                fallbackFormPost(endpoint, email);
            });
        });
    }

    function initAllSubscribeForms() {
        document.querySelectorAll('form.home-cta__email-form, form.js-subscribe-form').forEach(function (form) {
            initSubscribeForm(form);
        });
    }

    function findBottomBar() {
        return document.getElementById('bottom-bar')
            || document.querySelector('.about-footer')
            || document.querySelector('.page-footer');
    }

    function findSentinel() {
        return document.querySelector('.page-end-sentinel, .home-page-end');
    }

    function setAtBottom(bar, cta, atBottom) {
        bar.classList.toggle('is-at-bottom', atBottom);
        cta.setAttribute('aria-hidden', atBottom ? 'false' : 'true');
        if (atBottom) cta.removeAttribute('inert');
        else cta.setAttribute('inert', '');
    }

    function teardownBottomBarCta() {
        if (io) {
            io.disconnect();
            io = null;
        }
        if (scrollFallback) {
            window.removeEventListener('scroll', scrollFallback);
            window.removeEventListener('resize', scrollFallback);
            scrollFallback = null;
        }
    }

    function initBottomBarCta() {
        teardownBottomBarCta();

        var bar = findBottomBar();
        var cta = bar && bar.querySelector('.bottom-bar__cta');
        var sentinel = findSentinel();
        if (!bar || !cta) return;

        function apply(atBottom) {
            setAtBottom(bar, cta, atBottom);
        }

        // Non-scrolling pages (e.g. Feed canvas) have no end sentinel — keep CTA visible.
        if (!sentinel) {
            apply(true);
            return;
        }

        if ('IntersectionObserver' in window) {
            io = new IntersectionObserver(function (entries) {
                apply(entries.some(function (entry) { return entry.isIntersecting; }));
            }, {
                root: null,
                rootMargin: '0px 0px 100px 0px',
                threshold: 0
            });
            io.observe(sentinel);
            return;
        }

        scrollFallback = function () {
            var doc = document.documentElement;
            var nearBottom = (window.innerHeight + window.scrollY) >= (doc.scrollHeight - 120);
            apply(nearBottom);
        };
        window.addEventListener('scroll', scrollFallback, { passive: true });
        window.addEventListener('resize', scrollFallback);
        scrollFallback();
    }

    window.initSubscribeForm = initSubscribeForm;
    window.initAllSubscribeForms = initAllSubscribeForms;
    window.initBottomBarCta = initBottomBarCta;
    window.teardownBottomBarCta = teardownBottomBarCta;
})();
