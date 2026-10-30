/** A quartz desk clock showing the visitor's local time. */
export function initPileClock(clock) {
    if (!clock) return;
    const ticks = Array.from({ length: 60 }, (_, i) => {
        const hour = i % 5 === 0;
        return `<path d="M120 ${hour ? 24 : 25}v${hour ? 12 : 5}" transform="rotate(${i * 6} 120 115)" stroke="#191a17" stroke-width="${hour ? 4 : 1.8}" stroke-linecap="${hour ? 'butt' : 'round'}"/>`;
    }).join('');
    const numbers = Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const angle = n * Math.PI / 6;
        return `<text x="${120 + Math.sin(angle) * 73}" y="${115 - Math.cos(angle) * 73}" text-anchor="middle" dominant-baseline="central">${n}</text>`;
    }).join('');
    clock.innerHTML = `<svg viewBox="0 0 240 250" aria-hidden="true">
        <defs>
            <linearGradient id="clock-steel" x1="0" y1="0" x2="1" y2="1">
                <stop stop-color="#777974"/><stop offset=".12" stop-color="#f8f8f0"/>
                <stop offset=".19" stop-color="#646562"/><stop offset=".27" stop-color="#e6e5db"/>
                <stop offset=".48" stop-color="#96978f"/><stop offset=".68" stop-color="#f5f4eb"/>
                <stop offset=".83" stop-color="#666862"/><stop offset=".94" stop-color="#d6d6cf"/><stop offset="1" stop-color="#464944"/>
            </linearGradient>
            <radialGradient id="clock-paper" cx=".34" cy=".22" r=".85">
                <stop stop-color="#f3f0de"/><stop offset=".75" stop-color="#e5e1cc"/><stop offset="1" stop-color="#ceccb9"/>
            </radialGradient>
            <linearGradient id="clock-glass" x1="0" y1="0" x2=".5" y2="1">
                <stop stop-color="#fff" stop-opacity=".32"/><stop offset=".48" stop-color="#fff" stop-opacity="0"/>
            </linearGradient>
            <filter id="clock-hand-shadow" x="-60%" y="-60%" width="220%" height="220%">
                <feDropShadow dx="1" dy="2" stdDeviation="1.4" flood-opacity=".25"/>
            </filter>
        </defs>
        <ellipse cx="120" cy="237" rx="69" ry="8" fill="#141613" opacity=".2"/>
        <path d="M57 208 51 234q69 17 138 0l-6-26" fill="#30322e"/>
        <path d="M58 214 55 232q65 12 130 0l-3-18" fill="url(#clock-steel)"/>
        <circle cx="120" cy="115" r="110" fill="#363a36"/>
        <circle cx="120" cy="115" r="108" fill="url(#clock-steel)" stroke="#bdbeb5"/>
        <circle cx="120" cy="115" r="102" fill="#555851" stroke="#f4f3eb" stroke-width="1.5"/>
        <circle cx="120" cy="115" r="99" fill="url(#clock-paper)" stroke="#96998a"/>
        ${ticks}
        <g fill="#171a16" font-family="'Suisse Intl', Arial, sans-serif" font-size="17" letter-spacing="-1">${numbers}</g>
        <text x="120" y="80" text-anchor="middle" fill="#272a23" font-family="'Suisse Intl', Arial, sans-serif" font-size="6" letter-spacing="1">LOCAL TIME</text>
        <text x="120" y="88" text-anchor="middle" fill="#474a40" font-family="'Suisse Intl', Arial, sans-serif" font-size="5">quartz</text>
        <g filter="url(#clock-hand-shadow)">
            <g data-clock-hour><path d="M116 120 116 57q4-3 8 0v63Z" fill="#181b18" stroke="#41443d" stroke-width=".6"/></g>
            <g data-clock-minute><path d="M118 124 118 30q2-2 4 0v94Z" fill="#181b18" stroke="#41443d" stroke-width=".6"/></g>
            <g data-clock-second><path d="M119.2 203V96h1.6v107Z" fill="#ce930f"/><rect x="116" y="92" width="8" height="24" rx="4" fill="#d99b11" stroke="#efb334" stroke-width=".5"/></g>
            <circle cx="120" cy="115" r="6" fill="#d39915" stroke="#b7800d" stroke-width=".6"/>
        </g>
        <circle cx="120" cy="115" r="98" fill="url(#clock-glass)" pointer-events="none"/>
        <path d="M32 82a93 93 0 0 1 138-47" fill="none" stroke="#fff" stroke-width="1.5" opacity=".45"/>
    </svg>`;
    const hourHand = clock.querySelector('[data-clock-hour]');
    const minuteHand = clock.querySelector('[data-clock-minute]');
    const secondHand = clock.querySelector('[data-clock-second]');
    let timer;
    let labelMinute;
    function tick() {
        const now = new Date();
        const seconds = now.getSeconds();
        const minutes = now.getMinutes() + seconds / 60;
        hourHand.setAttribute('transform', `rotate(${(now.getHours() % 12 + minutes / 60) * 30} 120 115)`);
        minuteHand.setAttribute('transform', `rotate(${minutes * 6} 120 115)`);
        // The yellow hand is drawn downwards, with its counterweight above the pin.
        secondHand.setAttribute('transform', `rotate(${seconds * 6 + 180} 120 115)`);
        if (labelMinute !== Math.floor(now.getTime() / 60000)) {
            labelMinute = Math.floor(now.getTime() / 60000);
            clock.setAttribute('aria-label', `Local time: ${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`);
        }
    }
    function start() {
        clearInterval(timer);
        tick();
        if (!document.hidden) timer = setInterval(tick, 1000);
    }
    document.addEventListener('visibilitychange', start);
    window.addEventListener('pageshow', start);
    window.addEventListener('pagehide', () => clearInterval(timer));
    start();
}
