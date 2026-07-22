/**
 * Lightweight wheel smoothing via native scrollY lerp.
 * Keeps real document scroll (GSAP ScrollTrigger pins keep working).
 * Skips touch, reduced-motion, and nested vertical overflow.
 *
 * Horizontal-only carousels (overflow-x) must NOT swallow vertical wheel —
 * that feels like laggy / stuck scrolling when the cursor is over them.
 */
(function () {
    if (window.__smoothScrollReady) return;
    window.__smoothScrollReady = true;

    var LERP = 0.18;
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

    function isHidden(style) {
        return style.pointerEvents === 'none' || style.visibility === 'hidden' || style.display === 'none';
    }

    function canScrollY(node, style) {
        var oy = style.overflowY;
        if (!(oy === 'auto' || oy === 'scroll' || oy === 'overlay')) return false;
        return node.scrollHeight > node.clientHeight + 1;
    }

    function canScrollX(node, style) {
        var ox = style.overflowX;
        if (!(ox === 'auto' || ox === 'scroll' || ox === 'overlay')) return false;
        return node.scrollWidth > node.clientWidth + 1;
    }

    function isHorizontalOnly(node, style) {
        return canScrollX(node, style) && !canScrollY(node, style);
    }

    function hasHorizontalOnlyBetween(from, until) {
        var node = from;
        while (node && node !== until) {
            if (node.nodeType === 1) {
                var style = window.getComputedStyle(node);
                if (!isHidden(style) && isHorizontalOnly(node, style)) return true;
            }
            node = node.parentElement;
        }
        return false;
    }

    function normalizeDeltaY(e) {
        var dy = e.deltaY;
        if (e.deltaMode === 1) dy *= 16;
        else if (e.deltaMode === 2) dy *= window.innerHeight;
        return dy;
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
        // Trackpad horizontal pans: leave to the browser / carousels.
        if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;

        var dy = normalizeDeltaY(e);

        // Prefer a nested vertical scroller (e.g. project modal). If the cursor
        // is over a horizontal carousel inside it, forward delta manually so
        // the carousel cannot convert vertical wheel into sideways scroll.
        var node = e.target;
        while (node && node !== document.body && node !== document.documentElement) {
            if (node.nodeType === 1) {
                var style = window.getComputedStyle(node);
                if (!isHidden(style) && canScrollY(node, style)) {
                    if (hasHorizontalOnlyBetween(e.target, node)) {
                        e.preventDefault();
                        node.scrollTop += dy;
                    }
                    return;
                }
            }
            node = node.parentElement;
        }

        var max = maxScroll();
        if (max <= 1) return;

        if (!raf) syncFromNative();

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

    window.addEventListener('spa:page-ready', function () {
        if (raf) {
            cancelAnimationFrame(raf);
            raf = 0;
        }
        syncFromNative();
    });

    syncFromNative();
})();
