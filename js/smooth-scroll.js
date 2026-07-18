/**
 * Lightweight wheel smoothing via native scrollY lerp.
 * Keeps real document scroll (GSAP ScrollTrigger pins keep working).
 * Skips touch, reduced-motion, nested overflow, and non-scrolling pages (Feeds).
 */
(function () {
    if (window.__smoothScrollReady) return;
    window.__smoothScrollReady = true;

    var LERP = 0.14;
    var STOP_EPS = 0.35;
    var current = window.scrollY || 0;
    var target = current;
    var raf = 0;
    var touching = false;
    var reduceMotion = false;

    function maxScroll() {
        var doc = document.documentElement;
        return Math.max(0, doc.scrollHeight - window.innerHeight);
    }

    function syncFromNative() {
        current = window.scrollY || 0;
        target = current;
    }

    function prefersReduced() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function isScrollableAncestor(el) {
        var node = el;
        while (node && node !== document.body && node !== document.documentElement) {
            if (node.nodeType === 1) {
                var style = window.getComputedStyle(node);
                var oy = style.overflowY;
                var ox = style.overflowX;
                if (
                    ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
                        node.scrollHeight > node.clientHeight + 1) ||
                    ((ox === 'auto' || ox === 'scroll' || ox === 'overlay') &&
                        node.scrollWidth > node.clientWidth + 1)
                ) {
                    return true;
                }
            }
            node = node.parentElement;
        }
        return false;
    }

    function scrollInstant(y) {
        var root = document.documentElement;
        var prev = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';
        window.scrollTo(0, y);
        root.style.scrollBehavior = prev;
    }

    function tick() {
        raf = 0;
        var max = maxScroll();
        target = Math.max(0, Math.min(max, target));
        current += (target - current) * LERP;

        if (Math.abs(target - current) < STOP_EPS) {
            current = target;
            scrollInstant(current);
            return;
        }

        scrollInstant(current);
        raf = requestAnimationFrame(tick);
    }

    function kick() {
        if (!raf) raf = requestAnimationFrame(tick);
    }

    function onWheel(e) {
        if (reduceMotion || touching || e.ctrlKey || e.defaultPrevented) return;
        if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
        if (isScrollableAncestor(e.target)) return;

        var max = maxScroll();
        if (max <= 1) return;

        // Keep in sync if something else moved scroll (anchor, ST, SPA).
        if (!raf) syncFromNative();

        var dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 16;
        else if (e.deltaMode === 2) dy *= window.innerHeight;

        e.preventDefault();
        target = Math.max(0, Math.min(max, target + dy));
        kick();
    }

    function onScroll() {
        if (raf) return;
        syncFromNative();
    }

    function onKeyNav(e) {
        var keys = {
            ArrowUp: 1,
            ArrowDown: 1,
            PageUp: 1,
            PageDown: 1,
            Home: 1,
            End: 1,
            ' ': 1
        };
        if (!keys[e.key]) return;
        // Let native keyboard scroll land, then resync.
        if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
        }
        requestAnimationFrame(syncFromNative);
    }

    reduceMotion = prefersReduced();
    if (window.matchMedia) {
        var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        var onMq = function () {
            reduceMotion = prefersReduced();
            if (reduceMotion && raf) {
                cancelAnimationFrame(raf);
                raf = 0;
                syncFromNative();
            }
        };
        if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMq);
        else if (typeof mq.addListener === 'function') mq.addListener(onMq);
    }

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKeyNav, { passive: true });
    window.addEventListener('touchstart', function () { touching = true; }, { passive: true });
    window.addEventListener('touchend', function () {
        touching = false;
        syncFromNative();
    }, { passive: true });
    window.addEventListener('resize', function () {
        var max = maxScroll();
        target = Math.max(0, Math.min(max, target));
        if (!raf) syncFromNative();
    }, { passive: true });

    // After SPA body swaps, scroll position / height change.
    window.addEventListener('spa:page-ready', function () {
        if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
        }
        syncFromNative();
    });

    syncFromNative();
})();
