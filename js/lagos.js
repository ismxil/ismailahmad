import { parseTile, renderRegion, PALETTES, hash } from './lagos-render.js';
import { BBOX, TILE, RASTER_LEVELS, RASTER_SIZE, project, unproject, AREA } from './lagos-map-schema.js';

const $ = id => document.getElementById(id);
// On tiny-lagos.ismailahmad.com the map is the root page.
if (location.hostname.startsWith('tiny-lagos.')) document.querySelector('.brand').href = '/';
const canvas = $('map'), ctx = canvas.getContext('2d');
const MAP = '/assets/lagos/map';

// ---------- places ----------
const places = [];
for (const [id, name, icon, lat, lng, category, description] of [
    ['marina', 'Marina', '▥', 6.4500, 3.3920, 'Lagos Island · Waterfront', 'The waterfront face of Lagos Island. A place of ferries, busy streets, and a skyline that tells the story of a trading city.'],
    ['third-mainland', 'Third Mainland Bridge', '⌁', 6.5144, 3.4055, 'Across the lagoon', 'Nearly twelve kilometres over open water, linking the mainland with Lagos Island. Look back toward the city and watch the skyline unfold.'],
    ['national-theatre', 'National Theatre', '◒', 6.4748, 3.3688, 'Iganmu · Arts & culture', 'An unmistakable silhouette in Iganmu and a landmark of Nigerian performing arts.'],
    ['national-stadium', 'National Stadium', '◎', 6.4983, 3.3646, 'Surulere · Sport', 'Opened in 1972 and host of the 1973 All-Africa Games, the great bowl on Western Avenue is part of a whole sports complex.'],
    ['teslim-balogun', 'Teslim Balogun Stadium', '◎', 6.4997, 3.3608, 'Surulere · Sport', 'The stadium just across Western Avenue from the National Stadium, home to football and athletics in Surulere.'],
    ['ikoyi', 'Ikoyi', '♧', 6.4540, 3.4330, 'Island life · Neighbourhood', 'Leafy streets, waterside views, and towers rising above the trees, between the lagoon and the bustle of the islands.'],
    ['lekki', 'Lekki–Ikoyi Bridge', '⋀', 6.4466, 3.4355, 'Over the water · Architecture', 'The cable-stayed bridge connecting Ikoyi and Lekki is one of the city’s most recognisable contemporary silhouettes.'],
    ['eko-atlantic', 'Eko Atlantic', '▥', 6.4110, 3.4060, 'Atlantic coast · A growing skyline', 'A new city rising on land reclaimed from the Atlantic, beside Victoria Island.'],
    ['victoria-island', 'Victoria Island', '▥', 6.4281, 3.4219, 'Island life · Neighbourhood', 'A lively mix of offices, places to eat, and waterfront streets between the lagoon and the Atlantic coast.'],
    ['freedom-park', 'Freedom Park', '♧', 6.4489, 3.3966, 'Lagos Island · Culture', 'A colonial-era prison turned into a park for art, music and memory in the middle of Lagos Island.'],
    ['makoko', 'Makoko', '⌂', 6.4960, 3.3880, 'Lagos Lagoon · Community', 'A waterfront community built on stilts over the lagoon, beside the Third Mainland Bridge.'],
    ['unilag', 'University of Lagos', '▤', 6.5120, 3.3941, 'Akoka · Campus', 'A lagoon-side campus in Akoka, with its own lakes, halls and tree-lined roads.'],
    ['ikeja', 'Ikeja', '▦', 6.6018, 3.3515, 'Mainland · State capital', 'The state capital, east of the airport: government offices, Allen Avenue, Computer Village, and busy commercial streets.'],
    ['airport', 'Murtala Muhammed Airport', '✈', 6.5741, 3.3201, 'Mainland · Airport', 'Lagos’s international airport, with its two long runways, terminals and aprons.'],
    ['agege', 'Agege', '▦', 6.6180, 3.3209, 'Mainland · District', 'North of the airport, known for its markets, its railway line, and the famous Agege bread.'],
    ['ojokoro', 'Ojokoro', '▦', 6.6680, 3.3100, 'Mainland · District', 'Around Ijaiye and the road out toward Ogun State.'],
    ['ojodu', 'Ojodu Berger', '▦', 6.6420, 3.3700, 'Mainland · District', 'A busy northern gateway where the Lagos–Ibadan Expressway meets the city.'],
    ['ketu', 'Ketu', '▦', 6.5970, 3.3890, 'Mainland · District', 'Along Ikorodu Road in Kosofe, home to the Mile 12 market and a steady stream of buses heading east.'],
    ['alimosho', 'Alimosho', '▦', 6.6050, 3.2680, 'Western mainland · District', 'Lagos’s most populous area: Egbeda, Ipaja and Idimu, with dense residential streets, markets, and green pockets.'],
    ['ikotun', 'Ikotun', '▦', 6.5500, 3.2640, 'Western mainland · District', 'A western mainland junction town in Alimosho, busy with markets and buses.'],
    ['ejigbo', 'Ejigbo', '▦', 6.5530, 3.3050, 'Mainland · District', 'Residential neighbourhoods between Isolo and Ikotun, south of the airport.'],
    ['oshodi', 'Oshodi', '▦', 6.5555, 3.3510, 'Mainland · Transport hub', 'One of the city’s great crossroads, where the Apapa–Oshodi Expressway, Agege Motor Road and the transport interchange meet.'],
    ['isolo', 'Isolo', '▦', 6.5370, 3.3230, 'Mainland · District', 'Residential and industrial streets west of Mushin, along the Oshodi–Apapa Expressway.'],
    ['ilupeju', 'Ilupeju', '▦', 6.5530, 3.3570, 'Mainland · District', 'A mix of factories, offices, and quiet residential streets just east of Oshodi.'],
    ['mushin', 'Mushin', '▦', 6.5273, 3.3449, 'Mainland · District', 'Dense, lively streets and the big Mushin market, between Oshodi and Surulere.'],
    ['luth', 'Idi-Araba', '✚', 6.5180, 3.3559, 'Mainland · Teaching hospital', 'Home to the Lagos University Teaching Hospital, on the edge of Mushin.'],
    ['shomolu', 'Shomolu', '▦', 6.5390, 3.3840, 'Mainland · District', 'Famous for its printing presses, between Ikorodu Road and the lagoon.'],
    ['yaba', 'Yaba', '▦', 6.5095, 3.3780, 'Mainland · Neighbourhood', 'A mainland neighbourhood with a rich mix of learning, technology, markets, and everyday Lagos life.'],
    ['tejuosho', 'Tejuosho Market', '▣', 6.5081, 3.3698, 'Yaba · Market', 'A big covered market on the edge of Yaba, a short walk from the stadiums.'],
    ['ojuelegba', 'Ojuelegba', '▦', 6.5090, 3.3640, 'Mainland · Junction', 'The busy junction where Surulere meets Yaba, made famous by Wizkid’s song.'],
    ['surulere', 'Surulere', '▦', 6.4950, 3.3500, 'Mainland · District', 'Residential streets west of the National and Teslim Balogun stadiums, between Mushin and the lagoon.'],
    ['festac', 'Festac Town', '▦', 6.4660, 3.2840, 'Western mainland · District', 'The planned town built for FESTAC ’77, the 1977 festival of Black and African arts and culture, in Amuwo-Odofin.'],
    ['ojo', 'Ojo / Satellite Town', '▦', 6.4660, 3.1820, 'Western mainland · District', 'The western end of the map, toward Ojo and the Lagos Trade Fair Complex.'],
    ['lekki-conservation', 'Lekki Conservation Centre', '♧', 6.4362, 3.5357, 'Lekki · Nature', 'A protected patch of wetland and forest on the Lekki Peninsula, crossed by a long canopy walkway.'],
]) places.push({ id, name, icon, lat, lng, ...project(lng, lat), category, description });
const pinnedNames = new Set(places.map(p => p.name.toLowerCase()));

