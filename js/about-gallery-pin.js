(function () {
    // Always start from a clean singleton so older pin/scrub builds cannot linger
    // across SPA soft-loads or hot edits of this file.
    var prev = window.__aboutGalleryPinState;
    if (prev) {
        try {
            if (prev.galleryScrollTrigger) prev.galleryScrollTrigger.kill();
            if (prev.galleryTween) prev.galleryTween.kill();
            if (prev.resizeObserver) prev.resizeObserver.disconnect();
            if (prev.refreshTimer) clearTimeout(prev.refreshTimer);
            if (prev.dragGallery && prev.onDragPointerDown) {
                prev.dragGallery.removeEventListener('pointerdown', prev.onDragPointerDown);
            }
            if (prev.onDragPointerMove) {
                window.removeEventListener('pointermove', prev.onDragPointerMove);
            }
            if (prev.onDragPointerUp) {
                window.removeEventListener('pointerup', prev.onDragPointerUp);
                window.removeEventListener('pointercancel', prev.onDragPointerUp);
            }
        } catch (err) {}
    }

    var state = window.__aboutGalleryPinState = {
        installed: false,
        initGen: 0,
        galleryScrollTrigger: null,
        galleryTween: null,
        refreshTimer: null,
        resizeObserver: null,
        // Phones + tablets (iPad landscape is >660px).
        touchMq: window.matchMedia
            ? window.matchMedia('(hover: none), (pointer: coarse), (max-width: 1024px)')
            : null,
        dragGallery: null,
        dragPointerId: null,
        dragStartX: 0,
        dragStartScroll: 0,
        dragMoved: false,
        onDragPointerDown: null,
        onDragPointerMove: null,
        onDragPointerUp: null,
        runSchedule: null,
        runViewportChange: null,
        runResize: null,
    };

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

    function isTouchUi() {
        return !!(state.touchMq && state.touchMq.matches);
    }

    function clearTrackTransform(track) {
        if (!track) return;
        if (typeof gsap !== 'undefined') {
            gsap.set(track, { clearProps: 'transform,x,y,z,force3D,translate,rotate,scale' });
        }
        track.style.removeProperty('transform');
        track.style.removeProperty('translate');
        track.style.removeProperty('rotate');
        track.style.removeProperty('scale');
    }

    function unwrapPinSpacers() {
        // ScrollTrigger leaves .pin-spacer wrappers; unwrap so layout is finite again.
        document.querySelectorAll('.about-gallery-pin .pin-spacer, .about-page .pin-spacer').forEach(function (spacer) {
            var parent = spacer.parentNode;
            if (!parent) return;
            while (spacer.firstChild) parent.insertBefore(spacer.firstChild, spacer);
            parent.removeChild(spacer);
        });
    }

    function isGalleryPinTrigger(trigger) {
        if (!trigger || !trigger.classList) return false;
        return trigger.classList.contains('about-gallery-pin__inner') ||
            trigger.classList.contains('about-gallery-pin');
    }

    function killOrphanGalleryTriggers() {
        if (typeof ScrollTrigger === 'undefined' || typeof ScrollTrigger.getAll !== 'function') return;
        ScrollTrigger.getAll().forEach(function (st) {
            if (isGalleryPinTrigger(st.trigger)) st.kill(true);
        });
        unwrapPinSpacers();
    }

    function syncEndPadding() {
        var gallery = document.querySelector('.about-gallery');
        var track = document.querySelector('.about-gallery__track');
        var item = track && track.querySelector('.about-gallery__item');
        if (!gallery || !track || !item) return;

        // Desktop large canvases keep the design’s right pad; small/mid + touch
        // get an end pad so the last card can sit flush to the left edge.
        var compactMq = window.matchMedia
            ? window.matchMedia('(max-width: 1280px)')
            : null;
        if (!isTouchUi() && !(compactMq && compactMq.matches)) {
            track.style.removeProperty('padding-right');
            return;
        }

        var page = document.querySelector('.about-page');
        var padRaw = page ? getComputedStyle(page).getPropertyValue('--about-pad') : '';
        var pad = parseFloat(padRaw) || 16;
        var itemWidth = item.getBoundingClientRect().width;
        if (!itemWidth || itemWidth < 80) {
            track.style.removeProperty('padding-right');
            return;
        }
        var endPad = Math.max(pad, Math.round(gallery.clientWidth - itemWidth - pad));
        track.style.paddingRight = endPad + 'px';
    }

    function teardownDragScroll() {
        var gallery = state.dragGallery;
        if (gallery) {
            gallery.classList.remove('is-dragging');
            gallery.classList.remove('is-drag-enabled');
            if (state.onDragPointerDown) {
                gallery.removeEventListener('pointerdown', state.onDragPointerDown);
            }
        }
        if (state.onDragPointerMove) {
            window.removeEventListener('pointermove', state.onDragPointerMove);
        }
        if (state.onDragPointerUp) {
            window.removeEventListener('pointerup', state.onDragPointerUp);
            window.removeEventListener('pointercancel', state.onDragPointerUp);
        }
        state.dragGallery = null;
        state.dragPointerId = null;
        state.dragMoved = false;
        state.onDragPointerDown = null;
        state.onDragPointerMove = null;
        state.onDragPointerUp = null;
    }

    function setupDragScroll(gallery) {
        teardownDragScroll();
        if (!gallery || isTouchUi()) return;

        state.dragGallery = gallery;
        gallery.classList.add('is-drag-enabled');

        state.onDragPointerDown = function (e) {
            if (!state.dragGallery) return;
            if (e.pointerType && e.pointerType !== 'mouse') return;
            if (e.button != null && e.button !== 0) return;
            state.dragPointerId = e.pointerId;
            state.dragStartX = e.clientX;
            state.dragStartScroll = gallery.scrollLeft;
            state.dragMoved = false;
            try { gallery.setPointerCapture(e.pointerId); } catch (err) {}
        };

        state.onDragPointerMove = function (e) {
            if (state.dragPointerId == null || e.pointerId !== state.dragPointerId) return;
            var dx = e.clientX - state.dragStartX;
            if (!state.dragMoved && Math.abs(dx) < 4) return;
            if (!state.dragMoved) {
                state.dragMoved = true;
                gallery.classList.add('is-dragging');
            }
            gallery.scrollLeft = state.dragStartScroll - dx;
            e.preventDefault();
        };

        state.onDragPointerUp = function (e) {
            if (state.dragPointerId == null || e.pointerId !== state.dragPointerId) return;
            state.dragPointerId = null;
            gallery.classList.remove('is-dragging');
            try { gallery.releasePointerCapture(e.pointerId); } catch (err) {}
        };

        gallery.addEventListener('pointerdown', state.onDragPointerDown);
        window.addEventListener('pointermove', state.onDragPointerMove, { passive: false });
        window.addEventListener('pointerup', state.onDragPointerUp);
        window.addEventListener('pointercancel', state.onDragPointerUp);
    }

    function enableFiniteGallery() {
        // Kill leftover scroll-pin / scrub from older builds (the “infinite” vertical scroll).
        if (state.galleryScrollTrigger) {
            state.galleryScrollTrigger.kill(true);
            state.galleryScrollTrigger = null;
        }
        if (state.galleryTween) {
            state.galleryTween.kill();
            state.galleryTween = null;
        }
        killOrphanGalleryTriggers();

        var pinWrap = document.querySelector('.about-gallery-pin');
        var pinInner = document.querySelector('.about-gallery-pin__inner');
        var track = document.querySelector('.about-gallery__track');
        var gallery = document.querySelector('.about-gallery');

        clearTrackTransform(track);
        if (pinInner && typeof gsap !== 'undefined') {
            gsap.set(pinInner, { clearProps: 'transform,top,left,width,maxWidth,margin,position,zIndex,boxSizing' });
        }
        if (pinWrap) pinWrap.classList.remove('is-pin-driven');

        syncEndPadding();
        if (gallery) {
            // Always restart at the first card after layout/viewport changes.
            gallery.scrollLeft = 0;
            setupDragScroll(gallery);
        }

        if (window.ResizeObserver) {
            if (state.resizeObserver) state.resizeObserver.disconnect();
            state.resizeObserver = new ResizeObserver(function () {
                syncEndPadding();
            });
            if (gallery) state.resizeObserver.observe(gallery);
            if (track) state.resizeObserver.observe(track);
        }
    }

    function killGalleryPin() {
        state.initGen += 1;

        if (state.galleryScrollTrigger) {
            state.galleryScrollTrigger.kill(true);
            state.galleryScrollTrigger = null;
        }
        if (state.galleryTween) {
            state.galleryTween.kill();
            state.galleryTween = null;
        }
        killOrphanGalleryTriggers();

        if (state.refreshTimer) {
            clearTimeout(state.refreshTimer);
            state.refreshTimer = null;
        }
        if (state.resizeObserver) {
            state.resizeObserver.disconnect();
            state.resizeObserver = null;
        }

        teardownDragScroll();

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

    function tryInitGalleryPin() {
        var pinWrap = document.querySelector('.about-gallery-pin');
        var gallery = document.querySelector('.about-gallery');
        var track = document.querySelector('.about-gallery__track');
        if (!pinWrap || !gallery || !track) return Promise.resolve();

        var gen = state.initGen + 1;
        state.initGen = gen;

        enableFiniteGallery();

        return waitForGalleryImages(gallery).then(function () {
            if (gen !== state.initGen) return;
            return waitForLayout().then(function () {
                if (gen !== state.initGen) return;
                enableFiniteGallery();
            });
        });
    }

    function scheduleGalleryInit() {
        if (!document.querySelector('.about-gallery-pin')) return Promise.resolve();
        // Kill pin immediately so a tall pin-spacer cannot block first paint / touch scroll.
        enableFiniteGallery();
        var ready = window.siteReady ?? Promise.resolve();
        return Promise.race([
            ready,
            new Promise(function (resolve) { window.setTimeout(resolve, 6000); }),
        ]).then(function () {
            return tryInitGalleryPin();
        });
    }

    function onViewportChange() {
        if (!document.querySelector('.about-gallery-pin')) return;
        tryInitGalleryPin();
    }

    function onResize() {
        syncEndPadding();
    }

    state.runSchedule = scheduleGalleryInit;
    state.runViewportChange = onViewportChange;
    state.runResize = onResize;

    if (!state.installed) {
        state.installed = true;

        if (state.touchMq) {
            var mqHandler = function () { state.runViewportChange(); };
            if (typeof state.touchMq.addEventListener === 'function') {
                state.touchMq.addEventListener('change', mqHandler);
            } else if (typeof state.touchMq.addListener === 'function') {
                state.touchMq.addListener(mqHandler);
            }
        }

        window.addEventListener('resize', function () { state.runResize(); });
        window.addEventListener('spa:page-ready', function () { state.runSchedule(); });
    }

    window.teardownAboutGalleryPin = killGalleryPin;
    window.initAboutGalleryPin = function () {
        return tryInitGalleryPin();
    };

    if (document.querySelector('.about-gallery-pin')) {
        scheduleGalleryInit();
    }
})();
