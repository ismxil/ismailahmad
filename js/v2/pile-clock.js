/** A quartz desk clock showing the visitor's local time. */
export function initPileClock(clock) {
    if (!clock) return;
    const ticks = Array.from({ length: 60 }, (_, i) => {
        const hour = i % 5 === 0;
        return `<path d="M120 ${hour ? 23 : 25}v${hour ? 10 : 5}" transform="rotate(${i * 6} 120 115)" stroke="#191a17" stroke-width="${hour ? 4.8 : 1.7}" stroke-linecap="${hour ? 'butt' : 'round'}"/>`;
    }).join('');
    const numbers = Array.from({ length: 12 }, (_, i) => {
        const n = i + 1;
        const angle = n * Math.PI / 6;
        return `<text x="${120 + Math.sin(angle) * 70}" y="${115 - Math.cos(angle) * 70}" text-anchor="middle" dominant-baseline="central" textLength="${n >= 10 ? 17 : 10}" lengthAdjust="spacingAndGlyphs">${n}</text>`;
    }).join('');
    clock.innerHTML = `<svg viewBox="0 0 240 250" aria-hidden="true">
        <defs>
            <linearGradient id="clock-steel" x1="0" y1="0" x2=".85" y2="1">
                <stop stop-color="#45474a"/><stop offset=".12" stop-color="#d0d1cf"/>
                <stop offset=".2" stop-color="#fffef4"/><stop offset=".27" stop-color="#6d6e6c"/>
                <stop offset=".42" stop-color="#e9e8df"/><stop offset=".62" stop-color="#92948f"/>
                <stop offset=".8" stop-color="#f6f5e9"/><stop offset=".9" stop-color="#626561"/><stop offset="1" stop-color="#c5c5ba"/>
            </linearGradient>
            <linearGradient id="clock-stand" x1="0" y1="0" x2="0" y2="1">
                <stop stop-color="#a0a29e"/><stop offset=".12" stop-color="#f3f2ea"/>
                <stop offset=".28" stop-color="#d8d9d3"/><stop offset=".55" stop-color="#b9bbb5"/>
                <stop offset=".8" stop-color="#e6e6df"/><stop offset=".96" stop-color="#838680"/><stop offset="1" stop-color="#555a54"/>
            </linearGradient>
            <linearGradient id="clock-stand-end" x1="0" y1="0" x2="1" y2="0">
                <stop stop-color="#686d67"/><stop offset=".3" stop-color="#f3f3ed"/><stop offset=".65" stop-color="#c5c7bf"/><stop offset="1" stop-color="#858a82"/>
            </linearGradient>
            <radialGradient id="clock-paper" cx=".36" cy=".28" r=".9">
                <stop stop-color="#f4f1df"/><stop offset=".65" stop-color="#eae7d3"/><stop offset="1" stop-color="#d8d7c3"/>
            </radialGradient>
            <linearGradient id="clock-gold" x1="0" y1="0" x2="1" y2=".3">
                <stop stop-color="#9b6506"/><stop offset=".28" stop-color="#d59a21"/><stop offset=".7" stop-color="#dba529"/><stop offset="1" stop-color="#b67c0c"/>
            </linearGradient>
            <linearGradient id="clock-glass" x1="0" y1="0" x2=".65" y2="1">
                <stop stop-color="#fff" stop-opacity=".12"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#6a5d36" stop-opacity=".035"/>
            </linearGradient>
            <filter id="clock-hand-shadow" x="-60%" y="-60%" width="220%" height="220%">
                <feDropShadow dx="1" dy="2" stdDeviation="1.4" flood-opacity=".25"/>
            </filter>
        </defs>
        <ellipse cx="120" cy="235" rx="109" ry="6" fill="#151712" opacity=".15"/>
        <!-- The low cylindrical cradle sits behind the round clock body. -->
        <rect x="18" y="171" width="204" height="53" rx="5" fill="url(#clock-stand)" stroke="#8e938b" stroke-width=".6"/>
        <ellipse cx="20" cy="197.5" rx="4" ry="26.5" fill="url(#clock-stand-end)" stroke="#bfc2b9" stroke-width=".6"/>
        <ellipse cx="220" cy="197.5" rx="4" ry="26.5" fill="url(#clock-stand-end)" stroke="#bfc2b9" stroke-width=".6"/>
        <path d="M26 174v47M214 174v47" stroke="#757b72" stroke-width=".7" opacity=".6"/>
        <path d="M28 222h184" stroke="#f8f7ec" stroke-opacity=".6"/>
        <circle cx="120" cy="115" r="110" fill="#555954"/>
        <circle cx="120" cy="115" r="108.8" fill="url(#clock-steel)" stroke="#a8aba3" stroke-width=".6"/>
        <circle cx="120" cy="115" r="105.8" fill="none" stroke="#f4f3e9" stroke-width="1.1"/>
        <circle cx="120" cy="115" r="104.4" fill="none" stroke="#4e514c" stroke-width="1.4"/>
        <circle cx="120" cy="115" r="102.4" fill="url(#clock-steel)" stroke="#dfdfd5" stroke-width=".8"/>
        <circle cx="120" cy="115" r="99.5" fill="url(#clock-paper)" stroke="#797e71" stroke-width=".6"/>
        <circle cx="120" cy="115" r="97.8" fill="none" stroke="#fffff3" stroke-opacity=".6" stroke-width=".6"/>
        <path d="M110 224h20v7h-20Z" fill="url(#clock-stand)" stroke="#a6aa9f" stroke-width=".4"/>
        ${ticks}
        <g fill="#171a16" font-family="'Suisse Intl', Arial, sans-serif" font-size="16" letter-spacing="-1">${numbers}</g>
        <text x="120" y="77" text-anchor="middle" fill="#171914" font-family="Arial, sans-serif" font-size="8.5" font-weight="700" textLength="29" lengthAdjust="spacingAndGlyphs">BR<tspan font-size="11">A</tspan>UN</text>
        <text x="120" y="85" text-anchor="middle" fill="#282b23" font-family="Arial, sans-serif" font-size="6.5">quartz</text>
        <g filter="url(#clock-hand-shadow)">
            <g data-clock-hour><path d="M115.5 120V55q4.5-2 9 0v65Z" fill="#11130f" stroke="#30332b" stroke-width=".5"/></g>
            <g data-clock-minute><path d="M117.5 123V29q2.5-1.5 5 0v94Z" fill="#11130f" stroke="#30332b" stroke-width=".5"/></g>
            <g data-clock-second><path d="M119.2 203V96h1.6v107Z" fill="url(#clock-gold)"/><rect x="115" y="88" width="10" height="28" rx="5" fill="url(#clock-gold)" stroke="#e5b345" stroke-width=".4"/></g>
            <circle cx="120" cy="115" r="6.3" fill="url(#clock-gold)" stroke="#a46f10" stroke-width=".5"/>
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
