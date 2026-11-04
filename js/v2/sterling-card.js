const ART = '/assets/card-studio/cards/';

// Classic back layout from vendor/card-studio/cards.ts, in physical millimetres.
// Keep the original assets and Youth type rather than approximating the artwork.
function classicBack() {
    const position = (x, y, w, h) => `left:${x / 85.6 * 100}%;top:${y / 53.98 * 100}%;width:${w / 85.6 * 100}%;height:${h / 53.98 * 100}%;`;
    const text = (value, x, y, w, size, right = false, tracking = 0) => `<span class="sterling-card__text" style="${position(x, y, w, size * 1.2)}font-size:${size / 85.6 * 100}cqw;text-align:${right ? 'right' : 'left'};letter-spacing:${tracking / 85.6 * 100}cqw">${value}</span>`;
    const image = (file, x, y, w, h, white = false) => `<img class="sterling-card__back-art" style="${position(x, y, w, h)}${white ? 'filter:brightness(0) invert(1);' : ''}" src="${ART}${file}" alt="" draggable="false">`;
    return `<span class="sterling-card__stripe" style="${position(0, 4.5, 85.6, 10.8)}"></span>
        ${text('STERLING BANK NIGERIA - 1556/234/56789102/00', 3, 1.6, 79.6, 1.25, true)}
        ${text('NKENNA LOBALOBA', 3.2, 19.4, 70, 3.6)}
        ${text('5574 3210 0123 4756', 3.2, 24.4, 70, 5.3, false, .4)}
        ${text('EXP', 3.2, 31.9, 4.7, 1.9, false, .1)}
        ${text('01/30', 9, 31.4, 13.5, 3, false, .2)}
        ${text('CVV', 25, 31.9, 5, 1.9, false, .1)}
        ${text('756', 31.4, 31.4, 10.5, 3, false, .2)}
        ${image('nfc.svg', 78.1, 22.5, 3.5, 4.5, true)}
        ${image('silver-foil.svg', 34, 45.897, 7, 5.083)}
        ${image('sterling-symbol.svg', 3.2, 45.8, 5.2, 5.2)}
        ${image('sterling-wordmark.svg', 9.2, 47, 12.2, 12.2 * 37 / 143)}
        ${text('NEED HELP? VISIT STERLING.NG/HELP', 47, 47.3, 35.4, 1.25, true)}
        ${text('OR CALL 055 869 69653', 47, 49.3, 35.4, 1.25, true)}`;
}

export function sterlingCard() {
    return `<figure class="case-figure sterling-card" aria-label="Interactive Sterling Verve card">
        <div class="sterling-card__scene">
            <button class="sterling-card__object" type="button" aria-label="Flip Sterling card to the back" aria-pressed="false" aria-describedby="sterling-card-help">
                <span class="sterling-card__face sterling-card__front" aria-hidden="true">
                    <img class="sterling-card__brand" src="${ART}sterling-wordmark.svg" alt="" draggable="false">
                    <img class="sterling-card__chip" src="${ART}chips.svg" alt="" draggable="false">
                    <img class="sterling-card__network" src="${ART}verve-logo.svg" alt="" draggable="false">
                </span>
                <span class="sterling-card__face sterling-card__back" aria-hidden="true">
                    ${classicBack()}
                </span>
            </button>
        </div>
        <figcaption class="sterling-card__help" id="sterling-card-help">Move to tilt, drag or use arrow keys to rotate, and click or press Enter to flip. Escape resets the view. Sample card details are for design preview only.</figcaption>
    </figure>`;
}

export function initSterlingCard(mount) {
    const scene = mount.querySelector('.sterling-card__scene');
    if (!scene) return;
    const card = scene.querySelector('button');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let x = 0, y = 0, flipped = false, drag = null, dragged = false;
    function draw() {
        card.style.setProperty('--card-x', `${x}deg`);
        card.style.setProperty('--card-y', `${y + (flipped ? 180 : 0)}deg`);
        // The light travels across the satin surface with the viewing angle.
        const lightX = Math.max(0, Math.min(100, 50 + y * 1.4));
        const lightY = Math.max(0, Math.min(100, 35 - x * 1.6));
        card.style.setProperty('--light-x', `${lightX}%`);
        card.style.setProperty('--light-y', `${lightY}%`);
        card.setAttribute('aria-pressed', String(flipped));
        card.setAttribute('aria-label', `Flip Sterling card to the ${flipped ? 'front' : 'back'}`);
    }
    function resetTilt() { x = 0; y = 0; draw(); }
    scene.addEventListener('pointermove', event => {
        if (drag) {
            const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
            if (Math.abs(dx) + Math.abs(dy) > 6) dragged = true;
            y = drag.yaw + dx * 0.45;
            x = Math.max(-45, Math.min(45, drag.pitch - dy * 0.2));
        } else {
            if (event.pointerType === 'touch' || reduced.matches) return;
            const rect = scene.getBoundingClientRect();
            y = ((event.clientX - rect.left) / rect.width - 0.5) * 30;
            x = (0.5 - (event.clientY - rect.top) / rect.height) * 24;
        }
        draw();
    });
    card.addEventListener('pointerdown', event => {
        if (!event.isPrimary || event.button !== 0) return;
        drag = { x: event.clientX, y: event.clientY, yaw: y, pitch: x };
        dragged = false;
        card.setPointerCapture(event.pointerId);
        card.classList.add('is-dragging');
    });
    function release() { drag = null; card.classList.remove('is-dragging'); }
    card.addEventListener('pointerup', release);
    card.addEventListener('pointercancel', () => { release(); resetTilt(); });
    card.addEventListener('lostpointercapture', release);
    scene.addEventListener('pointerleave', () => { if (!drag) resetTilt(); });
    card.addEventListener('click', () => {
        if (dragged) { dragged = false; return; }
        flipped = !flipped;
        resetTilt();
    });
    card.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Escape'].includes(event.key)) return;
        event.preventDefault();
        dragged = false;
        if (event.key === 'Escape') { flipped = false; resetTilt(); return; }
        if (event.key === 'ArrowLeft') y -= 15;
        if (event.key === 'ArrowRight') y += 15;
        if (event.key === 'ArrowUp') x = Math.min(45, x + 10);
        if (event.key === 'ArrowDown') x = Math.max(-45, x - 10);
        draw();
    });
}