// ---------- camera ----------
// The camera works in metres. p is pixels per metre; 100% is BASE.
const WORLD = project(BBOX.east, BBOX.south);
const COVERAGE = { x: 0, y: 0, width: WORLD.x, height: WORLD.y };
const BASE = 0.1, MIN_ZOOM = .33, MAX_P = 4;
let width = 0, height = 0, ratio = 1, p = BASE, cx = COVERAGE.width / 2, cy = COVERAGE.height / 2;
let night = false, selected = null, labelsVisible = true;
const minP = () => BASE * MIN_ZOOM;
const clampP = v => Math.max(minP(), Math.min(MAX_P, v));

// Once the map fits inside the viewport on an axis, it locks to the centre of that axis.
// Zoomed in, the camera can roam the map plus a margin that shrinks to nothing as the
// map approaches the viewport size.
function constrainCamera() {
    const clamp = (center, start, span, view) => {
        const spare = Math.max(0, span - view) / 2, range = spare + Math.min(2500, spare), middle = start + span / 2;
        return Math.max(middle - range, Math.min(middle + range, center));
    };
    cx = clamp(cx, COVERAGE.x, COVERAGE.width, width / p);
    cy = clamp(cy, COVERAGE.y, COVERAGE.height, height / p);
}
const screen = (x, y) => ({ x: (x - cx) * p + width / 2, y: (y - cy) * p + height / 2 });
const toWorld = (sx, sy) => ({ x: (sx - width / 2) / p + cx, y: (sy - height / 2) / p + cy });

// ---------- animation ----------
let raf = 0, animation = null, velocity = null;
function requestDraw() { if (!raf) raf = requestAnimationFrame(frame); }
function frame(now) {
    raf = 0;
    if (animation) {
        const t = Math.min(1, (now - animation.start) / animation.duration), e = 1 - Math.pow(1 - t, 3);
        p = Math.exp(animation.from.lp + (animation.to.lp - animation.from.lp) * e);
        if (animation.anchor) {
            const a = animation.anchor;
            cx = a.wx - (a.sx - width / 2) / p; cy = a.wy - (a.sy - height / 2) / p;
        } else {
            cx = animation.from.x + (animation.to.x - animation.from.x) * e; cy = animation.from.y + (animation.to.y - animation.from.y) * e;
        }
        if (t >= 1) animation = null;
    } else if (velocity) {
        const dt = Math.min(48, now - velocity.time); velocity.time = now;
        cx -= velocity.x * dt / p; cy -= velocity.y * dt / p;
        const decay = Math.pow(.92, dt / 16); velocity.x *= decay; velocity.y *= decay;
        if (Math.hypot(velocity.x, velocity.y) < .015) velocity = null;
    }
    draw();
    if (animation || velocity || pending()) requestDraw();
}
function animateTo(x, y, targetP, duration = 650) {
    velocity = null;
    animation = { start: performance.now(), duration, from: { x: cx, y: cy, lp: Math.log(p) }, to: { x, y, lp: Math.log(clampP(targetP)) } };
    requestDraw();
}
function zoomAt(factor, sx = width / 2, sy = height / 2, animate = false) {
    velocity = null;
    const next = clampP(p * factor), w = toWorld(sx, sy);
    if (animate) {
        animation = { start: performance.now(), duration: 260, from: { lp: Math.log(p) }, to: { lp: Math.log(next) }, anchor: { wx: w.x, wy: w.y, sx, sy } };
    } else {
        animation = null; p = next; cx = w.x - (sx - width / 2) / p; cy = w.y - (sy - height / 2) / p;
    }
    requestDraw();
}

