(function () {
    // Singleton state so SPA re-injection of this script cannot stack
    // listeners or orphan ScrollTriggers from a previous closure.
    var state = window.__aboutGalleryPinState || (window.__aboutGalleryPinState = {
        installed: false,
        initGen: 0,
        galleryScrollTrigger: null,
        galleryTween: null,
        refreshTimer: null,
        resizeObserver: null,
        mobileMq: window.matchMedia ? window.matchMedia('(max-width: 660px)') : null,
        onViewportChange: null,
        onResize: null,
        onSpaReady: null,
    });

    function waitForGalleryImages(gallery) {
        var imgs = Array.prototype.slice.call(gallery.querySelectorAll('img'));
        if (!imgs.length) return Promise.resolve();

        imgs.forEach(function (img) {
            img.loading = 'eager';
            if (img.decode) img.decode().catch(function () {});
        });

        return Promise.all(imgs.map(function (img) {
            if (img.complete) return Promise.resolve();
            return new Promise(function (resolve) {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
            });
        }));
    }

    function waitForLayout() {
        return new Promise(function (resolve) {
            requestAnimationFrame(function () {
                requestAnimationFrame(resolve);
            });
        });
    }

    function waitForFontsBriefly() {
        if (!document.fonts) return Promise.resolve();
        // Never await fonts.ready alone — can hang when faces 404 (Safari).
        var loads = document.fonts.ready.catch(function () {});
        return Promise.race([
            loads,
            new Promise(function (resolve) { window.setTimeout(resolve, 1200); }),
        ]);
    }

    function waitForReady(gallery) {
        return Promise.all([waitForFontsBriefly(), waitForGalleryImages(gallery), waitForLayout()]);
    }

    function measureMaxScroll(gallery, track) {
        var fromScrollWidth = track.scrollWidth - gallery.clientWidth;
        if (fromScrollWidth > 1) return fromScrollWidth;

        var items = track.querySelectorAll('.about-gallery__item');
        if (items.length < 2) return 0;

        var trackRect = track.getBoundingClientRect();
        var lastRect = items[items.length - 1].getBoundingClientRect();
        var galleryRect = gallery.getBoundingClientRect();
        var fromItems = (lastRect.right - trackRect.left) - galleryRect.width;

        return Math.max(0, Math.round(fromItems));
    }

    function clearTrackTransform(track) {
        if (!track) return;
        if (typeof gsap !== 'undefined') {
            gsap.set(track, { clearProps: 'transform,x,y,z,force3D' });
        }
        track.style.removeProperty('transform');
        track.style.removeProperty('translate');
    }

    function syncMobileEndPadding() {
        var gallery = document.querySelector('.about-gallery');
        var track = document.querySelector('.about-gallery__track');
        var item = track && track.querySelector('.about-gallery__item');
        if (!gallery || !track || !item) return;

        if (!isMobile()) {
            track.style.removeProperty('padding-right');
            return;
        }

        var page = document.querySelector('.about-page');
        var padRaw = page ? getComputedStyle(page).getPropertyValue('--about-pad') : '';
        var pad = parseFloat(padRaw) || 16;
        var itemWidth = item.getBoundingClientRect().width;
        var endPad = Math.max(pad, Math.round(gallery.clientWidth - itemWidth - pad));
        track.style.paddingRight = endPad + 'px';
    }

    function isGalleryPinTrigger(trigger) {
        if (!trigger || !trigger.classList) return false;
        return trigger.classList.contains('about-gallery-pin__inner') ||
            trigger.classList.contains('about-gallery-pin');
    }

    function killOrphanGalleryTriggers() {
        if (typeof ScrollTrigger === 'undefined' || typeof ScrollTrigger.getAll !== 'function') return;
        ScrollTrigger.getAll().forEach(function (st) {
            if (isGalleryPinTrigger(st.trigger)) st.kill();
        });
    }

    function killGalleryPin() {
        // Invalidate any in-flight async inits from racing callers.
        state.initGen += 1;

        if (state.galleryScrollTrigger) {
            state.galleryScrollTrigger.kill();
            state.galleryScrollTrigger = null;
        }
        if (state.galleryTween) {
            state.galleryTween.kill();
            state.galleryTween = null;
        }
        // SPA re-runs leave triggers owned by dead closures — sweep them too.
        killOrphanGalleryTriggers();

        if (state.refreshTimer) {
            clearTimeout(state.refreshTimer);
            state.refreshTimer = null;
        }
        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
            state.resizeObserver = null;
        }

        var pinWrap = document.querySelector('.about-gallery-pin');
        var pinInner = document.querySelector('.about-gallery-pin__inner');
        var track = document.querySelector('.about-gallery__track');
        var gallery = document.querySelector('.about-gallery');
        clearTrackTransform(track);
        if (pinInner && typeof gsap !== 'undefined') {
            gsap.set(pinInner, { clearProps: 'transform,top,left,width,maxWidth,margin,position,zIndex,boxSizing' });
        }
        if (pinWrap) pinWrap.classList.remove('is-pin-driven');
        if (gallery) gallery.scrollLeft = 0;
    }

    function enableMobileNativeScroll() {
        killGalleryPin();
        var track = document.querySelector('.about-gallery__track');
        var gallery = document.querySelector('.about-gallery');
        clearTrackTransform(track);
        syncMobileEndPadding();
        if (gallery) gallery.scrollLeft = 0;
    }

    function isMobile() {
        return !!(state.mobileMq && state.mobileMq.matches);
    }

    function scheduleRefresh() {
        if (typeof ScrollTrigger === 'undefined') return;
        ScrollTrigger.refresh(true);
        clearTimeout(state.refreshTimer);
        state.refreshTimer = window.setTimeout(function () {
            ScrollTrigger.refresh(true);
        }, 120);
    }

    function buildGalleryPin(pinWrap, pinInner, gallery, track, gen) {
        if (gen !== state.initGen) return Promise.resolve(false);

        var maxScroll = measureMaxScroll(gallery, track);
        if (maxScroll <= 0) return Promise.resolve(false);

        // Drop any race-built triggers before creating the canonical one.
        killOrphanGalleryTriggers();
        if (gen !== state.initGen) return Promise.resolve(false);

        pinWrap.classList.add('is-pin-driven');
        gsap.set(track, { x: 0, force3D: true });

        var topbar = document.querySelector('.about-topbar');
        var pinTopOffset = topbar ? Math.round(topbar.getBoundingClientRect().bottom + 40) : 0;

        state.galleryTween = gsap.to(track, {
            x: function () { return -measureMaxScroll(gallery, track); },
            ease: 'none',
            scrollTrigger: {
                trigger: pinInner,
                start: 'top top+=' + pinTopOffset,
                end: function () {
                    return '+=' + Math.round(measureMaxScroll(gallery, track) + window.innerHeight * 0.15);
                },
                pin: true,
                // Avoid fixed-pin breakage from ancestors with overflow-x clip/hidden
                // (.about-page, body) — common cause of an empty pin-spacer.
                pinType: 'transform',
                scrub: 0.35,
                invalidateOnRefresh: true,
                anticipatePin: 1,
            },
        });

        if (gen !== state.initGen) {
            if (state.galleryTween) {
                state.galleryTween.kill();
                state.galleryTween = null;
            }
            killOrphanGalleryTriggers();
            return Promise.resolve(false);
        }

        state.galleryScrollTrigger = state.galleryTween.scrollTrigger;
        scheduleRefresh();
        ScrollTrigger.refresh(true);
        ScrollTrigger.update();

        if (window.ResizeObserver) {
            if (state.resizeObserver) state.resizeObserver.disconnect();
            state.resizeObserver = new ResizeObserver(function () {
                if (isMobile()) {
                    enableMobileNativeScroll();
                    return;
                }
                scheduleRefresh();
            });
            state.resizeObserver.observe(gallery);
            state.resizeObserver.observe(track);
        }

        window.addEventListener('load', scheduleRefresh, { once: true });

        return Promise.resolve(true);
    }

    function tryInitGalleryPin(attempt) {
        var pinWrap = document.querySelector('.about-gallery-pin');
        var pinInner = document.querySelector('.about-gallery-pin__inner');
        var gallery = document.querySelector('.about-gallery');
        var track = document.querySelector('.about-gallery__track');
        if (!pinWrap || !pinInner || !gallery || !track) return Promise.resolve();

        if (isMobile()) {
            enableMobileNativeScroll();
            return waitForGalleryImages(gallery).then(function () {
                return waitForLayout().then(function () {
                    syncMobileEndPadding();
                });
            });
        }

        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return Promise.resolve();

        gsap.registerPlugin(ScrollTrigger);
        var gen = state.initGen + 1;
        state.initGen = gen;
        // Soft cleanup without bumping initGen again.
        if (state.galleryScrollTrigger) {
            state.galleryScrollTrigger.kill();
            state.galleryScrollTrigger = null;
        }
        if (state.galleryTween) {
            state.galleryTween.kill();
            state.galleryTween = null;
        }
        killOrphanGalleryTriggers();
        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
            state.resizeObserver = null;
        }
        clearTrackTransform(track);
        pinWrap.classList.remove('is-pin-driven');

        return waitForReady(gallery).then(function () {
            if (gen !== state.initGen) return;
            if (isMobile()) {
                enableMobileNativeScroll();
                return;
            }
            // Re-query in case SPA swapped the DOM during wait.
            pinWrap = document.querySelector('.about-gallery-pin');
            pinInner = document.querySelector('.about-gallery-pin__inner');
            gallery = document.querySelector('.about-gallery');
            track = document.querySelector('.about-gallery__track');
            if (!pinWrap || !pinInner || !gallery || !track) return;

            return buildGalleryPin(pinWrap, pinInner, gallery, track, gen).then(function (ready) {
                if (gen !== state.initGen) return;
                if (ready || attempt >= 4) return;
                return waitForLayout().then(function () {
                    if (gen !== state.initGen) return;
                    return tryInitGalleryPin(attempt + 1);
                });
            });
        });
    }

    function scheduleGalleryInit() {
        if (!document.querySelector('.about-gallery-pin')) return Promise.resolve();
        // On mobile, clear pin state immediately — don't wait on siteReady.
        if (isMobile()) {
            enableMobileNativeScroll();
        }
        var ready = window.siteReady ?? Promise.resolve();
        return Promise.race([
            ready,
            new Promise(function (resolve) { window.setTimeout(resolve, 6000); }),
        ]).then(function () {
            return tryInitGalleryPin(0);
        });
    }

    function onViewportChange() {
        if (!document.querySelector('.about-gallery-pin')) return;
        tryInitGalleryPin(0);
    }

    function onResize() {
        if (isMobile()) syncMobileEndPadding();
    }

    // Stable dispatchers so SPA re-injection can refresh implementations
    // without stacking duplicate window listeners.
    state.runSchedule = scheduleGalleryInit;
    state.runViewportChange = onViewportChange;
    state.runResize = onResize;

    if (!state.installed) {
        state.installed = true;

        if (state.mobileMq) {
            var mqHandler = function () { state.runViewportChange(); };
            if (typeof state.mobileMq.addEventListener === 'function') {
                state.mobileMq.addEventListener('change', mqHandler);
            } else if (typeof state.mobileMq.addListener === 'function') {
                state.mobileMq.addListener(mqHandler);
            }
        }

        window.addEventListener('resize', function () { state.runResize(); });
        window.addEventListener('spa:page-ready', function () { state.runSchedule(); });
    }

    window.teardownAboutGalleryPin = killGalleryPin;

    window.initAboutGalleryPin = function () {
        return tryInitGalleryPin(0);
    };

    if (document.querySelector('.about-gallery-pin')) {
        scheduleGalleryInit();
    }
})();
