(function () {
    if (typeof window.__aboutPhotoStackCleanup === 'function') {
        window.__aboutPhotoStackCleanup();
    }

    var stack = document.querySelector('[data-photo-stack]');
    if (!stack) return;

    var status = stack.querySelector('[data-photo-status]');
    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var releaseTimer = null;
    var drag = null;

    Array.prototype.forEach.call(stack.querySelectorAll('.about-photo-card'), function (card, index) {
        card.dataset.photoNumber = String(index + 1);
    });

    function cards() {
        return Array.prototype.slice.call(stack.querySelectorAll('.about-photo-card'));
    }

    function topCard() {
        return cards()[0] || null;
    }

    function syncCards() {
        cards().forEach(function (card, index) {
            card.tabIndex = index === 0 ? 0 : -1;
            card.setAttribute('aria-hidden', index === 0 ? 'false' : 'true');
        });
        var top = topCard();
        if (status && top) {
            status.textContent = 'Photo ' + top.dataset.photoNumber + ' of ' + cards().length;
        }
    }

    function rubberBand(value, limit) {
        return value / (1 + Math.abs(value) / limit);
    }

    function clearCardState(card) {
        card.classList.remove('is-dragging', 'is-returning', 'is-tucking', 'is-settling');
        card.style.removeProperty('transform');
    }

    function returnCard(card) {
        card.classList.remove('is-dragging');
        card.classList.add('is-returning');
        card.style.removeProperty('transform');
        window.clearTimeout(releaseTimer);
        releaseTimer = window.setTimeout(function () {
            card.classList.remove('is-returning');
        }, reduceMotion ? 0 : 620);
    }

    function swapCard(card, direction, releaseY) {
        var sideTravel = Math.min(Math.max(stack.clientWidth * 0.42, 130), 220);
        var statusAnchor = status || null;
        var finish = function () {
            clearCardState(card);
        };

        var sendToBack = function () {
            stack.insertBefore(card, statusAnchor);
            card.classList.remove('is-tucking');
            card.classList.add('is-settling');
            syncCards();
            var next = topCard();
            if (next) next.focus({ preventScroll: true });

            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    card.style.removeProperty('transform');
                });
            });

            window.clearTimeout(releaseTimer);
            releaseTimer = window.setTimeout(finish, reduceMotion ? 0 : 600);
        };

        card.classList.remove('is-dragging', 'is-returning');
        card.classList.add('is-tucking');

        if (reduceMotion) {
            sendToBack();
            return;
        }

        card.style.transform = 'translate3d(' + (direction * sideTravel) + 'px, ' + (18 + releaseY * 0.12) + 'px, 0) rotate(' + (direction * 7) + 'deg) scale(0.965)';
        window.clearTimeout(releaseTimer);
        releaseTimer = window.setTimeout(sendToBack, 230);
    }

    function onPointerDown(event) {
        var card = event.target.closest('.about-photo-card');
        if (!card || card !== topCard()) return;
        if (event.button != null && event.button !== 0) return;

        drag = {
            card: card,
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            dx: 0,
            dy: 0,
            moved: false
        };
        card.classList.remove('is-returning');
        card.classList.add('is-dragging');
        try { card.setPointerCapture(event.pointerId); } catch (error) {}
        event.preventDefault();
    }

    function onPointerMove(event) {
        if (!drag || event.pointerId !== drag.pointerId) return;
        var rawX = event.clientX - drag.startX;
        var rawY = event.clientY - drag.startY;
        drag.dx = rubberBand(rawX, 320);
        drag.dy = rubberBand(rawY, 420);
        drag.moved = drag.moved || Math.abs(rawX) > 3 || Math.abs(rawY) > 3;

        var rotation = Math.max(-8, Math.min(8, drag.dx / 22));
        var stretch = 1 + Math.min(Math.abs(drag.dx) / 2600, 0.035);
        var squeeze = 1 - Math.min(Math.abs(drag.dx) / 5200, 0.018);
        drag.card.style.transform = 'translate3d(' + drag.dx + 'px, ' + drag.dy + 'px, 0) rotate(' + rotation + 'deg) scale(' + stretch + ', ' + squeeze + ')';
        event.preventDefault();
    }

    function onPointerEnd(event) {
        if (!drag || event.pointerId !== drag.pointerId) return;
        var current = drag;
        drag = null;
        try { current.card.releasePointerCapture(event.pointerId); } catch (error) {}

        if (current.moved && Math.hypot(current.dx, current.dy) >= 84) {
            swapCard(current.card, current.dx < 0 ? -1 : 1, current.dy);
        } else {
            returnCard(current.card);
        }
    }

    function onKeyDown(event) {
        var card = event.target.closest('.about-photo-card');
        if (!card || card !== topCard()) return;
        if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        event.preventDefault();
        swapCard(card, event.key === 'ArrowLeft' ? -1 : 1, 0);
    }

    stack.addEventListener('pointerdown', onPointerDown);
    stack.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerEnd);
    window.addEventListener('pointercancel', onPointerEnd);

    window.__aboutPhotoStackCleanup = function () {
        window.clearTimeout(releaseTimer);
        stack.removeEventListener('pointerdown', onPointerDown);
        stack.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerEnd);
        window.removeEventListener('pointercancel', onPointerEnd);
    };
    window.teardownAboutPhotoStack = window.__aboutPhotoStackCleanup;

    syncCards();
})();