// ---------- pictures for zoomed-out views ----------
const rasters = new Map();
function raster(mode, level, tx, ty) {
    const key = `${mode}/${level}/${tx}_${ty}`;
    let entry = rasters.get(key);
    if (!entry) {
        entry = { image: new Image(), ready: false };
        entry.image.decoding = 'async';
        entry.image.onload = () => { entry.ready = true; mapReady(); requestDraw(); };
        entry.image.src = `${MAP}/r/${key}.webp`;
        rasters.set(key, entry);
    }
    return entry.ready ? entry.image : null;
}
function drawRasterLevel(level) {
    const mode = night ? 'night' : 'day', span = RASTER_SIZE / level;
    const a = toWorld(0, 0), b = toWorld(width, height);
    for (let ty = Math.max(0, Math.floor(a.y / span)); ty <= Math.min(Math.ceil(COVERAGE.height / span) - 1, Math.floor(b.y / span)); ty++)
        for (let tx = Math.max(0, Math.floor(a.x / span)); tx <= Math.min(Math.ceil(COVERAGE.width / span) - 1, Math.floor(b.x / span)); tx++) {
            const img = raster(mode, level, tx, ty);
            if (!img) continue;
            const s = screen(tx * span, ty * span);
            ctx.drawImage(img, s.x, s.y, span * p + .5, span * p + .5);
        }
}

// ---------- live tiles, rendered in workers ----------
const LIVE_LEVELS = [.25, .5, 1, 2, 4], LIVE_PX = 512;
const live = new Map(), liveOrder = [];
const labelData = new Map();
let present = new Set(), workers = [], inFlight = 0, nextId = 1;
const requests = new Map();
const canUseWorkers = typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined';
function startWorkers(tiles) {
    present = new Set(tiles.map(([c, r]) => c + '_' + r));
    if (!canUseWorkers) return;
    const count = Math.max(1, Math.min(3, (navigator.hardwareConcurrency || 4) - 1));
    for (let i = 0; i < count; i++) {
        const worker = new Worker(new URL('./lagos-tiles-worker.js', import.meta.url), { type: 'module' });
        worker.postMessage({ type: 'init', tiles: [...present] });
        worker.onmessage = ({ data }) => {
            if (data.type === 'labels') { labelData.set(data.key, data.labels); requestDraw(); return; }
            const key = requests.get(data.id); requests.delete(data.id); inFlight--;
            if (key) { remember(key, data.bitmap); requestDraw(); }
        };
        workers.push(worker);
    }
}
function remember(key, image) {
    live.set(key, image); liveOrder.push(key);
    while (liveOrder.length > 140) { const old = liveOrder.shift(); const img = live.get(old); live.delete(old); img?.close?.(); }
}
let wanted = [];
function pending() { return wanted.length > 0 || inFlight > 0; }
function liveLevel() {
    const need = p * ratio;
    if (need < .16) return 0;
    return LIVE_LEVELS.find(l => l >= need * .9) || LIVE_LEVELS[LIVE_LEVELS.length - 1];
}
function drawLive() {
    const level = liveLevel();
    wanted = [];
    if (!level) return;
    const mode = night ? 'night' : 'day';
    // Fill from coarser live tiles first, so zooming in never flashes empty.
    for (const l of LIVE_LEVELS) {
        if (l > level) break;
        const span = LIVE_PX / l, a = toWorld(0, 0), b = toWorld(width, height);
        for (let ty = Math.floor(a.y / span); ty <= Math.floor(b.y / span); ty++)
            for (let tx = Math.floor(a.x / span); tx <= Math.floor(b.x / span); tx++) {
                if ((tx + 1) * span < 0 || (ty + 1) * span < 0 || tx * span > COVERAGE.width || ty * span > COVERAGE.height) continue;
                const key = `${mode}/${l}/${tx}_${ty}`, img = live.get(key);
                if (img) { const s = screen(tx * span, ty * span); ctx.drawImage(img, s.x, s.y, span * p + .5, span * p + .5); }
                else if (l === level) wanted.push({ key, tx, ty, l, span, d: Math.hypot((tx + .5) * span - cx, (ty + .5) * span - cy) });
            }
    }
    wanted.sort((a, b) => a.d - b.d);
    const mainThread = !canUseWorkers;
    for (const w of wanted) {
        if (mainThread) { if (renderOnMainThread(w, mode)) break; continue; }
        if (inFlight >= workers.length * 2) break;
        if ([...requests.values()].includes(w.key)) continue;
        const id = nextId++; requests.set(id, w.key); inFlight++;
        workers[id % workers.length].postMessage({ id, x0: w.tx * w.span, y0: w.ty * w.span, size: w.span, p: w.l, mode, px: LIVE_PX });
    }
}
// Fallback for browsers without OffscreenCanvas workers: render one tile per frame here.
const mainTiles = new Map();
function renderOnMainThread(w, mode) {
    const region = { x0: w.tx * w.span, y0: w.ty * w.span, x1: (w.tx + 1) * w.span, y1: (w.ty + 1) * w.span };
    const list = [];
    let waiting = false;
    for (let r = Math.floor((region.y0 - 300) / TILE); r <= Math.floor((region.y1 + 300) / TILE); r++)
        for (let c = Math.floor((region.x0 - 300) / TILE); c <= Math.floor((region.x1 + 300) / TILE); c++) {
            const key = c + '_' + r;
            if (!present.has(key)) continue;
            const entry = mainTiles.get(key);
            if (!entry) {
                mainTiles.set(key, { tile: null });
                fetch(`${MAP}/t/${key}.bin`).then(res => res.ok ? res.arrayBuffer() : null).then(buffer => {
                    if (!buffer) return;
                    const tile = parseTile(buffer, c, r);
                    mainTiles.get(key).tile = tile;
                    labelData.set(key, { streets: [], pois: tile.pois.filter(p => p.name).map(p => [p.name, p.kind, p.x, p.y, p.rank]) });
                    requestDraw();
                }).catch(() => {});
                waiting = true;
            } else if (!entry.tile) waiting = true;
            else list.push(entry.tile);
        }
    if (waiting) return false;
    const c = document.createElement('canvas'); c.width = c.height = LIVE_PX;
    const g = c.getContext('2d');
    if (!g) return false;
    g.setTransform(w.l, 0, 0, w.l, -region.x0 * w.l, -region.y0 * w.l);
    renderRegion(g, region, list, w.l, mode);
    remember(w.key, c);
    return true;
}

