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
    function teardownPageScripts() {
        if (window.__stackCards) {
            window.__stackCards.stop();
            window.__stackCards = null;
        }
        if (typeof window.teardownFeedsPage === 'function') window.teardownFeedsPage();
        if (typeof window.teardownAboutGalleryPin === 'function') window.teardownAboutGalleryPin();
        if (typeof window.teardownFeedModal === 'function') window.teardownFeedModal();
        if (window.ScrollTrigger && typeof window.ScrollTrigger.getAll === 'function') {
            window.ScrollTrigger.getAll().forEach(function (st) { st.kill(); });
        }
    }

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

    // Reconciles <head> instead of blindly replacing it. A blind
    // `head.innerHTML = ...` destroys and recreates every <link
    // rel="stylesheet">, including ones shared by every page (site-loader.css
    // among them) — for a moment those rules don't apply to anything, which
    // is exactly the "flash of unstyled background before the loader shows"
    // this fixes. Stylesheets already present (same href) are left alone;
    // only ones the new page actually needs get added, and page-specific
    // ones the new page doesn't use get removed.
    function syncHead(doc) {
        document.title = doc.title;

        var newLinks = Array.prototype.slice.call(doc.head.querySelectorAll('link[rel="stylesheet"]'));
        var newHrefs = newLinks.map(function (l) { return l.getAttribute('href'); });

        Array.prototype.slice.call(document.head.querySelectorAll('link[rel="stylesheet"]')).forEach(function (link) {
            if (newHrefs.indexOf(link.getAttribute('href')) === -1) link.remove();
        });

        var currentHrefs = Array.prototype.slice.call(document.head.querySelectorAll('link[rel="stylesheet"]'))
            .map(function (l) { return l.getAttribute('href'); });

        newLinks.forEach(function (link) {
            var href = link.getAttribute('href');
            if (currentHrefs.indexOf(href) === -1) {
                var fresh = document.createElement('link');
                fresh.rel = 'stylesheet';
                fresh.href = href;
                document.head.appendChild(fresh);
            }
        });

        var newIcon = doc.head.querySelector('link[rel="icon"]');
        var curIcon = document.head.querySelector('link[rel="icon"]');
        if (newIcon) {
            var iconHref = newIcon.getAttribute('href');
            if (!curIcon) {
                var freshIcon = document.createElement('link');
                freshIcon.rel = 'icon';
                if (newIcon.getAttribute('type')) freshIcon.type = newIcon.getAttribute('type');
                freshIcon.href = iconHref;
                document.head.appendChild(freshIcon);
            } else if (curIcon.getAttribute('href') !== iconHref) {
                curIcon.setAttribute('href', iconHref);
            }
        }

        // Each page also carries its own large inline <style> block(s) with
        // page-specific rules (e.g. .feeds-chrome's fixed positioning).
        // Unlike <link> stylesheets these need no network round trip to
        // apply, so a blind swap here doesn't reintroduce the flash —
        // it's just replacing text content synchronously.
        Array.prototype.slice.call(document.head.querySelectorAll('style')).forEach(function (el) {
            el.remove();
        });
        Array.prototype.slice.call(doc.head.querySelectorAll('style')).forEach(function (el) {
            document.head.appendChild(document.importNode(el, true));
        });
    }

    // <head> scripts already present (by src) are left alone on purpose —
    // reloading e.g. gsap's core bundle on every nav would reset global
    // state it owns. But some pages load a library the others don't (only
    // about.html pulls in ScrollTrigger) — those genuinely-new ones need to
    // load, in order, before any body script that depends on them runs.
    function loadMissingHeadScripts(doc) {
        var scripts = Array.prototype.slice.call(doc.head.querySelectorAll('script[src]'))
            .filter(function (s) {
                var src = s.getAttribute('src');
                return src.indexOf('site-loader.js') === -1 && s.getAttribute('type') !== 'importmap';
            });

        return scripts.reduce(function (chain, old) {
            return chain.then(function () {
                var src = old.getAttribute('src');
                if (document.querySelector('script[src="' + src + '"]')) return Promise.resolve();
                return new Promise(function (resolve) {
                    var s = document.createElement('script');
                    if (old.type) s.type = old.type;
                    if (old.hasAttribute('async')) s.async = old.async;
                    s.src = src;
                    s.onload = resolve;
                    s.onerror = resolve;
                    document.head.appendChild(s);
                });
            });
        }, Promise.resolve());
    }

    // The loader is re-run *cache-busted* even though it's "already
    // present" by src — re-running is the whole point, so it needs its own
    // handling instead of the already-loaded-skip logic above. This re-runs
    // *just* the loader so its per-page boot() animation replays and
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
                // First and synchronous: cover the screen. site-loader.css's
                // html.is-loading rule is already loaded (syncHead below
                // never touches it since every page shares that stylesheet),
                // so this takes effect immediately with nothing to wait on.
                document.documentElement.classList.add('is-loading');

                var doc = new DOMParser().parseFromString(html, 'text/html');
                teardownPageScripts();
                loseWebGLContexts(document);
                syncHead(doc);

                Array.prototype.slice.call(document.body.children).forEach(function (el) {
                    if (el !== audio) el.remove();
                });
                Array.prototype.slice.call(doc.body.children).forEach(function (el) {
                    if (audio && el.id === 'site-audio') return;
                    document.body.appendChild(document.importNode(el, true));
                });

                // Drop page-specific body state left over from the previous view
                // (e.g. index overflow:hidden, feed-modal-open, inline styles).
                document.body.className = '';
                document.body.style.overflow = '';
                document.body.style.removeProperty('overflow');
                document.documentElement.style.overflow = '';

                if (!opts.isPopState) {
                    window.history.pushState({ spaNav: true }, '', url);
                }
                window.scrollTo(0, 0);

                loadMissingHeadScripts(doc)
                    .then(runSiteLoaderScript)
                    .then(function () {
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
