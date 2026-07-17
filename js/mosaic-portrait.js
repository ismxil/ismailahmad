/**
 * Homepage hero portrait mosaic.
 * - Scroll through `.home-hero` gradually intensifies pixelation (0 → full).
 * - Click toggles a "forced full mosaic" override; when off, scroll intensity applies.
 */
(function () {
    var MOSAIC_CELL = 18;
    var DURATION_MS = 420;
    var VISIBLE_EPS = 0.015;
    var EASE = function (t) {
        return 1 - Math.pow(1 - t, 3);
    };

    var btn = null;
    var img = null;
    var hero = null;
    var canvas = null;
    var ctx = null;
    var offscreen = null;
    var offCtx = null;

    var scrollIntensity = 0;
    var forcedFull = false;
    var displayIntensity = 0;
    var animating = false;
    var animRaf = 0;
    var scrollRaf = 0;
    var resizeObs = null;
    var reduceMotion = false;
    var mq = null;
    var onMqChange = null;

    function prefersReducedMotion() {
        return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function clamp01(t) {
        return t < 0 ? 0 : t > 1 ? 1 : t;
    }

    function intensityToCell(t) {
        return 1 + clamp01(t) * (MOSAIC_CELL - 1);
    }

    function targetIntensity() {
        return forcedFull ? 1 : scrollIntensity;
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
        var rect = img.getBoundingClientRect();
        return {
            w: Math.max(1, Math.round(rect.width)),
            h: Math.max(1, Math.round(rect.height)),
        };
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
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
        btn.setAttribute('aria-pressed', forcedFull ? 'true' : 'false');
    }

    function applyIntensity(intensity) {
        displayIntensity = clamp01(intensity);
        ensureCanvas();

        if (displayIntensity < VISIBLE_EPS) {
            clearCanvas();
            setMosaicVisible(false);
            return;
        }

        setMosaicVisible(true);
        drawMosaic(intensityToCell(displayIntensity));
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
            applyIntensity(from + (to - from) * eased);

            if (t < 1) {
                animRaf = requestAnimationFrame(frame);
                return;
            }

            animRaf = 0;
            animating = false;
            applyIntensity(to);
            syncPressed();
        }

        animRaf = requestAnimationFrame(frame);
    }

    /**
     * Progress 0 at page top / hero fully below-or-at top of viewport,
     * 1 once the hero has scrolled fully past the top edge.
     */
    function readScrollIntensity() {
        if (!hero) return 0;
        var rect = hero.getBoundingClientRect();
        var range = Math.max(1, rect.height);
        // Dead zone: ignore the first ~8% so tiny scrolls don't pixelate yet
        var raw = (-rect.top) / range;
        return clamp01((raw - 0.08) / 0.92);
    }

    function updateFromScroll() {
        scrollIntensity = readScrollIntensity();
        if (animating || forcedFull) return;
        applyIntensity(scrollIntensity);
    }

    function onScroll() {
        if (scrollRaf) return;
        scrollRaf = requestAnimationFrame(function () {
            scrollRaf = 0;
            updateFromScroll();
        });
    }

    function toggleForcedFull() {
        if (!img || !img.naturalWidth) return;
        if (animating) return;

        forcedFull = !forcedFull;
        syncPressed();
        animateToIntensity(targetIntensity());
    }

    function onClick(e) {
        e.preventDefault();
        toggleForcedFull();
    }

    function onKeydown(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleForcedFull();
        }
    }

    function onResize() {
        if (animating) return;
        applyIntensity(targetIntensity());
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
        scrollIntensity = 0;
        forcedFull = false;
        displayIntensity = 0;
        animating = false;
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
            btn.className = 'home-hero__portrait-btn';
            btn.setAttribute('aria-label', 'Toggle mosaic effect on portrait');
            btn.setAttribute('aria-pressed', 'false');
            img.parentNode.insertBefore(btn, img);
            btn.appendChild(img);
        }

        reduceMotion = prefersReducedMotion();

        return waitForImage(img).then(function () {
            if (!img || !btn || !document.contains(img)) return;
            ensureCanvas();
            syncCanvasSize();
            bind();
            syncPressed();
            updateFromScroll();
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