// ---------- backdrop: forest around the map, the Atlantic to the south ----------
const coastWest = project(BBOX.west, 6.402).y, coastEast = project(BBOX.east, 6.424).y;
const forestPatterns = {};
function forestPattern(mode) {
    if (forestPatterns[mode] !== undefined) return forestPatterns[mode];
    const size = 256, c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    if (!g) return (forestPatterns[mode] = null);
    const pal = PALETTES[mode];
    g.fillStyle = mode === 'night' ? '#0c1d15' : '#4f8a45'; g.fillRect(0, 0, size, size);
    for (let i = 0; i < 260; i++) {
        const x = hash(i * 13 + 1) * size, y = hash(i * 29 + 7) * size, r = 9 + hash(i * 41 + 3) * 11;
        for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) {
            g.fillStyle = pal.treeShade; g.beginPath(); g.arc(x + dx + r * .3, y + dy + r * .35, r, 0, 6.283); g.fill();
            g.fillStyle = pal.tree[i % 4]; g.beginPath(); g.arc(x + dx, y + dy, r, 0, 6.283); g.fill();
            g.fillStyle = pal.treeLight; g.beginPath(); g.arc(x + dx - r * .3, y + dy - r * .3, r * .45, 0, 6.283); g.fill();
        }
    }
    return (forestPatterns[mode] = ctx.createPattern(c, 'repeat'));
}
// A hand-cut edge around the mapped area, like tiny.london's island of detail.
const boundary = (() => {
    const pts = [], step = 700, { width: Wd, height: Ht } = COVERAGE;
    const wobble = i => 250 + hash(i * 7919) * 650;
    let i = 0;
    for (let x = 0; x < Wd; x += step) pts.push([x, wobble(i++)]);
    for (let y = 0; y < coastEast; y += step) pts.push([Wd - wobble(i++), y]);
    pts.push([Wd - 200, coastEast], [Wd + 6000, coastEast + 400], [Wd + 6000, Ht + 8000], [-6000, Ht + 8000], [-6000, coastWest + 400], [200, coastWest]);
    for (let y = coastWest; y > 0; y -= step) pts.push([wobble(i++), y]);
    return pts;
})();
function traceBoundary() {
    ctx.beginPath();
    boundary.forEach(([x, y], i) => { const s = screen(x, y); i ? ctx.lineTo(s.x, s.y) : ctx.moveTo(s.x, s.y); });
    ctx.closePath();
}
function drawBackdrop() {
    const mode = night ? 'night' : 'day';
    const pattern = forestPattern(mode);
    if (pattern && pattern.setTransform && typeof DOMMatrix !== 'undefined') {
        const worldSize = Math.max(140, 110 / p), s = worldSize * p / 256, origin = screen(0, 0);
        pattern.setTransform(new DOMMatrix([s, 0, 0, s, origin.x % (256 * s), origin.y % (256 * s)]));
        ctx.fillStyle = pattern;
    } else ctx.fillStyle = mode === 'night' ? '#0c1d15' : '#4f8a45';
    ctx.fillRect(0, 0, width, height);
    // The Atlantic carries on beyond the cut edge.
    const a = screen(-1e5, coastWest + 400), b = screen(COVERAGE.width + 1e5, coastEast + 400);
    ctx.fillStyle = PALETTES[mode].area[AREA.sea];
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x, height + 1e4); ctx.lineTo(a.x, height + 1e4); ctx.closePath(); ctx.fill();
}

