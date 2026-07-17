(function () {
    var galleryScrollTrigger = null;
    var galleryTween = null;
    var refreshTimer = null;
    var resizeObserver = null;
    var mobileMq = window.matchMedia ? window.matchMedia('(max-width: 660px)') : null;

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

    function killGalleryPin() {
        if (galleryScrollTrigger) {
            galleryScrollTrigger.kill();
            galleryScrollTrigger = null;
        }
        if (galleryTween) {
            galleryTween.kill();
            galleryTween = null;
        }
        if (refreshTimer) {
            clearTimeout(refreshTimer);
            refreshTimer = null;
        }
        if (resizeObserver) {
            resizeObserver.disconnect();
            resizeObserver = null;
        }

        var pinWrap = document.querySelector('.about-gallery-pin');
        var track = document.querySelector('.about-gallery__track');
        var gallery = document.querySelector('.about-gallery');
        clearTrackTransform(track);
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
        return !!(mobileMq && mobileMq.matches);
    }

    function scheduleRefresh() {
        if (typeof ScrollTrigger === 'undefined') return;
        ScrollTrigger.refresh(true);
        clearTimeout(refreshTimer);
        refreshTimer = window.setTimeout(function () {
            ScrollTrigger.refresh(true);
        }, 120);
    }

    function buildGalleryPin(pinWrap, pinInner, gallery, track) {
        var maxScroll = measureMaxScroll(gallery, track);
        if (maxScroll <= 0) return Promise.resolve(false);

        pinWrap.classList.add('is-pin-driven');
        gsap.set(track, { x: 0, force3D: true });

        var topbar = document.querySelector('.about-topbar');
        var pinTopOffset = topbar ? Math.round(topbar.getBoundingClientRect().bottom + 40) : 0;

        galleryTween = gsap.to(track, {
            x: -maxScroll,
            ease: 'none',
            scrollTrigger: {
                trigger: pinInner,
                start: 'top top+=' + pinTopOffset,
                end: '+=' + Math.round(maxScroll + window.innerHeight * 0.15),
                pin: true,
                scrub: 0.35,
                invalidateOnRefresh: true,
                anticipatePin: 1,
            },
        });

        galleryScrollTrigger = galleryTween.scrollTrigger;
        scheduleRefresh();
        ScrollTrigger.refresh(true);
        ScrollTrigger.update();

        if (window.ResizeObserver) {
            resizeObserver = new ResizeObserver(function () {
                if (isMobile()) {
                    enableMobileNativeScroll();
                    return;
                }
                scheduleRefresh();
            });
            resizeObserver.observe(gallery);
            resizeObserver.observe(track);
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
        killGalleryPin();

        return waitForReady(gallery).then(function () {
            if (isMobile()) {
                enableMobileNativeScroll();
                return;
            }
            return buildGalleryPin(pinWrap, pinInner, gallery, track).then(function (ready) {
                if (ready || attempt >= 4) return;
                return waitForLayout().then(function () {
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

    if (mobileMq) {
        if (typeof mobileMq.addEventListener === 'function') {
            mobileMq.addEventListener('change', onViewportChange);
        } else if (typeof mobileMq.addListener === 'function') {
            mobileMq.addListener(onViewportChange);
        }
    }

    window.addEventListener('resize', function () {
        if (isMobile()) syncMobileEndPadding();
    });

    window.teardownAboutGalleryPin = killGalleryPin;

    window.initAboutGalleryPin = function () {
        return tryInitGalleryPin(0);
    };

    window.addEventListener('spa:page-ready', scheduleGalleryInit);

    if (document.querySelector('.about-gallery-pin')) {
        scheduleGalleryInit();
    }
})();
