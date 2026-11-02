// The atlas is rendered from the owner's Blender model: 13 yaw angles ×
// 9 pitch angles, using the full mesh and the owner’s detailed chrome texture.
// This keeps real head rotation without a WebGL dependency.
export function initCursorAvatar() {
    const avatar = document.querySelector('[data-cursor-avatar]');
    if (!avatar) return;
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = matchMedia('(hover: hover) and (pointer: fine)');
    if (motion.matches || !pointer.matches) return;

    const atlas = new Image();
    atlas.src = '/assets/avatar/ahmad-directions.webp';
    atlas.onload = () => {
        const canvas = document.createElement('canvas');
        const size = atlas.naturalWidth / 13;
        canvas.width = canvas.height = size;
        canvas.setAttribute('aria-hidden', 'true');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        avatar.append(canvas);
        avatar.classList.add('has-cursor-avatar');
        let x = 0, y = 0, targetX = 0, targetY = 0, frame = 0;
        let lastColumn = -1, lastRow = -1;
        let visible = true;
        const clamp = value => Math.max(-1, Math.min(1, value));
        const draw = () => {
            frame = 0;
            x += (targetX - x) * .18;
            y += (targetY - y) * .18;
            const column = Math.round(6 + x * 6);
            const row = Math.round(4 + y * 4);
            if (column !== lastColumn || row !== lastRow) {
                ctx.clearRect(0, 0, size, size);
                ctx.drawImage(atlas, column * size, row * size, size, size, 0, 0, size, size);
                lastColumn = column; lastRow = row;
            }
            if (visible && (Math.abs(targetX - x) > .005 || Math.abs(targetY - y) > .005)) {
                frame = requestAnimationFrame(draw);
            }
        };
        const schedule = () => {
            if (!frame && visible) frame = requestAnimationFrame(draw);
        };
        const reset = () => { targetX = targetY = 0; schedule(); };
        window.addEventListener('pointermove', event => {
            if (event.pointerType === 'touch' || motion.matches || !pointer.matches || !visible) return;
            const rect = avatar.getBoundingClientRect();
            targetX = clamp((event.clientX - rect.left - rect.width / 2) / (innerWidth * .35));
            targetY = clamp((event.clientY - rect.top - rect.height / 2) / (innerHeight * .35));
            schedule();
        }, { passive: true });
        document.documentElement.addEventListener('pointerleave', reset);
        window.addEventListener('blur', reset);
        const preferencesChanged = () => {
            if (motion.matches || !pointer.matches) {
                cancelAnimationFrame(frame); frame = 0;
                targetX = targetY = x = y = 0;
                draw();
            }
        };
        motion.addEventListener('change', preferencesChanged);
        pointer.addEventListener('change', preferencesChanged);
        new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible) schedule();
            else { cancelAnimationFrame(frame); frame = 0; }
        }).observe(avatar);
        draw();
    };
    // The static portrait remains if the atlas cannot load.
}

if (typeof document !== 'undefined') initCursorAvatar();
