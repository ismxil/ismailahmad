const STUDIO_URL = '/assets/card-studio/index.html';

/** Replaces the original Card Studio screenshot in Sterling's case study. */
export function cardStudio() {
    return `<figure class="case-studio">
        <div class="case-studio__frame">
            <img class="case-studio__poster" src="/assets/card-studio/preview.png"
                alt="Card Studio with a purple Sterling prepaid card and its design controls" loading="lazy" />
            <iframe data-src="${STUDIO_URL}" title="Sterling Card Studio — interactive card designer"
                loading="lazy" allow="fullscreen" allowfullscreen></iframe>
        </div>
        <figcaption class="case-studio__caption">
            <span class="case-studio__caption-live">Try Card Studio. Choose a card, change its colours, and export your design.</span>
            <span class="case-studio__caption-mobile">Open Card Studio to customise and export a card.</span>
            <a href="${STUDIO_URL}" target="_blank" rel="noopener" aria-label="Open Card Studio in a new tab">Open Card Studio</a>
        </figcaption>
    </figure>`;
}

export function initCardStudio(mount) {
    const iframe = mount.querySelector('.case-studio iframe');
    if (!iframe) return;
    const frame = iframe.parentElement;
    const mobile = matchMedia('(max-width: 767px)');
    let visible = true;
    function notify() {
        iframe.contentWindow?.postMessage({ type: 'card-studio-visibility', visible: visible && !mobile.matches }, location.origin);
    }
    function fit() {
        // Keep the editor's desktop arrangement, scaled as one canvas. Its
        // own narrow-screen layout would otherwise push panels out of view.
        frame.style.setProperty('--studio-scale', String(frame.clientWidth / 1440));
    }
    function updateMode() {
        iframe.hidden = mobile.matches;
        if (!mobile.matches && !iframe.hasAttribute('src')) iframe.src = iframe.dataset.src;
        fit();
        notify();
    }
    new ResizeObserver(fit).observe(frame);
    mobile.addEventListener('change', updateMode);
    updateMode();
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
