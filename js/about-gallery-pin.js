(function () {
    var galleryScrollTrigger = null;
    var galleryTween = null;
    var refreshTimer = null;
    var resizeObserver = null;

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

    function waitForReady(gallery) {
        var fonts = document.fonts ? document.fonts.ready.catch(function () {}) : Promise.resolve();
        return Promise.all([fonts, waitForGalleryImages(gallery), waitForLayout()]);
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
        if (track && typeof gsap !== 'undefined') gsap.set(track, { clearProps: 'transform' });
        if (pinWrap) pinWrap.classList.remove('is-pin-driven');
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
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return Promise.resolve();
        if (window.matchMedia && window.matchMedia('(max-width: 660px)').matches) {
            killGalleryPin();
            if (gallery) gallery.scrollLeft = 0;
            if (track && typeof gsap !== 'undefined') gsap.set(track, { clearProps: 'transform,x' });
            return Promise.resolve();
        }

        gsap.registerPlugin(ScrollTrigger);
        killGalleryPin();

        return waitForReady(gallery).then(function () {
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
        return (window.siteReady ?? Promise.resolve()).then(function () {
            return tryInitGalleryPin(0);
        });
    }

    window.teardownAboutGalleryPin = killGalleryPin;

    window.initAboutGalleryPin = function () {
        return tryInitGalleryPin(0);
    };

    window.addEventListener('spa:page-ready', scheduleGalleryInit);

    if (document.querySelector('.about-gallery-pin')) {
        scheduleGalleryInit();
    }
})();
