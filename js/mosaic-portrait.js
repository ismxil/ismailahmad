/**
 * Homepage hero portrait mosaic.
 * - Starts fully mosaicked.
 * - A short scroll through `.home-hero` clears pixelation (full → 0) while the
 *   portrait is still largely in view — well before the hero leaves the viewport.
 * - Click toggles clear vs mosaic (override); when following scroll, intensity is from scroll.
 * - prefers-reduced-motion: start mosaic, click still reveals; skip scroll-driven animation.
 */
(function () {
    var MOSAIC_CELL = 18;
    /** Finer blocks on iPad / 13" Mac so the mosaic reads cleaner at mid sizes. */
    var MOSAIC_CELL_COMPACT = 10;
    var DURATION_MS = 420;
    var VISIBLE_EPS = 0.015;
    var EASE = function (t) {
        return 1 - Math.pow(1 - t, 3);
    };

    function mosaicCellMax() {
        var w = window.innerWidth || 0;
        var h = window.innerHeight || 0;
        if (w >= 769 && (w <= 1440 || h <= 900)) return MOSAIC_CELL_COMPACT;
        return MOSAIC_CELL;
    }

    var btn = null;
    var img = null;
    var hero = null;
    var canvas = null;
    var ctx = null;
    var offscreen = null;
    var offCtx = null;

    /** Mosaic amount from scroll: 1 at page top, 0 after a short leave scroll. */
    var scrollMosaic = 1;
    /**
     * Manual override from click: null = follow scroll, 0 = forced clear, 1 = forced mosaic.
     */
    var manualOverride = null;
    var displayIntensity = 1;
    var animating = false;
    var animRaf = 0;
    var scrollRaf = 0;
    var resizeObs = null;
    var reduceMotion = false;
    var mq = null;
    var onMqChange = null;
    var cachedSize = { w: 0, h: 0 };
    var lastDrawnCell = -1;
    var sizeDirty = true;

    function prefersReducedMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function clamp01(t) {
        return t < 0 ? 0 : t > 1 ? 1 : t;
    }

    function intensityToCell(t) {
        var max = mosaicCellMax();
        return 1 + clamp01(t) * (max - 1);
    }

    function targetIntensity() {
        if (manualOverride !== null) return manualOverride;
        if (reduceMotion) return 1;
        return scrollMosaic;
    }

    function ensureCanvas() {
        if (canvas || !btn) return;
        canvas = document.createElement('canvas');
        canvas.className = 'home-hero__portrait-mosaic';
        canvas.setAttribute('aria-hidden', 'true');
        btn.appendChild(canvas);
        ctx = canvas.getContext('2d', { alpha: true });
        offscreen = document.createElement('canvas');
        offCtx = offscreen.getContext('2d', { alpha: true, willReadFrequently: true });
    }

    function displaySize() {
        if (!sizeDirty && cachedSize.w > 0) return cachedSize;
        var rect = img.getBoundingClientRect();
        cachedSize = {
            w: Math.max(1, Math.round(rect.width)),
            h: Math.max(1, Math.round(rect.height)),
        };
        sizeDirty = false;
        return cachedSize;
    }

    function syncCanvasSize() {
        if (!canvas || !ctx || !img) return displaySize();
        var size = displaySize();
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var bw = Math.round(size.w * dpr);
        var bh = Math.round(size.h * dpr);
        if (canvas.width !== bw || canvas.height !== bh) {
            canvas.width = bw;
            canvas.height = bh;
            canvas.style.width = size.w + 'px';
            canvas.style.height = size.h + 'px';
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            lastDrawnCell = -1;
        }
        return size;
    }

    /**
     * Downsample → nearest-neighbor upscale for clear mosaic blocks.
     * cellPx ≈ block size in CSS pixels.
     */
    function drawMosaic(cellPx) {
        if (!ctx || !img || !img.naturalWidth) return;
        var size = syncCanvasSize();
        var cell = Math.max(1, cellPx);
        var tw = Math.max(1, Math.round(size.w / cell));
        var th = Math.max(1, Math.round(size.h / cell));

        if (offscreen.width !== tw || offscreen.height !== th) {
            offscreen.width = tw;
            offscreen.height = th;
        }

        offCtx.clearRect(0, 0, tw, th);
        offCtx.imageSmoothingEnabled = true;
        offCtx.drawImage(img, 0, 0, tw, th);

        ctx.clearRect(0, 0, size.w, size.h);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offscreen, 0, 0, tw, th, 0, 0, size.w, size.h);
    }

    function clearCanvas() {
        if (!ctx || !canvas) return;
        var size = syncCanvasSize();
        ctx.clearRect(0, 0, size.w, size.h);
    }

    function setMosaicVisible(on) {
        if (!btn) return;
        btn.classList.toggle('is-mosaic', on);
    }

    function syncPressed() {
        if (!btn) return;
        var mosaicOn = targetIntensity() >= VISIBLE_EPS;
        btn.setAttribute('aria-pressed', mosaicOn ? 'true' : 'false');
    }

    function applyIntensity(intensity, force) {
        displayIntensity = clamp01(intensity);
        ensureCanvas();

        if (displayIntensity < VISIBLE_EPS) {
            if (lastDrawnCell === -1 && !(btn && btn.classList.contains('is-mosaic'))) return;
            lastDrawnCell = -1;
            clearCanvas();
            setMosaicVisible(false);
            return;
        }

        // Quantize cell size so scroll doesn't redraw every subpixel step.
        var cell = Math.round(intensityToCell(displayIntensity) * 2) / 2;
        if (!force && cell === lastDrawnCell) return;

        setMosaicVisible(true);
        lastDrawnCell = cell;
        drawMosaic(cell);
    }

    function cancelAnim() {
        if (animRaf) {
            cancelAnimationFrame(animRaf);
            animRaf = 0;
        }
        animating = false;
    }

    function animateToIntensity(to) {
        cancelAnim();
        ensureCanvas();
        reduceMotion = prefersReducedMotion();
        to = clamp01(to);

        if (reduceMotion) {
            applyIntensity(to);
            syncPressed();
            return;
        }

        var from = displayIntensity;
        if (Math.abs(to - from) < 0.001) {
            applyIntensity(to);
            syncPressed();
            return;
        }

        animating = true;
        // Keep canvas visible while tweening either direction
        if (from >= VISIBLE_EPS || to >= VISIBLE_EPS) setMosaicVisible(true);

        var start = performance.now();

        function frame(now) {
            var t = Math.min(1, (now - start) / DURATION_MS);
            var eased = EASE(t);
            applyIntensity(from + (to - from) * eased, true);

            if (t < 1) {
                animRaf = requestAnimationFrame(frame);
                return;
            }

            animRaf = 0;
            animating = false;
            applyIntensity(to, true);
            syncPressed();
        }

        animRaf = requestAnimationFrame(frame);
    }

    /**
     * Mosaic intensity 1 at page top / hero fully in view,
     * 0 after a short scroll while the portrait is still largely visible
     * (~90–130px / ≤35% of hero leave distance).
     */
    function readScrollMosaic() {
        if (!hero) return 1;
        var rect = hero.getBoundingClientRect();
        var leaveRange = Math.max(1, rect.height);
        var deadPx = Math.min(20, leaveRange * 0.03);
        // Prefer ~25% of leave, clamped to ~90–130px and never past 35% of leave.
        var endPx = Math.min(130, Math.max(90, leaveRange * 0.25));
        endPx = Math.min(endPx, leaveRange * 0.35);
        var scrolled = Math.max(0, -rect.top);
        if (endPx <= deadPx) return scrolled <= 0 ? 1 : 0;
        return 1 - clamp01((scrolled - deadPx) / (endPx - deadPx));
    }

    function updateFromScroll() {
        var next = readScrollMosaic();
        var moved = Math.abs(next - scrollMosaic) > 0.002;
        scrollMosaic = next;
        if (reduceMotion || animating) return;
        // Scrolling re-engages scroll control after a click override.
        if (moved && manualOverride !== null) manualOverride = null;
        if (manualOverride !== null) return;
        applyIntensity(scrollMosaic);
        syncPressed();
    }

    function onScroll() {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(function () {
            scrollRaf = 0;
            updateFromScroll();
        });
    }

    function toggleMosaic() {
        if (!img || !img.naturalWidth) return;
        if (animating) return;

        var next = targetIntensity() >= 0.5 ? 0 : 1;
        manualOverride = next;
        syncPressed();
        animateToIntensity(next);
    }

    function onClick(e) {
        e.preventDefault();
        toggleMosaic();
    }

    function onKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleMosaic();
        }
    }

    function onResize() {
        sizeDirty = true;
        lastDrawnCell = -1;
        if (animating) return;
        applyIntensity(targetIntensity(), true);
        syncPressed();
    }

    function waitForImage(el) {
        if (el.complete && el.naturalWidth) return Promise.resolve();
        return new Promise(function (resolve) {
            el.addEventListener('load', resolve, { once: true });
            el.addEventListener('error', resolve, { once: true });
        });
    }

    function bind() {
        if (!btn) return;
        btn.addEventListener('click', onClick);
        btn.addEventListener('keydown', onKeydown);
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize);
        if (typeof ResizeObserver === 'function') {
            resizeObs = new ResizeObserver(onResize);
            resizeObs.observe(img);
            if (hero) resizeObs.observe(hero);
        }
        if (window.matchMedia) {
            mq = window.matchMedia('(prefers-reduced-motion: reduce)');
            onMqChange = function () {
                reduceMotion = prefersReducedMotion();
                if (!animating && manualOverride === null) {
                    applyIntensity(targetIntensity(), true);
                    syncPressed();
                }
            };
            if (typeof mq.addEventListener === 'function') mq.addEventListener('change', onMqChange);
            else if (typeof mq.addListener === 'function') mq.addListener(onMqChange);
        }
    }

    function unbind() {
        if (btn) {
            btn.removeEventListener('click', onClick);
            btn.removeEventListener('keydown', onKeydown);
        }
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('resize', onResize);
        if (resizeObs) {
            resizeObs.disconnect();
            resizeObs = null;
        }
        if (mq && onMqChange) {
            if (typeof mq.removeEventListener === 'function') mq.removeEventListener('change', onMqChange);
            else if (typeof mq.removeListener === 'function') mq.removeListener(onMqChange);
        }
        onMqChange = null;
    }

    function teardownMosaicPortrait() {
        cancelAnim();
        if (scrollRaf) {
            cancelAnimationFrame(scrollRaf);
            scrollRaf = 0;
        }
        unbind();
        if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
        if (btn) {
            btn.classList.remove('is-mosaic');
            btn.setAttribute('aria-pressed', 'false');
        }
        btn = null;
        img = null;
        hero = null;
        canvas = null;
        ctx = null;
        offscreen = null;
        offCtx = null;
        scrollMosaic = 1;
        manualOverride = null;
        displayIntensity = 1;
        animating = false;
        cachedSize = { w: 0, h: 0 };
        lastDrawnCell = -1;
        sizeDirty = true;
        mq = null;
    }

    function initMosaicPortrait() {
        teardownMosaicPortrait();

        img = document.querySelector('.home-hero__portrait');
        if (!img) return Promise.resolve();

        hero = document.querySelector('.home-hero');
        btn = img.closest('.home-hero__portrait-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'home-hero__portrait-btn is-mosaic';
            btn.setAttribute('aria-label', 'Toggle mosaic effect on portrait');
            btn.setAttribute('aria-pressed', 'true');
            img.parentNode.insertBefore(btn, img);
            btn.appendChild(img);
        } else {
            btn.classList.add('is-mosaic');
            btn.setAttribute('aria-pressed', 'true');
        }

        reduceMotion = prefersReducedMotion();
        scrollMosaic = 1;
        manualOverride = null;
        displayIntensity = 1;

        return waitForImage(img).then(function () {
            if (!img || !btn || !document.contains(img)) return;
            ensureCanvas();
            syncCanvasSize();
            bind();
            // Paint full mosaic immediately so we never flash the sharp image.
            applyIntensity(1, true);
            syncPressed();
            if (!reduceMotion) updateFromScroll();
        });
    }

    window.initMosaicPortrait = initMosaicPortrait;
    window.teardownMosaicPortrait = teardownMosaicPortrait;

    window.addEventListener('spa:page-ready', function () {
        if (document.querySelector('.home-hero__portrait')) {
            initMosaicPortrait();
        }
    });

    if (document.querySelector('.home-hero__portrait')) {
        initMosaicPortrait();
    }
})();
