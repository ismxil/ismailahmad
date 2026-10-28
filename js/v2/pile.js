import { getBooks } from './books.js';

/**
 * The pile at the foot of About. Each item carries its resting place on the
 * canvas as "x y rotation" (data-pile, or data-pile-m on a phone). When the
 * reader nears the footer everything falls from above and bounces into
 * place; after that each item can be dragged.
 */

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const phone = matchMedia('(max-width: 719px)');

export function initPile(stage) {
    if (!stage) return;
    const pile = stage.closest('.pile');
    const all = [...stage.querySelectorAll('.pile__item')];
    // A book slot goes away if Goodreads has nothing to put in it.
    const live = () => all.filter(item => item.isConnected);
    let scale = 1;
    let top = all.length;

    const restingPlace = item => {
        const [x, y, r] = (phone.matches && item.dataset.pileM || item.dataset.pile).split(' ').map(Number);
        return { x, y, r };
    };

    function layout() {
        scale = stage.clientWidth / (phone.matches ? 600 : 1040);
        stage.style.setProperty('--k', scale);
        live().forEach(item => {
            const { x, y, r } = restingPlace(item);
            item.style.left = `${x}px`;
            item.style.top = `${y}px`;
            item.style.transform = `rotate(${r}deg)`;
        });
    }

    // Shuffled so the pile lands in a different order each time, with the
    // big photos first and the small things settling on top.
    const order = () => live()
        .map(item => ({ item, weight: item.offsetWidth * item.offsetHeight * (0.6 + Math.random() * 0.8) }))
        .sort((a, b) => b.weight - a.weight)
        .map(({ item }) => item);

    function drop() {
        pile.classList.remove('is-waiting');
        if (reduceMotion.matches) return Promise.resolve();
        return Promise.all(order().map((item, i) => {
            const { y, r } = restingPlace(item);
            const height = y + item.offsetHeight + 240 + Math.random() * 200;
            const spin = r + (Math.random() - 0.5) * 50;
            const bounce = 10 + Math.random() * 16;
            item.style.zIndex = String(i + 1);
            return item.animate([
                { transform: `translateY(${-height}px) rotate(${spin}deg)`, easing: 'cubic-bezier(0.5, 0, 0.9, 0.55)' },
                { offset: 0.62, transform: `translateY(0) rotate(${r}deg)`, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' },
                { offset: 0.8, transform: `translateY(${-bounce}px) rotate(${r + (spin - r) * 0.08}deg)`, easing: 'cubic-bezier(0.6, 0, 0.9, 0.6)' },
                { transform: `rotate(${r}deg)` },
            ], { duration: 1050, delay: i * 70, fill: 'backwards' }).finished;
        }));
    }

    layout();
    if (!reduceMotion.matches) pile.classList.add('is-waiting');
    new ResizeObserver(layout).observe(stage);
    phone.addEventListener('change', layout);

    // Everything is in place for screen readers and no-JS readers alike; the
    // fall is only a show, played once, as the reader nears the footer.
    const footer = document.querySelector('.site-footer') || stage;
    const watcher = new IntersectionObserver(entries => {
        if (!entries.some(e => e.isIntersecting)) return;
        watcher.disconnect();
        drop();
    }, { rootMargin: '0px 0px 120px 0px' });
    watcher.observe(footer);

    // Dragging. A press that barely moves stays a click, so the CD still
    // plays and the client icons still open.
    let moved = false;
    all.forEach(item => {
        item.addEventListener('pointerdown', event => {
            if (event.button !== 0 || event.target.closest('textarea, .pile-note button')) return;
            const start = { x: event.clientX, y: event.clientY, left: item.offsetLeft, top: item.offsetTop };
            moved = false;
            item.style.zIndex = String(++top);
            item.setPointerCapture(event.pointerId);
            const move = e => {
                const dx = (e.clientX - start.x) / scale;
                const dy = (e.clientY - start.y) / scale;
                if (!moved && Math.hypot(dx, dy) < 4) return;
                moved = true;
                item.classList.add('is-dragging');
                item.style.left = `${start.left + dx}px`;
                item.style.top = `${start.top + dy}px`;
            };
            const end = () => {
                item.classList.remove('is-dragging');
                item.removeEventListener('pointermove', move);
                item.removeEventListener('pointerup', end);
                item.removeEventListener('pointercancel', end);
            };
            item.addEventListener('pointermove', move);
            item.addEventListener('pointerup', end);
            item.addEventListener('pointercancel', end);
        });
        item.addEventListener('click', event => {
            if (!moved) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            moved = false;
        }, true);
        item.addEventListener('dragstart', event => event.preventDefault());
    });

    // The CD plays the two TWO LANES tracks in turn, spinning while it does,
    // with each track's cover on the disc.
    const cd = stage.querySelector('.pile-cd');
    const tracks = [
        { title: 'Immersion', src: '/assets/audio/02-immersion.m4a', cover: '/assets/audio/02-cover.jpg' },
        { title: 'Inner Motion', src: '/assets/audio/03-inner_motion.m4a', cover: '/assets/audio/03-cover.jpg' },
    ];
    let track = 0;
    let audio;
    const label = () => cd.setAttribute('aria-label', `${audio && !audio.paused ? 'Pause' : 'Play'} ${tracks[track].title} by TWO LANES`);
    cd?.addEventListener('click', () => {
        if (!audio) {
            audio = new Audio(tracks[track].src);
            audio.addEventListener('ended', () => {
                track = (track + 1) % tracks.length;
                audio.src = tracks[track].src;
                cd.querySelector('img').src = tracks[track].cover;
                audio.play().catch(() => {});
                label();
            });
        }
        const playing = audio.paused;
        if (playing) audio.play().catch(() => {}); else audio.pause();
        cd.classList.toggle('is-playing', playing);
        cd.setAttribute('aria-pressed', String(playing));
        label();
    });

    // Two five-star books from the Goodreads shelves.
    getBooks().then(books => {
        const favourites = books.filter(b => b.rating === 5 && b.cover);
        stage.querySelectorAll('[data-book]').forEach(slot => {
            const book = favourites[Number(slot.dataset.book)];
            if (!book) { slot.remove(); return; }
            const img = Object.assign(document.createElement('img'), { src: book.cover, alt: '', draggable: false, loading: 'lazy' });
            slot.append(img);
            slot.setAttribute('role', 'img');
            slot.setAttribute('aria-label', `${book.title} by ${book.author}`);
            slot.title = book.title.split(/:\s/)[0];
        });
    }).catch(() => stage.querySelectorAll('[data-book]').forEach(slot => slot.remove()));
}