// ---------- labels ----------
const POI_COLORS = ['#d9573f', '#4f7fae', '#d1495b', '#e09f3e', '#7a6aa8', '#5f9e4f', '#3f8c8c', '#b5651d', '#5b6b7a', '#8e6c8a'];
const POI_NAMES = ['Stadium', 'School & university', 'Hospital', 'Market', 'Place of worship', 'Park', 'Transport', 'Arts & culture', 'Civic', 'Hotel'];
let hitBoxes = [];
// "Lagos National Stadium" next to our "National Stadium" pin is the same place.
function nearPin(name, x, y) {
    const n = name.toLowerCase();
    return places.some(pl => Math.hypot(pl.x - x, pl.y - y) < 600 && (n.includes(pl.name.toLowerCase()) || pl.name.toLowerCase().includes(n)));
}
function drawLabels() {
    hitBoxes = [];
    if (!labelsVisible) return;
    const pal = night ? { text: '#f3ead6', halo: 'rgba(10,14,24,.85)' } : { text: '#2a2530', halo: 'rgba(255,251,233,.92)' };
    const boxes = [];
    const free = b => !boxes.some(o => b.x < o.x + o.w && b.x + b.w > o.x && b.y < o.y + o.h && b.y + b.h > o.y);
    // Pins claim their space first (estimated, so we never force a layout mid-frame).
    for (const place of places) {
        if ($('pin-' + place.id).hidden) continue;
        const s = screen(place.x, place.y), w = place.name.length * 7.6 + 16;
        boxes.push({ x: s.x - w / 2, y: s.y - 50, w, h: 52 });
    }
    const text = (label, sx, sy, font, opts = {}) => {
        ctx.font = font;
        const w = ctx.measureText(label).width + (opts.spacing ? label.length * opts.spacing : 0), h = parseFloat(font.match(/(\d+)px/)[1]);
        const box = { x: sx - w / 2 - 4, y: sy - h / 2 - 3, w: w + 8 + (opts.dot ? 12 : 0), h: h + 6 };
        if (box.x < 4 || box.x + box.w > width - 4 || box.y < 70 || box.y + box.h > height - 70 || !free(box)) return false;
        boxes.push(box);
        if (opts.letterSpacing !== undefined) ctx.letterSpacing = opts.letterSpacing;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.strokeStyle = pal.halo; ctx.lineWidth = opts.halo || 4; ctx.strokeText(label, sx + (opts.dot ? 6 : 0), sy);
        ctx.fillStyle = opts.color || pal.text; ctx.fillText(label, sx + (opts.dot ? 6 : 0), sy);
        if (opts.letterSpacing !== undefined) ctx.letterSpacing = '0px';
        if (opts.dot) {
            ctx.beginPath(); ctx.arc(sx - w / 2, sy, 4.5, 0, 6.283); ctx.fillStyle = opts.dot; ctx.fill();
            ctx.lineWidth = 1.5; ctx.strokeStyle = pal.halo; ctx.stroke();
        }
        if (opts.hit) hitBoxes.push({ ...box, ...opts.hit });
        return true;
    };
    const view = { x0: toWorld(0, 0).x, y0: toWorld(0, 0).y, x1: toWorld(width, height).x, y1: toWorld(width, height).y };
    const inView = (x, y) => x > view.x0 && x < view.x1 && y > view.y0 && y < view.y1;
    // Points of interest from the tiles in view, biggest first.
    if (p > .28) {
        const pois = [];
        for (const [, d] of labelData) for (const poi of d.pois) if (inView(poi[2], poi[3])) pois.push(poi);
        pois.sort((a, b) => (b[1] === 0) - (a[1] === 0) || b[4] - a[4]);
        let shown = 0;
        for (const [name, kind, x, y, rank] of pois) {
            if (shown > 70) break;
            if (pinnedNames.has(name.toLowerCase()) || nearPin(name, x, y)) continue;
            if (p < .7 && rank < 180 && kind !== 0) continue;
            if (p < 1.4 && rank < 60 && kind !== 0) continue;
            const s = screen(x, y);
            if (text(name, s.x, s.y, `${kind === 0 ? 15 : 13}px Lettering, sans-serif`, { dot: POI_COLORS[kind], hit: { name, kind, x, y } })) shown++;
        }
    }
    // Street names along the longest straight stretch of each road.
    if (p > .7) {
        const seen = new Map();
        const streets = [];
        for (const [, d] of labelData) for (const st of d.streets) if (inView(st[2], st[3])) streets.push(st);
        streets.sort((a, b) => a[1] - b[1] || b[5] - a[5]);
        for (const [name, cls, x, y, angle, len] of streets) {
            if (cls > 4 && p < 1.5) continue;
            const s = screen(x, y);
            const near = seen.get(name);
            if (near && near.some(o => Math.hypot(o.x - s.x, o.y - s.y) < 360)) continue;
            const size = cls <= 2 ? 13 : 12;
            ctx.font = `${size}px Lettering, sans-serif`;
            const w = ctx.measureText(name).width;
            if (len * p < w + 18) continue;
            let a = angle; if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
            const cos = Math.abs(Math.cos(a)), sin = Math.abs(Math.sin(a));
            const bw = w * cos + size * sin, bh = w * sin + size * cos;
            const box = { x: s.x - bw / 2, y: s.y - bh / 2, w: bw, h: bh };
            if (box.y < 70 || box.y + bh > height - 70 || box.x < 4 || box.x + bw > width - 4 || !free(box)) continue;
            boxes.push(box);
            ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
            ctx.strokeStyle = night ? 'rgba(10,14,24,.8)' : 'rgba(255,253,244,.9)'; ctx.lineWidth = 3.5; ctx.strokeText(name, 0, .5);
            ctx.fillStyle = night ? '#d9cfba' : '#5a4b3c'; ctx.fillText(name, 0, .5);
            ctx.restore();
            if (!near) seen.set(name, [s]); else near.push(s);
        }
    }
    // Neighbourhoods and districts from OpenStreetMap.
    for (const place of osmPlaces) {
        const major = ['city', 'town', 'suburb', 'island'].includes(place.kind);
        if (p > (major ? 1.2 : 2.2) || p < (major ? .03 : .12)) continue;
        if (pinnedNames.has(place.name.toLowerCase()) || !inView(place.x, place.y)) continue;
        const s = screen(place.x, place.y);
        if (major) text(place.name.toUpperCase(), s.x, s.y, `${p < .08 ? 12 : 14}px Lettering, sans-serif`, { letterSpacing: '1.5px', spacing: 1.5, halo: 4.5, hit: { name: place.name, kind: 'place', x: place.x, y: place.y } });
        else text(place.name, s.x, s.y, '13px Lettering, sans-serif', { color: night ? '#c9bfa8' : '#6b5d4c', hit: { name: place.name, kind: 'place', x: place.x, y: place.y } });
    }
}

