(function () {
    window.initAboutGalleryPin = function () {
        var pinWrap = document.querySelector('.about-gallery-pin');
        var pinInner = document.querySelector('.about-gallery-pin__inner');
        var gallery = document.querySelector('.about-gallery');
        var track = document.querySelector('.about-gallery__track');
        if (!pinWrap || !pinInner || !gallery || !track) return;
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
        if (window.matchMedia && window.matchMedia('(max-width: 660px)').matches) return;

        gsap.registerPlugin(ScrollTrigger);

        var maxScroll = Math.max(0, track.scrollWidth - gallery.clientWidth);
        if (maxScroll <= 0) return;

        pinWrap.classList.add('is-pin-driven');

        var topbar = document.querySelector('.about-topbar');
        var pinTopOffset = topbar ? Math.round(topbar.getBoundingClientRect().bottom + 40) : 0;

        gsap.to(track, {
            x: -maxScroll,
            ease: 'none',
            scrollTrigger: {
                trigger: pinInner,
                start: 'top top+=' + pinTopOffset,
                end: '+=' + Math.round(maxScroll + window.innerHeight * 0.15),
                pin: true,
                scrub: 0.35,
                invalidateOnRefresh: true
            }
        });
    };
})();
