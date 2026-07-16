(function () {
    var galleryScrollTrigger = null;

    function waitForGalleryImages(gallery) {
        var imgs = Array.prototype.slice.call(gallery.querySelectorAll('img'));
        if (!imgs.length) return Promise.resolve();
        return Promise.all(imgs.map(function (img) {
            if (img.complete) return Promise.resolve();
            return new Promise(function (resolve) {
                img.addEventListener('load', resolve, { once: true });
                img.addEventListener('error', resolve, { once: true });
            });
        }));
    }

    function killGalleryPin() {
        if (galleryScrollTrigger) {
            galleryScrollTrigger.kill();
            galleryScrollTrigger = null;
        }
        var pinWrap = document.querySelector('.about-gallery-pin');
        var track = document.querySelector('.about-gallery__track');
        if (track && typeof gsap !== 'undefined') gsap.set(track, { clearProps: 'transform' });
        if (pinWrap) pinWrap.classList.remove('is-pin-driven');
    }

    window.teardownAboutGalleryPin = killGalleryPin;

    window.initAboutGalleryPin = function () {
        var pinWrap = document.querySelector('.about-gallery-pin');
        var pinInner = document.querySelector('.about-gallery-pin__inner');
        var gallery = document.querySelector('.about-gallery');
        var track = document.querySelector('.about-gallery__track');
        if (!pinWrap || !pinInner || !gallery || !track) return;
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
        if (window.matchMedia && window.matchMedia('(max-width: 660px)').matches) return;

        gsap.registerPlugin(ScrollTrigger);
        killGalleryPin();

        return waitForGalleryImages(gallery).then(function () {
            var maxScroll = Math.max(0, track.scrollWidth - gallery.clientWidth);
            if (maxScroll <= 0) return;

            pinWrap.classList.add('is-pin-driven');

            var topbar = document.querySelector('.about-topbar');
            var pinTopOffset = topbar ? Math.round(topbar.getBoundingClientRect().bottom + 40) : 0;

            var tween = gsap.to(track, {
                x: -maxScroll,
                ease: 'none',
                scrollTrigger: {
                    trigger: pinInner,
                    start: 'top top+=' + pinTopOffset,
                    end: '+=' + Math.round(maxScroll + window.innerHeight * 0.15),
                    pin: true,
                    scrub: 0.35,
                    invalidateOnRefresh: true,
                },
            });

            galleryScrollTrigger = tween.scrollTrigger;
            ScrollTrigger.refresh();
        });
    };
})();