// ---------- drawing ----------
function draw() {
    constrainCamera();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawBackdrop();
    ctx.save(); traceBoundary(); ctx.clip();
    ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = PALETTES[night ? 'night' : 'day'].land; ctx.fillRect(0, 0, width, height);
    drawRasterLevel(RASTER_LEVELS[0]);
    const need = p * ratio, fine = RASTER_LEVELS.find(l => l >= need) || RASTER_LEVELS[RASTER_LEVELS.length - 1];
    if (fine !== RASTER_LEVELS[0]) drawRasterLevel(fine);
    drawLive();
    ctx.restore();
    // A soft shadow and an inked line along the cut edge.
    traceBoundary();
    ctx.strokeStyle = 'rgba(20,30,20,.28)'; ctx.lineWidth = 7; ctx.stroke();
    ctx.strokeStyle = night ? '#05080e' : '#3b3a2c'; ctx.lineWidth = 1.6; ctx.stroke();

    const zoomedOut = p / BASE < .75;
    document.body.classList.toggle('map-overview', zoomedOut);
    for (const place of places) {
        const el = $('pin-' + place.id), s = screen(place.x, place.y);
        el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
        const important = ['marina', 'ikeja', 'national-stadium', 'lekki', 'airport', 'victoria-island', 'yaba', 'festac'].includes(place.id);
        el.hidden = !labelsVisible || (selected !== place.id && (p < .2 ? !important : p < .6 && place.icon === '▦' && !important)) ||
            s.x < 35 || s.x > width - 35 || s.y < 100 || s.y > height - 90 || (width < 750 && selected !== place.id && p < .5 && !important);
    }
    drawLabels();
    $('zoom-level').textContent = Math.round(p / BASE * 100) + '%';
    drawMinimap();
}

// ---------- layout ----------
function resize() {
    width = innerWidth; height = $('explorer').clientHeight;
    ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = width * ratio; canvas.height = height * ratio;
    p = clampP(p);
    requestDraw();
}
function fitEntireMap() {
    animateTo(COVERAGE.width / 2, COVERAGE.height / 2, Math.min(width / COVERAGE.width, height / COVERAGE.height) * .95);
}
function reset() { animateTo(cx, cy, BASE, 400); }

// ---------- places UI ----------
function showCard({ name, category, description, lat, lng }) {
    $('place-title').textContent = name; $('place-category').textContent = category; $('place-description').textContent = description;
    $('apple-maps').href = 'https://maps.apple.com/?ll=' + lat.toFixed(5) + ',' + lng.toFixed(5) + '&q=' + encodeURIComponent(name) + '&z=16';
    $('place-card').hidden = false; $('place-index').hidden = true; $('places-toggle').setAttribute('aria-expanded', 'false');
    $('results').hidden = true; $('search').value = '';
}
function selectPlace(id, focus = true, instant = false) {
    const place = places.find(x => x.id === id);
    if (!place) return;
    selected = id;
    showCard(place);
    document.querySelectorAll('[data-place]').forEach(el => el.classList.toggle('selected', el.dataset.place === id));
    if (focus) {
        const target = Math.max(p, place.icon === '▦' ? .6 : 1.4);
        if (instant) { animation = null; cx = place.x; cy = place.y; p = clampP(target); } else animateTo(place.x, place.y, target, 900);
    }
    history.replaceState(null, '', location.pathname + location.search + '#' + id);
    requestDraw();
}
function selectMapLabel(hit) {
    selected = null;
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    const g = unproject(hit.x, hit.y);
    showCard({ name: hit.name, lat: g.lat, lng: g.lng,
        category: hit.kind === 'place' ? 'Neighbourhood' : POI_NAMES[hit.kind],
        description: 'Mapped by the OpenStreetMap community. Open it in Apple Maps for directions and photos.' });
    history.replaceState(null, '', location.pathname + location.search);
}
for (const place of places) {
    const pin = document.createElement('button');
    pin.className = 'pin'; pin.id = 'pin-' + place.id; pin.dataset.place = place.id;
    pin.innerHTML = '<span class="dot" aria-hidden="true"></span><span class="pin-name">' + place.name + '</span>';
    pin.addEventListener('click', () => selectPlace(place.id));
    $('pins').append(pin);
}
for (const place of places) {
    const button = document.createElement('button');
    button.dataset.place = place.id;
    button.innerHTML = '<span class="mini" aria-hidden="true">' + place.icon + '</span><span>' + place.name + '</span>';
    button.addEventListener('click', () => selectPlace(place.id));
    $('destinations').append(button);
}

