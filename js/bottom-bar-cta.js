/**
 * Shared Stay in touch CTA: Google Form lead capture + show-at-page-bottom.
 * Used on Home (#bottom-bar), About (.about-footer), Feed (.page-footer).
 *
 * Stay-in-touch submit order (never opens a tab / top-navigates):
 *  1) POST /api/collect-email (Vercel) → JSON {ok:true}
 *  2) Hidden iframe form POST to Google formResponse (static preview)
 *  3) fetch(..., mode:'no-cors') to Google formResponse
 * Insights newsletter stays on /api/subscribe (Substack proxy).
 */
(function () {
    var GOOGLE_FORM_ACTION =
        'https://docs.google.com/forms/d/e/1FAIpQLSdp854JJq-73BaqUVWKVk-HqjY-VcaaKqxAaa5KYs3aN7EiSA/formResponse';
    var GOOGLE_FORM_EMAIL_ENTRY = 'entry.482350635';
    var COLLECT_EMAIL_ENDPOINT = '/api/collect-email';
    var SUBSTACK_ENDPOINT = '/api/subscribe';
    var DEFAULT_ENDPOINT = COLLECT_EMAIL_ENDPOINT;
    var CONTACT_SUCCESS = 'Ahmad will be in touch';
    var SUBMIT_MIN_MS = 420;
    var NO_CORS_SUCCESS_MS = 800;

    var io = null;
    var scrollFallback = null;

    var measureCanvas = null;
    var measureCtx = null;
    var CARET_PAD = 2;

    function syncEmailState(field, input) {
        if (!field || !input) return;
        field.classList.toggle('has-value', input.value.trim().length > 0);
    }

    function getMeasureCtx() {
        if (!measureCtx) {
            measureCanvas = document.createElement('canvas');
            measureCtx = measureCanvas.getContext('2d');
        }
        return measureCtx;
    }

    function measureInputText(input, text) {
        var ctx = getMeasureCtx();
        var style = window.getComputedStyle(input);
        // Prefer full computed font shorthand so canvas matches the input.
        ctx.font = style.font
            || [style.fontStyle, style.fontWeight, style.fontSize, style.fontFamily].join(' ');
        return ctx.measureText(text || '').width;
    }

    /**
     * Grow .home-cta__email pill with typed text so emails aren't clipped.
     * Empty state clears inline widths → CSS min-width ~182px / input ~110px.
     * Insights flex fields are left alone (already fill available width).
     */
    function syncEmailWidth(field, input) {
        if (!field || !input) return;
        if (!field.classList.contains('home-cta__email')) return;

        var value = input.value;
        var sizingText = value;

        if (!sizingText) {
            input.style.width = '';
            field.style.width = '';
            field.style.maxWidth = '';
            return;
        }

        var textW = measureInputText(input, sizingText);
        var inputW = Math.ceil(textW) + CARET_PAD;

        // Cap against space left in the CTA before socials / bar edges.
        var maxInput = getMaxInputWidth(field);
        if (maxInput > 0 && inputW > maxInput) {
            inputW = maxInput;
        }

        input.style.width = inputW + 'px';
        field.style.width = '';
        field.style.maxWidth = '';
    }

    function getMaxInputWidth(field) {
        var cta = field.closest('.bottom-bar__cta');
        if (!cta) return 480;

        var form = field.closest('form') || field.parentElement;
        var submit = form && form.querySelector('.home-cta__email-submit');
        var socials = cta.querySelector('.home-cta__socials');
        var touch = field.closest('.home-cta__touch');

        var ctaW = cta.clientWidth;
        if (!ctaW) return 480;

        var reserved = 0;
        if (touch) {
            var label = touch.querySelector('.home-cta__label');
            if (label && window.getComputedStyle(label).display !== 'none') {
                reserved += label.offsetWidth + 16;
            }
        }
        if (socials && window.getComputedStyle(socials).display !== 'none') {
            reserved += socials.offsetWidth + 24;
        }
        if (submit) {
            var submitVisible = window.getComputedStyle(submit).display !== 'none';
            if (submitVisible || field.classList.contains('has-value') || form.matches(':focus-within')) {
                reserved += (submit.offsetWidth || 44) + 8;
            }
        }

        var fieldStyle = window.getComputedStyle(field);
        var icon = field.querySelector('.home-cta__email-icon');
        var padL = parseFloat(fieldStyle.paddingLeft) || 16;
        var padR = parseFloat(fieldStyle.paddingRight) || 16;
        var gap = parseFloat(fieldStyle.columnGap);
        if (isNaN(gap)) gap = parseFloat(fieldStyle.gap);
        if (isNaN(gap)) gap = 12;
        var chrome = padL + padR + gap + (icon ? icon.offsetWidth : 24);

        var available = ctaW - reserved - chrome;
        return Math.max(110, Math.floor(available));
    }

    function isGoogleFormEndpoint(endpoint) {
        return /docs\.google\.com\/forms/i.test(endpoint || '');
    }

    function isCollectEmailEndpoint(endpoint) {
        return /\/api\/collect-email/i.test(endpoint || '');
    }

    /**
     * Hidden iframe + form POST — browser-only path to Google Forms (no CORS).
     * Never uses target=_blank / window.open (those open a Google tab).
     *
     * Important: the iframe fires load for about:blank first. Treating that as
     * success removes the named target before the real POST finishes, and the
     * browser then opens Google Forms in a new tab. Only resolve on a load that
     * occurs after submit (or a short timeout if X-Frame-Options suppresses it).
     */
    function postToGoogleFormIframe(email) {
        return new Promise(function (resolve, reject) {
            var iframeName = 'gf-target-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
            var iframe = document.createElement('iframe');
            iframe.name = iframeName;
            iframe.id = iframeName;
            iframe.src = 'about:blank';
            iframe.title = 'Google Form submission';
            iframe.setAttribute('aria-hidden', 'true');
            iframe.setAttribute('tabindex', '-1');
            // allow-forms: receive the POST. allow-scripts: confirmation page may run JS.
            // allow-same-origin: Google confirmation shell. Omit allow-top-navigation /
            // allow-popups so the response cannot break out into a new tab.
            iframe.setAttribute('sandbox', 'allow-forms allow-scripts allow-same-origin');
            iframe.style.cssText = 'display:none;position:absolute;width:0;height:0;border:0;visibility:hidden;';

            var form = document.createElement('form');
            form.method = 'POST';
            form.action = GOOGLE_FORM_ACTION;
            form.target = iframeName;
            form.acceptCharset = 'utf-8';
            form.setAttribute('aria-hidden', 'true');
            form.style.display = 'none';

            function addField(name, value) {
                var input = document.createElement('input');
                input.type = 'hidden';
                input.name = name;
                input.value = value;
                form.appendChild(input);
            }

            addField(GOOGLE_FORM_EMAIL_ENTRY, email);
            addField('fvv', '1');
            addField('pageHistory', '0');
            addField('submissionTimestamp', '-1');

            var settled = false;
            var submitted = false;
            var loadsSeen = 0;
            var loadsAtSubmit = 0;
            var timer = window.setTimeout(function () {
                // Cross-origin / X-Frame-Options may suppress a reliable load event.
                // The POST itself still reaches Google; treat timeout as delivery.
                finish(true);
            }, 1600);

            function cleanup() {
                window.clearTimeout(timer);
                if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
                if (form.parentNode) form.parentNode.removeChild(form);
            }

            function finish(ok) {
                if (settled) return;
                settled = true;
                cleanup();
                if (ok) resolve();
                else reject(new Error('google form iframe submit failed'));
            }

            function doSubmit() {
                if (submitted || settled) return;
                submitted = true;
                loadsAtSubmit = loadsSeen;
                try {
                    form.submit();
                } catch (err) {
                    finish(false);
                }
            }

            iframe.addEventListener('load', function () {
                if (settled) return;
                loadsSeen += 1;
                if (!submitted) {
                    doSubmit();
                    return;
                }
                // Early submit (before blank load): first load is still about:blank — ignore.
                if (loadsAtSubmit === 0 && loadsSeen === 1) return;
                // Need a load that happened after submit.
                if (loadsSeen <= loadsAtSubmit) return;
                finish(true);
            });

            document.body.appendChild(iframe);
            document.body.appendChild(form);

            // Some browsers never fire load for about:blank — submit anyway.
            window.setTimeout(function () {
                if (!submitted) doSubmit();
            }, 80);
        });
    }

    /**
     * Opaque POST — browser sends the body; we cannot read the response.
     * Used only after API + iframe paths fail. Does not open a tab.
     */
    function postToGoogleFormNoCors(email) {
        var body = new URLSearchParams();
        body.set(GOOGLE_FORM_EMAIL_ENTRY, email);
        body.set('fvv', '1');
        body.set('pageHistory', '0');
        body.set('submissionTimestamp', '-1');

        return fetch(GOOGLE_FORM_ACTION, {
            method: 'POST',
            mode: 'no-cors',
            credentials: 'omit',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString()
        }).then(function () {
            return new Promise(function (resolve) {
                window.setTimeout(resolve, NO_CORS_SUCCESS_MS);
            });
        });
    }

    function markApiMissing() {
        var missing = new Error('collect email api unavailable');
        missing.apiMissing = true;
        return missing;
    }

    function postCollectEmail(endpoint, email, source) {
        return fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                email: email,
                source: source || 'website_footer'
            }),
            credentials: 'same-origin'
        }).then(function (res) {
            // Missing / non-API / server error → client fallbacks (iframe / no-cors).
            if (
                res.status === 404 ||
                res.status === 405 ||
                res.status === 501 ||
                res.status >= 500
            ) {
                throw markApiMissing();
            }
            var ct = (res.headers.get('content-type') || '').toLowerCase();
            if (ct && ct.indexOf('application/json') === -1 && ct.indexOf('text/json') === -1) {
                throw markApiMissing();
            }
            return res.json().catch(function () {
                // HTML/empty body from static hosts that return 200 for unknown paths.
                if (res.ok) throw markApiMissing();
                return {};
            }).then(function (data) {
                // Soft-fail JSON (ok:false on 2xx/4xx without hard reject) → try fallbacks
                // only when the API is clearly absent. Explicit client errors stay hard.
                if (res.status >= 400 && res.status < 500) {
                    var err = new Error((data && data.error) || 'collect email failed');
                    err.apiRejected = true;
                    throw err;
                }
                if (!res.ok || data.ok === false) {
                    throw markApiMissing();
                }
                // Live API must explicitly confirm — never treat bare {} as success.
                if (data.ok !== true) {
                    throw markApiMissing();
                }
            });
        }).catch(function (err) {
            if (err && (err.apiMissing || err.apiRejected)) throw err;
            // Network error on static preview → iframe / no-cors fallback.
            throw markApiMissing();
        });
    }

    function postSubscribe(endpoint, email, source) {
        return fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({
                email: email,
                source: source || 'website_footer'
            }),
            credentials: 'same-origin'
        }).then(function (res) {
            return res.json().catch(function () {
                return {};
            }).then(function (data) {
                if (!res.ok || data.ok === false) {
                    throw new Error((data && data.error) || 'subscribe failed');
                }
            });
        });
    }

    /**
     * 1) API  2) hidden iframe  3) no-cors fetch.
     * Hard 4xx from a live API still surfaces as error (no fake success).
     */
    function postStayInTouch(email, source) {
        return postCollectEmail(COLLECT_EMAIL_ENDPOINT, email, source).catch(function (err) {
            if (err && err.apiRejected) throw err;
            return postToGoogleFormIframe(email).catch(function () {
                return postToGoogleFormNoCors(email);
            });
        });
    }

    function setSubmitLoading(submit, loading) {
        if (!submit) return;
        submit.classList.toggle('is-loading', loading);
        submit.disabled = !!loading;
        if (loading) submit.setAttribute('aria-busy', 'true');
        else submit.removeAttribute('aria-busy');
    }

    function waitAtLeast(startedAt, minMs) {
        var elapsed = Date.now() - startedAt;
        var remaining = Math.max(0, minMs - elapsed);
        return new Promise(function (resolve) {
            window.setTimeout(resolve, remaining);
        });
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

        var submit = form.querySelector('.home-cta__email-submit, .insights-email__submit');
        var isContactForm = form.classList.contains('home-cta__email-form');

        // Stay-in-touch: keep action on-site so a missed preventDefault never
        // navigates to Google. Never allow target=_blank on these forms.
        if (isContactForm) {
            form.setAttribute('action', COLLECT_EMAIL_ENDPOINT);
            form.setAttribute('method', 'post');
            form.removeAttribute('target');
        }

        function sync() {
            syncEmailState(field, input);
            syncEmailWidth(field, input);
        }

        var resizeTimer = 0;
        function onResizeSync() {
            if (resizeTimer) window.clearTimeout(resizeTimer);
            resizeTimer = window.setTimeout(sync, 120);
        }

        input.addEventListener('input', sync);
        window.addEventListener('resize', onResizeSync);
        sync();

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (typeof e.stopImmediatePropagation === 'function') {
                e.stopImmediatePropagation();
            }

            var email = input.value.trim();
            if (!email || !input.checkValidity()) {
                input.reportValidity();
                return;
            }

            var endpoint = form.getAttribute('action') || DEFAULT_ENDPOINT;
            // Never POST the browser directly to Substack (CORS / redirect dump).
            if (/wandarer\.com|substack\.com/i.test(endpoint)) {
                endpoint = SUBSTACK_ENDPOINT;
            }
            // Legacy markup still pointing at Google formResponse → use API.
            if (isGoogleFormEndpoint(endpoint)) {
                endpoint = COLLECT_EMAIL_ENDPOINT;
            }
            if (isContactForm) {
                endpoint = COLLECT_EMAIL_ENDPOINT;
                form.setAttribute('action', COLLECT_EMAIL_ENDPOINT);
                form.removeAttribute('target');
            }

            var source = options.source
                || form.getAttribute('data-subscribe-source')
                || 'website_footer';

            var useStayInTouch = isContactForm
                || isCollectEmailEndpoint(endpoint)
                || isGoogleFormEndpoint(form.getAttribute('action'));
            var successText = options.successPlaceholder
                || (useStayInTouch || isContactForm ? CONTACT_SUCCESS : 'Subscribed');

            form.classList.remove('is-error');
            form.classList.remove('is-success');
            if (submit) submit.removeAttribute('data-success');
            input.readOnly = true;
            input.disabled = false;
            setSubmitLoading(submit, true);

            var startedAt = Date.now();
            var send = useStayInTouch
                ? postStayInTouch(email, source)
                : postSubscribe(endpoint, email, source);

            function clearSuccessMessage() {
                form.classList.remove('is-success');
                input.placeholder = 'Your email';
                input.readOnly = false;
                input.disabled = false;
                if (submit) {
                    submit.removeAttribute('data-success');
                    submit.setAttribute('aria-label', 'Send email');
                    submit.disabled = false;
                }
                sync();
            }

            function unlockInput() {
                input.readOnly = false;
                input.disabled = false;
            }

            send.then(function () {
                return waitAtLeast(startedAt, SUBMIT_MIN_MS);
            }).then(function () {
                setSubmitLoading(submit, false);
                form.classList.add('is-success');
                form.classList.remove('is-error');
                input.value = '';
                unlockInput();

                if (isContactForm && submit) {
                    // Stay in touch: message on the blue send button (not input placeholder).
                    submit.setAttribute('data-success', successText);
                    submit.setAttribute('aria-label', successText);
                    submit.disabled = true;
                    input.placeholder = 'Your email';
                } else {
                    input.placeholder = successText;
                }
                sync();
                window.setTimeout(clearSuccessMessage, 2800);
            }).catch(function () {
                form.classList.add('is-error');
                form.classList.remove('is-success');
                if (submit) {
                    submit.removeAttribute('data-success');
                    submit.setAttribute('aria-label', 'Send email');
                }
                input.placeholder = 'Try again';
                unlockInput();
                setSubmitLoading(submit, false);
                sync();
                window.setTimeout(function () {
                    input.placeholder = 'Your email';
                    form.classList.remove('is-error');
                }, 2400);
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
