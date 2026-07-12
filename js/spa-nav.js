/**
 * Lightweight same-origin page swapper.
 *
 * The site is a set of static multi-page documents. Clicking between them
 * normally causes a full reload, which kills the <audio> element and
 * restarts the music. This intercepts clicks to the site's own pages,
 * fetches the destination HTML, swaps <head>/<body> in place, and re-runs
 * the destination page's scripts — while keeping the live #site-audio
 * element (and therefore playback) untouched across the swap.
 */
(function () {
    var PAGES = ['index.html', 'about.html', 'feeds.html', 'insights.html'];
    var isNavigating = false;

    function isInternalPageUrl(url) {
        try {
            var u = new URL(url, window.location.href);
            if (u.origin !== window.location.origin) return false;
            var file = u.pathname.split('/').pop() || 'index.html';
            return PAGES.indexOf(file) !== -1;
        } catch (e) {
            return false;
        }
    }

    // Best-effort GPU cleanup so repeated navigation doesn't pile up
    // orphaned WebGL contexts from the 3D logo canvases.
    function loseWebGLContexts(root) {
        var canvases = root.querySelectorAll('canvas');
        canvases.forEach(function (canvas) {
            ['webgl2', 'webgl', 'experimental-webgl'].some(function (type) {
                var ctx = null;
                try { ctx = canvas.getContext(type); } catch (e) {}
                if (!ctx) return false;
                var ext = ctx.getExtension('WEBGL_lose_context');
                if (ext) ext.loseContext();
                return true;
            });
        });
    }

    // Re-creating <script> elements is required because innerHTML/importNode
    // -inserted scripts are inert. Classic scripts whose src has already
    // been executed once are skipped (their window.initX functions already
    // exist and don't need redefining). Module scripts with a src are
    // cache-busted so top-level side effects re-run on revisits.
    //
    // Scripts run one at a time, in document order — a dynamically-inserted
    // <script src> loads asynchronously by default, so without this a
    // trailing inline init script could execute before an earlier external
    // file it depends on has finished loading.
    function runOneScript(old) {
        var src = old.getAttribute('src');
        var isModule = old.getAttribute('type') === 'module';

        if (src) {
            var resolved = new URL(src, window.location.href).href;

            // old is the inert placeholder that just came in via
            // importNode — it doesn't count as "already loaded". Only a
            // script this function previously created and ran (tagged
            // below) should suppress a re-run.
            if (!isModule && document.querySelector('script[data-spa-ran][src="' + src + '"]')) {
                old.remove();
                return Promise.resolve();
            }
            old.remove();

            return new Promise(function (resolve) {
                var s = document.createElement('script');
                if (old.type) s.type = old.type;
                s.setAttribute('data-spa-ran', 'true');
                var finalSrc = src;
                if (isModule) {
                    finalSrc = resolved + (resolved.indexOf('?') === -1 ? '?' : '&') + '_spanav=' + Date.now();
                }
                s.src = finalSrc;
                s.onload = resolve;
                s.onerror = resolve; // don't block the chain on a failed asset
                document.body.appendChild(s);
            });
        }

        old.remove();
        var s2 = document.createElement('script');
        if (old.type) s2.type = old.type;
        s2.textContent = old.textContent;
        document.body.appendChild(s2);
        return Promise.resolve();
    }

    function runScripts(root) {
        var scripts = Array.prototype.slice.call(root.querySelectorAll('script'));
        return scripts.reduce(function (chain, old) {
            return chain.then(function () { return runOneScript(old); });
        }, Promise.resolve());
    }

    // site-loader.js lives in <head>, which is swapped via innerHTML (so
    // its script tag is inert) and is otherwise left alone on purpose —
    // re-running every head script would also reload gsap/Tailwind's CDN
    // bundles and reset global state they own. This re-runs *just* the
    // loader, cache-busted so its per-page boot() animation replays and
    // window.siteReady is reassigned before body scripts that await it run.
    function runSiteLoaderScript() {
        var old = document.head.querySelector('script[src*="site-loader.js"]');
        if (!old) return Promise.resolve();
        var resolved = new URL(old.getAttribute('src'), window.location.href).href;
        resolved += (resolved.indexOf('?') === -1 ? '?' : '&') + '_spanav=' + Date.now();
        old.remove();
        return new Promise(function (resolve) {
            var s = document.createElement('script');
            s.type = 'module';
            s.src = resolved;
            s.onload = resolve;
            s.onerror = resolve;
            document.head.appendChild(s);
        });
    }

    function navigateTo(url, opts) {
        opts = opts || {};
        if (isNavigating) return;
        isNavigating = true;

        // Chromium (and others) will pause an <audio> element that gets
        // disconnected from the document, even briefly. So the live
        // element is never removed — everything else is torn down and
        // rebuilt around it instead.
        var audio = document.getElementById('site-audio');

        fetch(url, { credentials: 'same-origin' })
            .then(function (res) {
                if (!res.ok) throw new Error('bad response ' + res.status);
                return res.text();
            })
            .then(function (html) {
                var doc = new DOMParser().parseFromString(html, 'text/html');
                loseWebGLContexts(document);

                document.title = doc.title;
                document.head.innerHTML = doc.head.innerHTML;
                document.documentElement.classList.add('is-loading');

                Array.prototype.slice.call(document.body.children).forEach(function (el) {
                    if (el !== audio) el.remove();
                });
                Array.prototype.slice.call(doc.body.children).forEach(function (el) {
                    if (audio && el.id === 'site-audio') return;
                    document.body.appendChild(document.importNode(el, true));
                });

                if (!opts.isPopState) {
                    window.history.pushState({ spaNav: true }, '', url);
                }
                window.scrollTo(0, 0);

                runSiteLoaderScript().then(function () {
                    return runScripts(document.body);
                });
            })
            .catch(function (err) {
                console.warn('[spa-nav] falling back to full navigation:', err);
                window.location.href = url;
            })
            .finally(function () {
                isNavigating = false;
            });
    }

    function onClick(e) {
        if (e.defaultPrevented || e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        var a = e.target.closest ? e.target.closest('a[href]') : null;
        if (!a) return;
        if (a.target && a.target !== '_self') return;
        if (a.hasAttribute('download')) return;

        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#') return;
        if (!isInternalPageUrl(href)) return;

        var dest = new URL(href, window.location.href).href;
        if (dest.split('#')[0] === window.location.href.split('#')[0]) {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        navigateTo(href);
    }

    window.addEventListener('popstate', function () {
        navigateTo(window.location.href, { isPopState: true });
    });

    window.initSpaNav = function () {
        document.addEventListener('click', onClick);
    };
})();