// ---------- controls ----------
$('zoom-in').onclick = () => zoomAt(1.6, undefined, undefined, true);
$('zoom-out').onclick = () => zoomAt(1 / 1.6, undefined, undefined, true);
$('reset').onclick = reset;
$('fit-map').onclick = fitEntireMap;
function setNight(value) {
    night = value;
    document.body.classList.toggle('night', night);
    $('day').classList.toggle('active', !night); $('night').classList.toggle('active', night);
    $('day').setAttribute('aria-pressed', String(!night)); $('night').setAttribute('aria-pressed', String(night));
    miniCache = null; requestDraw();
}
$('day').onclick = () => setNight(false);
$('night').onclick = () => setNight(true);
$('surprise').onclick = () => { const candidates = places.filter(x => x.id !== selected); selectPlace(candidates[Math.floor(Math.random() * candidates.length)].id); };
$('close-place').onclick = () => {
    selected = null; $('place-card').hidden = true;
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
    history.replaceState(null, '', location.pathname + location.search); requestDraw();
};
const about = $('about');
$('about-button').onclick = () => about.showModal();
$('close-about').onclick = () => about.close();
about.addEventListener('click', e => {
    if (e.target !== about) return;
    const r = about.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) about.close();
});
let osmPlaces = [];
function searchable() {
    return [...places.map(x => ({ name: x.name, detail: x.category, go: () => selectPlace(x.id) })),
        ...osmPlaces.filter(x => !pinnedNames.has(x.name.toLowerCase())).map(x => ({ name: x.name, detail: 'Neighbourhood', go: () => { selectMapLabel({ ...x, kind: 'place' }); animateTo(x.x, x.y, Math.max(p, .6), 900); } }))];
}
$('search').addEventListener('input', () => {
    const q = $('search').value.trim().toLowerCase();
    $('results').replaceChildren(); $('results').hidden = !q;
    if (!q) return;
    const found = searchable().filter(x => (x.name + ' ' + x.detail).toLowerCase().includes(q)).slice(0, 8);
    if (!found.length) { const empty = document.createElement('p'); empty.textContent = 'No places found. Try Marina, Yaba, or Lekki.'; $('results').append(empty); }
    for (const x of found) { const b = document.createElement('button'); b.textContent = x.name; b.onclick = x.go; $('results').append(b); }
});
$('search').addEventListener('keydown', e => {
    if (e.key === 'Escape') $('results').hidden = true;
    if (e.key === 'ArrowDown') { e.preventDefault(); $('results').querySelector('button')?.focus(); }
    if (e.key === 'Enter') $('results').querySelector('button')?.click();
});
let toastTimer;
function toast(message) { $('toast').textContent = message; $('toast').classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), 2500); }
function viewURL() {
    const url = new URL(location.href), g = unproject(cx, cy);
    url.searchParams.set('lat', g.lat.toFixed(5)); url.searchParams.set('lng', g.lng.toFixed(5)); url.searchParams.set('z', (p / BASE).toFixed(2));
    for (const old of ['x', 'y']) url.searchParams.delete(old);
    if (night) url.searchParams.set('night', '1'); else url.searchParams.delete('night');
    return url;
}
async function shareView() {
    const url = viewURL();
    history.replaceState(null, '', url);
    try { await navigator.clipboard.writeText(url.href); toast('View copied. Send someone your corner of Lagos!'); }
    catch { toast('Your view is saved in the address bar. Copy it to share.'); }
}
$('share').onclick = shareView; $('share-view').onclick = shareView;
$('places-toggle').onclick = () => {
    const opening = $('place-index').hidden;
    $('place-index').hidden = !opening; $('places-toggle').setAttribute('aria-expanded', String(opening));
    if (opening) $('place-card').hidden = true;
};
$('labels-toggle').onclick = () => {
    labelsVisible = !labelsVisible;
    $('labels-toggle').setAttribute('aria-pressed', String(labelsVisible));
    $('labels-toggle').textContent = labelsVisible ? 'Labels on' : 'Labels off';
    requestDraw();
};

// ---------- overview ----------
const minimap = $('minimap'), miniCtx = minimap.getContext('2d');
let miniCache = null;
function drawMinimap() {
    if (!miniCtx || minimap.hidden) return;
    const mw = minimap.width, mh = minimap.height, k = mw / COVERAGE.width;
    if (!miniCache) {
        const level = RASTER_LEVELS[0], span = RASTER_SIZE / level, mode = night ? 'night' : 'day';
        const c = document.createElement('canvas'); c.width = mw; c.height = mh;
        const g = c.getContext('2d');
        let complete = !!g;
        if (g) {
            g.fillStyle = PALETTES[mode].land; g.fillRect(0, 0, mw, mh);
            for (let ty = 0; ty < Math.ceil(COVERAGE.height / span); ty++)
                for (let tx = 0; tx < Math.ceil(COVERAGE.width / span); tx++) {
                    const img = raster(mode, level, tx, ty);
                    if (img) g.drawImage(img, tx * span * k, ty * span * k, span * k + .5, span * k + .5); else complete = false;
                }
        }
        if (complete) miniCache = c; else { miniCtx.drawImage(c, 0, 0); }
        if (!complete) return drawViewport(mw, mh, k);
    }
    miniCtx.drawImage(miniCache, 0, 0);
    drawViewport(mw, mh, k);
}
function drawViewport(mw, mh, k) {
    const a = toWorld(0, 0), b = toWorld(width, height);
    const x = Math.max(0, Math.min(mw, a.x * k)), y = Math.max(0, Math.min(mh, a.y * k));
    const w = Math.max(0, Math.min(mw, b.x * k) - x), h = Math.max(0, Math.min(mh, b.y * k) - y);
    miniCtx.fillStyle = '#17243288';
    miniCtx.fillRect(0, 0, mw, y); miniCtx.fillRect(0, y + h, mw, mh - y - h); miniCtx.fillRect(0, y, x, h); miniCtx.fillRect(x + w, y, mw - x - w, h);
    miniCtx.strokeStyle = '#202832'; miniCtx.lineWidth = 5; miniCtx.strokeRect(x, y, w, h);
    miniCtx.strokeStyle = '#fff5bd'; miniCtx.lineWidth = 2; miniCtx.strokeRect(x, y, w, h);
}
minimap.height = Math.round(minimap.width * COVERAGE.height / COVERAGE.width);
function navigateOverview(e) {
    const r = minimap.getBoundingClientRect();
    if (!r.width || !r.height) return;
    animation = null; velocity = null;
    cx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * COVERAGE.width;
    cy = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)) * COVERAGE.height;
    requestDraw();
}
let miniDragging = false;
minimap.addEventListener('pointerdown', e => { miniDragging = true; minimap.setPointerCapture?.(e.pointerId); navigateOverview(e); });
minimap.addEventListener('pointermove', e => { if (miniDragging) navigateOverview(e); });
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) minimap.addEventListener(event, () => { miniDragging = false; });
minimap.addEventListener('keydown', e => {
    const moves = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (!moves[e.key]) return;
    e.preventDefault(); cx += moves[e.key][0] * 160 / p; cy += moves[e.key][1] * 160 / p; requestDraw();
});
$('mini-toggle').onclick = () => {
    minimap.hidden = !minimap.hidden;
    $('mini-toggle').setAttribute('aria-expanded', String(!minimap.hidden));
    $('mini-toggle').querySelector('span').textContent = minimap.hidden ? '+' : '−';
    requestDraw();
};

