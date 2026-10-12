// Native page crossfades cover navigation; this covers content that arrives
// afterwards. Keep the page usable throughout, and never delay a response.
let pending = 0;
let progress;
let timer;

export function beginContentLoad(mount) {
    if (!mount) return () => {};
    mount.setAttribute('aria-busy', 'true');
    if (pending++ === 0) {
        // Cached/fast responses should not flash a loading indicator.
        timer = setTimeout(() => {
            if (!progress) {
                progress = document.createElement('div');
                progress.className = 'page-progress';
                progress.setAttribute('aria-hidden', 'true');
                document.body.append(progress);
            }
            progress.hidden = false;
        }, 180);
    }

    let finished = false;
    return () => {
        if (finished) return;
        finished = true;
        mount.removeAttribute('aria-busy');
        if (--pending === 0) {
            clearTimeout(timer);
            if (progress) progress.hidden = true;
        }
        if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            mount.animate?.([{ opacity: 0 }, { opacity: 1 }], {
                duration: 240,
                easing: 'ease-out',
            });
        }
    };
}

export async function withContentTransition(mount, render) {
    const finish = beginContentLoad(mount);
    try {
        return await render();
    } finally {
        // Empty states and failures must clear the indicator too.
        finish();
    }
}
