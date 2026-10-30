const STUDIO_URL = '/assets/card-studio/index.html';

/** Replaces the original Card Studio screenshot in Sterling's case study. */
export function cardStudio() {
    return `<figure class="case-studio">
        <div class="case-studio__frame">
            <iframe src="${STUDIO_URL}" title="Sterling Card Studio — interactive card designer"
                loading="lazy" allow="fullscreen" allowfullscreen></iframe>
        </div>
        <figcaption class="case-studio__caption">
            <span>Try Card Studio. Choose a card, change its colours, and export your design.</span>
            <a href="${STUDIO_URL}" target="_blank" rel="noopener" aria-label="Open Card Studio in a new tab">Open Card Studio</a>
        </figcaption>
    </figure>`;
}

export function initCardStudio(mount) {
    const iframe = mount.querySelector('.case-studio iframe');
    if (!iframe) return;
    let visible = true;
    function notify() {
        iframe.contentWindow?.postMessage({ type: 'card-studio-visibility', visible }, location.origin);
    }
    iframe.addEventListener('load', notify);
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting;
            notify();
        }, { rootMargin: '100px' });
        observer.observe(iframe);
        window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
    }
}