// ---------- direct manipulation ----------
// Drag pans 1:1 and keeps its momentum on release; wheel and pinch zoom around the pointer.
const pointers = new Map();
let lastPinch = 0, moved = 0, track = [];
canvas.addEventListener('pointerdown', e => {
    canvas.setPointerCapture?.(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    lastPinch = 0; moved = 0; animation = null; velocity = null; track = [{ x: e.clientX, y: e.clientY, t: performance.now() }];
    canvas.classList.add('dragging');
});
canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    const old = pointers.get(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
        const [a, b] = [...pointers.values()], distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (lastPinch) zoomAt(distance / lastPinch, (a.x + b.x) / 2, (a.y + b.y) / 2);
        lastPinch = distance; moved += 10; track = [];
        return;
    }
    const dx = e.clientX - old.x, dy = e.clientY - old.y;
    moved += Math.abs(dx) + Math.abs(dy);
    cx -= dx / p; cy -= dy / p;
    const now = performance.now();
    track.push({ x: e.clientX, y: e.clientY, t: now });
    while (track.length > 2 && now - track[0].t > 90) track.shift();
    requestDraw();
});
function endPointer(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId); lastPinch = 0;
    if (pointers.size) return;
    canvas.classList.remove('dragging');
    const now = performance.now();
    if (track.length > 1 && now - track[track.length - 1].t < 60) {
        const first = track[0], last = track[track.length - 1], dt = Math.max(16, last.t - first.t);
        const vx = (last.x - first.x) / dt, vy = (last.y - first.y) / dt;
        if (Math.hypot(vx, vy) > .08) { velocity = { x: vx, y: vy, time: now }; requestDraw(); }
    }
    if (moved < 6 && e.type === 'pointerup') {
        const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
        const hit = hitBoxes.find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
        if (hit) selectMapLabel(hit);
    }
}
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, endPointer);
canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? 800 : 1;
    const speed = e.ctrlKey ? .012 : .0022;
    zoomAt(Math.exp(-e.deltaY * unit * speed), e.clientX, e.clientY);
}, { passive: false });
canvas.addEventListener('dblclick', e => zoomAt(e.shiftKey ? .5 : 2, e.clientX, e.clientY, true));
canvas.addEventListener('mousemove', e => {
    if (pointers.size) return;
    const hit = hitBoxes.some(b => e.offsetX >= b.x && e.offsetX <= b.x + b.w && e.offsetY >= b.y && e.offsetY <= b.y + b.h);
    canvas.classList.toggle('over-label', hit);
});
document.addEventListener('keydown', e => {
    if (about.open) return;
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); $('search').focus(); }
    if (document.activeElement !== canvas) return;
    const step = 120 / p;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '=', '-', '0'].includes(e.key)) e.preventDefault();
    if (e.key === 'ArrowUp') animateTo(cx, cy - step, p, 200);
    if (e.key === 'ArrowDown') animateTo(cx, cy + step, p, 200);
    if (e.key === 'ArrowLeft') animateTo(cx - step, cy, p, 200);
    if (e.key === 'ArrowRight') animateTo(cx + step, cy, p, 200);
    if (e.key === '+' || e.key === '=') zoomAt(1.5, undefined, undefined, true);
    if (e.key === '-') zoomAt(1 / 1.5, undefined, undefined, true);
    if (e.key === '0') reset();
});
window.addEventListener('resize', resize);
window.addEventListener('hashchange', () => { if (location.hash) selectPlace(location.hash.slice(1)); });

// ---------- start ----------
let started = false;
function mapReady() { if (!started) { started = true; $('art-status').hidden = true; } }
resize();
// Start with the whole city; a place or a shared view takes over below.
p = clampP(Math.min(width / COVERAGE.width, height / COVERAGE.height) * .95);
const query = new URLSearchParams(location.search);
const lat = Number(query.get('lat')), lng = Number(query.get('lng')), z = Number(query.get('z'));
if (query.has('lat') && query.has('lng') && query.has('z') && [lat, lng, z].every(Number.isFinite)) {
    const s = project(lng, lat); cx = s.x; cy = s.y; p = clampP(BASE * z);
}
if (location.hash) selectPlace(location.hash.slice(1), !query.has('z'), true);
if (query.get('night') === '1') setNight(true);
draw();
document.fonts?.load('13px Lettering').then(requestDraw, () => {});
fetch(`${MAP}/meta.json`).then(res => res.json()).then(meta => {
    osmPlaces = meta.places;
    startWorkers(meta.tiles);
    requestDraw();
}).catch(() => $('art-status').textContent = 'The map could not load. Reload to try again.');
