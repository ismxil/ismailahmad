export function berlinTime(date = new Date()) {
    return new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
}

export function initLocalTime() {
    const clock = document.querySelector('[data-berlin-time]');
    if (!clock) return;
    let timer;
    function update() {
        clearTimeout(timer);
        const now = new Date();
        clock.textContent = berlinTime(now);
        clock.dateTime = now.toISOString();
        if (!document.hidden) timer = setTimeout(update, 60000 - now.getTime() % 60000);
    }
    document.addEventListener('visibilitychange', update);
    window.addEventListener('pageshow', update);
    window.addEventListener('pagehide', () => clearTimeout(timer));
    update();
}
