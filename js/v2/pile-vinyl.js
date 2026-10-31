const TRACKS = [
    { title: 'Immersion', src: '/assets/audio/02-immersion.m4a', cover: '/assets/audio/02-cover.jpg' },
    { title: 'Inner Motion', src: '/assets/audio/03-inner_motion.m4a', cover: '/assets/audio/03-cover.jpg' },
];
const PARK = -4;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** The arm owns playback; dragging the record still belongs to the pile. */
export function initPileVinyl(player) {
    if (!player) return;
    const arm = player.querySelector('[data-tonearm]');
    const svg = player.querySelector('svg');
    const disc = player.querySelector('.vinyl__disc');
    const record = player.querySelector('.vinyl__record');
    const status = player.querySelector('.vinyl__status');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let audio, track = 0, engaged = false, dragging = false, angle = PARK, landing = 24;
    let rotation = 0, speed = 0, volume = 0, frame = 0, previous = 0, visible = true, generation = 0;

    function setAngle(value) {
        angle = value;
        arm.style.transform = `rotate(${value}deg)`;
    }
    function labels(message) {
        const title = `${TRACKS[track].title} by TWO LANES`;
        arm.setAttribute('aria-label', `${engaged ? 'Lift tonearm to pause' : 'Lower tonearm to play'} ${title}`);
        arm.setAttribute('aria-pressed', String(engaged));
        record.setAttribute('aria-pressed', String(engaged));
        record.setAttribute('aria-label', `${engaged ? 'Pause' : 'Play'} ${title}`);
        if (message) status.textContent = message;
    }
    function wake() {
        if (!frame && !document.hidden && visible) frame = requestAnimationFrame(tick);
    }
    function tick(now) {
        frame = 0;
        const dt = Math.min((now - (previous || now)) / 1000, .064);
        previous = now;
        // A 33⅓ rpm platter accelerates and coasts without resetting its angle.
        speed += ((engaged ? 200 : 0) - speed) * (1 - Math.exp(-dt / (engaged ? .6 : .85)));
        rotation = (rotation + speed * dt) % 360;
        if (!reduced.matches) disc.style.transform = `rotate(${rotation}deg)`;
        const destination = engaged ? 1 : 0;
        volume += (destination - volume) * (1 - Math.exp(-dt / (engaged ? .35 : .12)));
        if (audio) {
            audio.volume = clamp(volume, 0, 1);
            if (!engaged && volume < .015) { audio.pause(); volume = 0; }
            if (engaged && !dragging && Number.isFinite(audio.duration) && audio.duration > 0) {
                setAngle(Math.min(38, landing + 10 * audio.currentTime / audio.duration));
            }
        }
        if (engaged || speed > .1 || volume > .015) wake();
        else previous = 0;
    }
    function stop({ immediate = false, announce = true } = {}) {
        generation++;
        engaged = false;
        player.classList.remove('is-playing');
        if (!dragging) setAngle(PARK);
        if (immediate || !visible || document.hidden) { audio?.pause(); volume = 0; }
        labels(announce ? 'Tonearm lifted. Music paused.' : '');
        wake();
    }
    function ensureAudio() {
        if (audio) return audio;
        audio = new Audio(TRACKS[track].src);
        audio.preload = 'none';
        audio.volume = 0;
        audio.addEventListener('ended', () => {
            if (!engaged) return;
            track = (track + 1) % TRACKS.length;
            audio.src = TRACKS[track].src;
            player.querySelector('.vinyl__disc img').src = TRACKS[track].cover;
            landing = 24;
            start();
        });
        audio.addEventListener('pause', () => {
            if (engaged && audio.paused && !audio.ended) stop({ immediate: true });
        });
        audio.addEventListener('error', () => {
            stop({ immediate: true, announce: false });
            labels('The record could not load. Lower the arm to try again.');
        });
        return audio;
    }
    async function start() {
        const media = ensureAudio();
        const attempt = ++generation;
        engaged = true;
        setAngle(landing);
        player.classList.add('is-playing');
        labels(`Playing ${TRACKS[track].title} by TWO LANES.`);
        wake();
        try {
            // Called directly from the pointer/keyboard gesture for mobile audio.
            await media.play();
            if (attempt !== generation && !engaged) media.pause();
        } catch {
            if (attempt !== generation) return;
            stop({ immediate: true, announce: false });
            labels('Playback could not start. Lower the arm to try again.');
        }
    }
    function toggle() { if (engaged) stop(); else { landing = 24; start(); } }
    record.addEventListener('click', toggle);
    function point(event) {
        const matrix = svg.getScreenCTM();
        if (!matrix) return null;
        return new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    }
    const pointerAngle = p => Math.atan2(215 - p.x, p.y - 22) * 180 / Math.PI;
    arm.addEventListener('pointerdown', event => {
        if (event.button !== 0 || dragging) return;
        event.preventDefault();
        event.stopPropagation();
        const origin = point(event);
        if (!origin) return;
        const wasEngaged = engaged, initial = angle;
        let moved = false;
        dragging = true;
        player.classList.add('is-arm-dragging', 'is-lifting');
        if (engaged) stop({ announce: false });
        arm.setPointerCapture(event.pointerId);
        const move = e => {
            const current = point(e);
            if (!current) return;
            if (Math.hypot(current.x - origin.x, current.y - origin.y) > 3) moved = true;
            setAngle(clamp(initial + pointerAngle(current) - pointerAngle(origin), -8, 44));
        };
        const end = e => {
            arm.removeEventListener('pointermove', move);
            arm.removeEventListener('pointerup', end);
            arm.removeEventListener('pointercancel', end);
            if (arm.hasPointerCapture(event.pointerId)) arm.releasePointerCapture(event.pointerId);
            dragging = false;
            player.classList.remove('is-arm-dragging', 'is-lifting');
            if (e.type === 'pointercancel') { stop(); return; }
            if (!moved) { if (wasEngaged) stop(); else { landing = 24; start(); } return; }
            // Forgive drops over the label or near the rim, then seat the stylus
            // on the grooves. Also accept the pointer landing on the record.
            const radians = angle * Math.PI / 180;
            const x = 215 - 12 * Math.cos(radians) - 152 * Math.sin(radians);
            const y = 22 - 12 * Math.sin(radians) + 152 * Math.cos(radians);
            const radius = Math.hypot(x - 95, y - 101);
            const dropped = point(e);
            const pointerOnRecord = dropped && Math.hypot(dropped.x - 95, dropped.y - 101) <= 100;
            if ((radius <= 103 && angle >= 14) || pointerOnRecord) {
                landing = clamp(angle, 22, 35);
                start();
            } else stop();
        };
        arm.addEventListener('pointermove', move);
        arm.addEventListener('pointerup', end);
        arm.addEventListener('pointercancel', end);
    });
    arm.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        event.stopPropagation();
        toggle();
    });
    arm.addEventListener('click', event => { if (event.detail === 0) toggle(); });
    new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) { previous = 0; wake(); }
        else {
            cancelAnimationFrame(frame); frame = 0;
            if (!engaged) { audio?.pause(); volume = 0; }
            else if (audio) { volume = 1; audio.volume = 1; }
        }
    }).observe(player);
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(frame); frame = 0;
            if (!engaged) { audio?.pause(); volume = 0; }
            else if (audio) { volume = 1; audio.volume = 1; }
        } else { previous = 0; wake(); }
    });
    window.addEventListener('pagehide', () => {
        stop({ immediate: true, announce: false });
        cancelAnimationFrame(frame);
        frame = previous = speed = 0;
    });
    setAngle(PARK);
    labels();
}
