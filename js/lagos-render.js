// Draws Tiny Lagos from the binary OpenStreetMap tiles built by scripts/lagos-map/build-data.mjs.
// All drawing happens in world metres; the caller sets up the pixel scale.
import { TILE, UNIT, AREA, ROAD, WATERLINE } from './lagos-map-schema.js';

// ---------- parsing ----------
const AREA_ORDER = [AREA.residential, AREA.commercial, AREA.industrial, AREA.bare, AREA.campus, AREA.cemetery, AREA.market, AREA.apron, AREA.grass,
    AREA.golf, AREA.scrub, AREA.park, AREA.wood, AREA.wetland, AREA.sand, AREA.sports, AREA.parking, AREA.plaza, AREA.water, AREA.sea,
    AREA.pitch, AREA.track, AREA.pier, AREA.runway];
const order = []; AREA_ORDER.forEach((k, i) => { order[k] = i; });

export function parseTile(buffer, c, r) {
    const jsonLength = new DataView(buffer).getUint32(0, true);
    const names = ['', ...JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 4, jsonLength)))];
    const offset = 4 + jsonLength + (jsonLength % 2);
    const d = new Int16Array(buffer, offset, (buffer.byteLength - offset) >> 1);
    const ox = c * TILE, oy = r * TILE;
    let i = 0;
    const points = n => {
        const a = new Float32Array(n * 2);
        for (let k = 0; k < n; k++) { a[2 * k] = ox + d[i++] * UNIT; a[2 * k + 1] = oy + d[i++] * UNIT; }
        return a;
    };
    const areas = [];
    for (let n = d[i++]; n > 0; n--) {
        const kind = d[i++], rings = [];
        for (let k = d[i++]; k > 0; k--) rings.push(points(d[i++]));
        areas.push({ kind, rings });
    }
    areas.sort((a, b) => order[a.kind] - order[b.kind]);
    const lines = [];
    for (let n = d[i++]; n > 0; n--) { const count = d[i++], kind = d[i++]; lines.push({ kind, pts: points(count) }); }
    const roads = [];
    for (let n = d[i++]; n > 0; n--) { const count = d[i++], cls = d[i++], flags = d[i++], name = names[d[i++]]; roads.push({ cls, flags, name, pts: points(count) }); }
    const buildings = [];
    for (let n = d[i++], index = 0; n > 0; n--, index++) {
        const count = d[i++], roof = d[i++], h = d[i++] / 2, pts = points(count);
        let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
        for (let k = 0; k < pts.length; k += 2) {
            const x = pts[k], y = pts[k + 1];
            if (y > maxY) maxY = y; if (y < minY) minY = y; if (x < minX) minX = x; if (x > maxX) maxX = x;
        }
        buildings.push({ pts, roof, h, y: maxY, top: minY, x0: minX, x1: maxX, seed: hash(c * 7919 + r * 104729 + index * 31) });
    }
    const pois = [];
    for (let n = d[i++]; n > 0; n--) { const x = ox + d[i++] * UNIT, y = oy + d[i++] * UNIT, kind = d[i++], name = names[d[i++]], rank = d[i++]; pois.push({ x, y, kind, name, rank }); }
    return { c, r, x0: ox, y0: oy, names, areas, lines, roads, buildings, pois };
}

export function hash(n) {
    let x = n | 0;
    x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

// ---------- palettes ----------
export const PALETTES = {
    day: {
        land: '#eadfc4', ink: 'rgba(58,44,40,.72)', inkSoft: 'rgba(58,44,40,.35)',
        area: {
            [AREA.residential]: '#e9dabd', [AREA.commercial]: '#efd6c3', [AREA.industrial]: '#ddd5ca', [AREA.bare]: '#e3cf9f', [AREA.campus]: '#eedfc0',
            [AREA.cemetery]: '#c9d9ae', [AREA.park]: '#a6cf7e', [AREA.grass]: '#b7d68a', [AREA.golf]: '#a9d483', [AREA.scrub]: '#9cc174', [AREA.wood]: '#7fb366',
            [AREA.wetland]: '#a3caa0', [AREA.sand]: '#f2dda2', [AREA.apron]: '#d5d2cb', [AREA.water]: '#66c1cf', [AREA.sea]: '#58b4c9', [AREA.sports]: '#d9dcc0',
            [AREA.pitch]: '#76b957', [AREA.track]: '#d06d50', [AREA.parking]: '#dad5ca', [AREA.market]: '#f1c88f', [AREA.plaza]: '#efe5d1', [AREA.pier]: '#c8b393',
            [AREA.runway]: '#5f646b',
        },
        shore: '#3f98ab', shoreLight: 'rgba(255,255,255,.55)', wave: 'rgba(255,255,255,.28)',
        roadCasing: '#7b6c5b', railCasing: '#6f6a66',
        road: { [ROAD.motorway]: '#f6bf58', [ROAD.trunk]: '#f8cb6c', [ROAD.primary]: '#fbdc93', [ROAD.secondary]: '#fff0c0', [ROAD.tertiary]: '#fff8ea',
            [ROAD.street]: '#fffcf4', [ROAD.service]: '#f6f0e4', [ROAD.path]: '#c9b28c', [ROAD.rail]: '#8d8782', [ROAD.runway]: '#5c6168', [ROAD.taxiway]: '#7b7f85' },
        roofs: ['#b9583d', '#cf7c53', '#4e80ae', '#4c9893', '#aab0b1', '#ebdfc4', '#8e5d40', '#c4493e', '#f4efe4'],
        wallSouth: '#efe2c6', wallEast: '#cbb99a', wallWest: '#dccdae', windows: 'rgba(52,62,80,.55)',
        tree: ['#5f9e4f', '#6fae55', '#4f8f48', '#7cb85e'], treeShade: 'rgba(30,70,40,.35)', treeLight: 'rgba(240,255,190,.35)',
        shadow: 'rgba(60,40,30,.18)', bus: '#f6c52e', cars: ['#f4f1ea', '#d9443a', '#3e6ea8', '#2c2f36', '#9aa3a9'],
        forest: 'none',
    },
    night: {
        land: '#141b2a', ink: 'rgba(4,7,14,.85)', inkSoft: 'rgba(4,7,14,.5)',
        area: {
            [AREA.residential]: '#161e2e', [AREA.commercial]: '#1b1f31', [AREA.industrial]: '#181d29', [AREA.bare]: '#1c1f28', [AREA.campus]: '#171f2e',
            [AREA.cemetery]: '#132219', [AREA.park]: '#13291e', [AREA.grass]: '#152a20', [AREA.golf]: '#142b1f', [AREA.scrub]: '#13261c', [AREA.wood]: '#0f2318',
            [AREA.wetland]: '#11261f', [AREA.sand]: '#2a2a2c', [AREA.apron]: '#1b1f27', [AREA.water]: '#0b2a40', [AREA.sea]: '#081f35', [AREA.sports]: '#182030',
            [AREA.pitch]: '#1f4a2a', [AREA.track]: '#4a2a2a', [AREA.parking]: '#1a1e28', [AREA.market]: '#2a2230', [AREA.plaza]: '#1c2232', [AREA.pier]: '#25232a',
            [AREA.runway]: '#0d1018',
        },
        shore: '#1d6b86', shoreLight: 'rgba(120,220,255,.35)', wave: 'rgba(120,200,255,.12)',
        roadCasing: '#05080e', railCasing: '#05080e',
        road: { [ROAD.motorway]: '#e9a443', [ROAD.trunk]: '#e29a40', [ROAD.primary]: '#e8994a', [ROAD.secondary]: '#b98552', [ROAD.tertiary]: '#5d5765',
            [ROAD.street]: '#373d50', [ROAD.service]: '#2a3042', [ROAD.path]: '#2a2f3e', [ROAD.rail]: '#3a3f4e', [ROAD.runway]: '#11141c', [ROAD.taxiway]: '#1a1e28' },
        roofs: ['#3b3140', '#46374a', '#2a3a57', '#2a4549', '#3b4352', '#4a4d5d', '#342e33', '#4b2f3a', '#575b6b'],
        wallSouth: '#20283a', wallEast: '#121826', wallWest: '#181f2e', windows: '#ffd27a',
        tree: ['#123222', '#15392a', '#0f2b1e', '#183d2b'], treeShade: 'rgba(0,0,0,.4)', treeLight: 'rgba(120,200,160,.10)',
        shadow: 'rgba(0,0,0,.25)', bus: '#f6c52e', cars: ['#f4f1ea', '#d9443a', '#3e6ea8', '#2c2f36', '#9aa3a9'],
        glow: 'rgba(255,170,70,.09)', lamp: 'rgba(255,196,110,.9)', edge: 'rgba(95,227,255,.85)',
        forest: 'night',
    },
};

const ROAD_WIDTH = { [ROAD.motorway]: 24, [ROAD.trunk]: 20, [ROAD.primary]: 15, [ROAD.secondary]: 12, [ROAD.tertiary]: 9.5, [ROAD.street]: 7, [ROAD.service]: 4.5,
    [ROAD.path]: 2, [ROAD.rail]: 3.5, [ROAD.runway]: 45, [ROAD.taxiway]: 20 };
// The narrowest a road may get on screen, so the network still reads when zoomed out.
const ROAD_MIN_PX = { [ROAD.motorway]: 2.6, [ROAD.trunk]: 2.2, [ROAD.primary]: 1.8, [ROAD.secondary]: 1.3, [ROAD.tertiary]: 1, [ROAD.street]: .55, [ROAD.service]: .3,
    [ROAD.path]: 0, [ROAD.rail]: 1, [ROAD.runway]: 2, [ROAD.taxiway]: .8 };
const ROAD_DRAW_ORDER = [ROAD.path, ROAD.service, ROAD.street, ROAD.tertiary, ROAD.secondary, ROAD.primary, ROAD.trunk, ROAD.motorway, ROAD.taxiway, ROAD.runway];
// Buildings are extruded up and slightly left: an oblique, tiny.london-like view that keeps north up.
export const EXTRUDE = { x: -0.24, y: -0.95 };

// ---------- helpers ----------
function pathRing(ctx, pts, dx = 0, dy = 0) {
    ctx.moveTo(pts[0] + dx, pts[1] + dy);
    for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k] + dx, pts[k + 1] + dy);
    ctx.closePath();
}
function pathLine(ctx, pts) {
    ctx.moveTo(pts[0], pts[1]);
    for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
}
const PATTERNS = new Map();
function wavePattern(ctx, color) {
    if (PATTERNS.has(color)) return PATTERNS.get(color);
    if (typeof OffscreenCanvas === 'undefined' && typeof document === 'undefined') return null;
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(96, 96) : Object.assign(document.createElement('canvas'), { width: 96, height: 96 });
    const g = c.getContext('2d');
    g.strokeStyle = color; g.lineWidth = 2; g.lineCap = 'round';
    for (const [x, y] of [[10, 18], [56, 40], [22, 70], [70, 84]]) { g.beginPath(); g.arc(x, y + 8, 9, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); }
    const pattern = ctx.createPattern(c, 'repeat');
    PATTERNS.set(color, pattern);
    return pattern;
}

// Trees are scattered on a jittered grid. Each tile's areas are rasterised once into a small
// lookup so we know whether a spot is parkland, water, or ordinary city.
const TREE_SPACING = 13;
const TREE_CHANCE = { [AREA.wood]: .95, [AREA.park]: .55, [AREA.golf]: .18, [AREA.scrub]: .5, [AREA.wetland]: .35, [AREA.grass]: .22, [AREA.cemetery]: .3,
    [AREA.campus]: .3, [AREA.residential]: .3, [AREA.commercial]: .14, [AREA.industrial]: .06, [AREA.bare]: .12 };
const BUILT = 24; // lookup code for building footprints (not an AREA kind)
const NO_TREES = new Set([AREA.water, AREA.sea, AREA.sand, AREA.apron, AREA.runway, AREA.pitch, AREA.track, AREA.parking, AREA.plaza, AREA.pier, AREA.market, AREA.sports]);
function treesFor(tile) {
    if (tile.trees) return tile.trees;
    // 256 px over a kilometre: four metres a pixel, fine enough to keep trees out of buildings.
    const size = 256, scale = size / TILE;
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(size, size) : Object.assign(document.createElement('canvas'), { width: size, height: size });
    const g = c.getContext('2d', { willReadFrequently: true });
    g.fillStyle = 'rgb(250,0,0)'; g.fillRect(0, 0, size, size);
    g.setTransform(scale, 0, 0, scale, -tile.x0 * scale, -tile.y0 * scale);
    for (const a of tile.areas) {
        g.fillStyle = `rgb(${a.kind * 10},0,0)`;
        g.beginPath(); for (const ring of a.rings) pathRing(g, ring); g.fill('evenodd');
    }
    // Buildings, padded a little, are no place for a tree.
    g.fillStyle = g.strokeStyle = `rgb(${BUILT * 10},0,0)`; g.lineWidth = 5; g.lineJoin = 'round';
    g.beginPath(); for (const b of tile.buildings) pathRing(g, b.pts); g.fill(); g.stroke();
    const px = g.getImageData(0, 0, size, size).data, trees = [];
    for (let y = TREE_SPACING / 2; y < TILE; y += TREE_SPACING) {
        for (let x = TREE_SPACING / 2; x < TILE; x += TREE_SPACING) {
            const s = hash((tile.c * 4096 + x) * 92821 + (tile.r * 4096 + y) * 31);
            const tx = x + (hash(s * 1e9) - .5) * TREE_SPACING * .9, ty = y + (hash(s * 7e8 + 3) - .5) * TREE_SPACING * .9;
            const v = px[(Math.min(size - 1, Math.floor(ty * scale)) * size + Math.min(size - 1, Math.floor(tx * scale))) * 4];
            const kind = v === 250 ? -1 : v % 10 === 0 ? v / 10 : null;
            if (kind === null || kind === BUILT || NO_TREES.has(kind)) continue;
            if (s > (TREE_CHANCE[kind] ?? .22)) continue;
            trees.push(tile.x0 + tx, tile.y0 + ty, 2.6 + hash(s * 3e7) * (kind === AREA.wood ? 4.5 : 3.6), Math.floor(hash(s * 5e6) * 4));
        }
    }
    tile.trees = new Float32Array(trees);
    return tile.trees;
}

// ---------- drawing ----------
/**
 * region: { x0, y0, x1, y1 } in metres; p: pixels per metre (already applied to ctx).
 * tiles: parsed tiles overlapping the region (plus a row below for tall buildings).
 */
export function renderRegion(ctx, region, tiles, p, mode = 'day') {
    const pal = PALETTES[mode];
    const night = mode === 'night';
    const px = 1 / p; // one screen pixel, in metres
    ctx.fillStyle = pal.land;
    ctx.fillRect(region.x0, region.y0, region.x1 - region.x0, region.y1 - region.y0);
    const visible = t => t.x0 < region.x1 && t.x0 + TILE > region.x0 && t.y0 < region.y1 && t.y0 + TILE > region.y0;
    const ground = tiles.filter(visible);
    const seam = px * 1.2;
    const clipTo = (t, fn) => { ctx.save(); ctx.beginPath(); ctx.rect(t.x0 - seam, t.y0 - seam, TILE + seam * 2, TILE + seam * 2); ctx.clip(); fn(); ctx.restore(); };

    // Areas: land use, parks, water, sports grounds.
    for (const t of ground) clipTo(t, () => {
        for (const a of t.areas) {
            ctx.beginPath(); for (const ring of a.rings) pathRing(ctx, ring);
            ctx.fillStyle = pal.area[a.kind]; ctx.fill('evenodd');
            if (a.kind === AREA.water || a.kind === AREA.sea) {
                if (p > .12) { const pat = wavePattern(ctx, pal.wave); if (pat) { ctx.fillStyle = pat; ctx.fill('evenodd'); } }
                ctx.lineJoin = 'round';
                ctx.strokeStyle = pal.shoreLight; ctx.lineWidth = Math.max(1.4 * px, 3.5); ctx.stroke();
                ctx.strokeStyle = pal.shore; ctx.lineWidth = Math.max(.9 * px, 1.1); ctx.stroke();
            } else if (a.kind === AREA.pitch && p > .35) {
                drawPitch(ctx, a.rings[0], px);
            } else if (a.kind === AREA.track && p > .35) {
                ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(.6, px * .8); ctx.stroke();
            } else if (p > .5 && (a.kind === AREA.park || a.kind === AREA.wood || a.kind === AREA.sports || a.kind === AREA.campus)) {
                ctx.strokeStyle = pal.inkSoft; ctx.lineWidth = px * .8; ctx.stroke();
            }
        }
        for (const l of t.lines) {
            ctx.beginPath(); pathLine(ctx, l.pts);
            ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            ctx.strokeStyle = pal.area[AREA.water];
            ctx.lineWidth = Math.max([22, 12, 4, 3][l.kind], [1.6, 1.2, .7, .5][l.kind] * px);
            ctx.stroke();
        }
    });

    // Trees, under roads and buildings so they peek out of yards and verges.
    if (p > .09) {
        for (const t of ground) {
            const trees = treesFor(t);
            ctx.save(); ctx.beginPath(); ctx.rect(t.x0, t.y0, TILE, TILE); ctx.clip();
            // Canvas circles lose precision tens of kilometres from the origin, so draw each
            // tile's trees relative to its corner.
            ctx.translate(t.x0, t.y0);
            const detail = p > .7;
            for (let k = 0; k < trees.length; k += 4) {
                const wx = trees[k], wy = trees[k + 1], rad = trees[k + 2];
                if (wx + rad < region.x0 || wx - rad > region.x1 || wy + rad < region.y0 || wy - rad > region.y1) continue;
                const x = wx - t.x0, y = wy - t.y0;
                if (detail) { ctx.fillStyle = pal.treeShade; ctx.beginPath(); ctx.arc(x + rad * .35, y + rad * .35, rad, 0, 6.283); ctx.fill(); }
                ctx.fillStyle = pal.tree[trees[k + 3]];
                ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283); ctx.fill();
                if (detail) {
                    ctx.strokeStyle = pal.inkSoft; ctx.lineWidth = px * .9; ctx.stroke();
                    ctx.fillStyle = pal.treeLight; ctx.beginPath(); ctx.arc(x - rad * .3, y - rad * .3, rad * .45, 0, 6.283); ctx.fill();
                }
            }
            ctx.restore();
        }
    }

    // Roads: all casings, then all fills, minor roads first; bridges on top with a shadow.
    const widthOf = cls => Math.max(ROAD_WIDTH[cls], ROAD_MIN_PX[cls] * px);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const bridges of [false, true]) {
        for (const pass of ['shadow', 'casing', 'fill']) {
            if (pass === 'shadow' && !bridges) continue;
            for (const cls of ROAD_DRAW_ORDER) {
                if (ROAD_MIN_PX[cls] === 0 && p < .9) continue;
                if (cls === ROAD.service && p < .25) continue;
                for (const t of ground) clipTo(t, () => {
                    ctx.beginPath(); let any = false;
                    for (const r of t.roads) if (r.cls === cls && !!(r.flags & 1) === bridges && !(r.flags & 2 && p < .5)) { pathLine(ctx, r.pts); any = true; }
                    if (!any) return;
                    const w = widthOf(cls);
                    if (pass === 'shadow') { ctx.save(); ctx.translate(w * .35, w * .45); ctx.strokeStyle = 'rgba(20,30,40,.28)'; ctx.lineWidth = w * 1.25; ctx.stroke(); ctx.restore(); return; }
                    if (pass === 'casing') {
                        if (cls === ROAD.path) return;
                        ctx.strokeStyle = cls === ROAD.rail ? pal.railCasing : pal.roadCasing;
                        ctx.lineWidth = w + Math.max(px * (p > .4 ? 1.6 : 1), w * .14);
                        ctx.stroke(); return;
                    }
                    ctx.strokeStyle = pal.road[cls]; ctx.lineWidth = w;
                    if (cls === ROAD.path) { ctx.setLineDash([2.5, 2]); ctx.lineWidth = Math.max(1.2, px); }
                    ctx.stroke(); ctx.setLineDash([]);
                    if (cls === ROAD.rail && p > .5) { ctx.setLineDash([.6, 2.4]); ctx.strokeStyle = pal.roadCasing; ctx.lineWidth = w * 1.6; ctx.stroke(); ctx.setLineDash([]); }
                    if ((cls === ROAD.runway || cls === ROAD.taxiway) && p > .15) {
                        ctx.setLineDash(cls === ROAD.runway ? [20, 18] : []); ctx.strokeStyle = cls === ROAD.runway ? '#f4f1e8' : '#e8c445';
                        ctx.lineWidth = Math.max(px * .8, cls === ROAD.runway ? 1.2 : .6); ctx.stroke(); ctx.setLineDash([]);
                    }
                    if (night && cls <= ROAD.secondary) {
                        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = pal.glow; ctx.lineWidth = w * 3.2; ctx.stroke(); ctx.restore();
                    }
                    if (!night && cls <= ROAD.primary && p > .8) { ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = .35; ctx.stroke(); ctx.setLineDash([]); }
                });
            }
        }
    }
    if (p > .55) for (const t of ground) clipTo(t, () => drawTraffic(ctx, t, pal, p));
    if (night && p > .3) for (const t of ground) clipTo(t, () => drawLamps(ctx, t, pal, p));

    // Buildings, back to front, from every tile whose buildings could reach into the region.
    const reach = 400;
    const list = [];
    for (const t of tiles) {
        if (!(t.x0 < region.x1 + reach && t.x0 + TILE > region.x0 - reach && t.y0 < region.y1 + reach && t.y0 + TILE > region.y0 - reach)) continue;
        for (const b of t.buildings) {
            // Skip buildings wholly above the region, or whose raised roof still starts below it.
            if (b.y < region.y0 || b.top + b.h * EXTRUDE.y > region.y1) continue;
            // The roof leans left by h × EXTRUDE.x, so the building spans x0 + that lean to x1.
            if (b.x1 < region.x0 || b.x0 + b.h * EXTRUDE.x > region.x1) continue;
            list.push(b);
        }
    }
    list.sort((a, b) => a.y - b.y);
    drawBuildings(ctx, list, pal, p, night);
}

function drawPitch(ctx, ring, px) {
    // Find the long axis from the longest edge, then draw centre line and circle.
    let best = 0, ax = 1, ay = 0, cx = 0, cy = 0;
    const n = ring.length / 2;
    for (let k = 0; k < n; k++) {
        const x = ring[2 * k], y = ring[2 * k + 1], nx = ring[(2 * k + 2) % ring.length], ny = ring[(2 * k + 3) % ring.length];
        cx += x / n; cy += y / n;
        const l = Math.hypot(nx - x, ny - y); if (l > best) { best = l; ax = (nx - x) / l; ay = (ny - y) / l; }
    }
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(.25, px * .6);
    ctx.stroke();
    if (best > 40) {
        let half = 0;
        for (let k = 0; k < n; k++) half = Math.max(half, Math.abs((ring[2 * k] - cx) * -ay + (ring[2 * k + 1] - cy) * ax));
        ctx.beginPath(); ctx.moveTo(cx + ay * half, cy - ax * half); ctx.lineTo(cx - ay * half, cy + ax * half); ctx.stroke();
        ctx.save(); ctx.translate(cx, cy); ctx.beginPath(); ctx.arc(0, 0, Math.min(9.15, half * .4), 0, 6.283); ctx.restore(); ctx.stroke();
    }
    ctx.restore();
}

function drawTraffic(ctx, t, pal, p) {
    for (let i = 0; i < t.roads.length; i++) {
        const r = t.roads[i];
        if (r.cls > ROAD.street || r.flags & 2) continue;
        const busy = r.cls <= ROAD.secondary;
        if (!busy && p < 1.1) continue;
        const spacing = busy ? 34 : 70, pts = r.pts;
        let carry = hash(i * 97 + t.c * 13 + t.r) * spacing;
        for (let k = 2; k < pts.length; k += 2) {
            const x0 = pts[k - 2], y0 = pts[k - 1], dx = pts[k] - x0, dy = pts[k + 1] - y0, len = Math.hypot(dx, dy);
            if (!len) continue;
            const ux = dx / len, uy = dy / len, lane = ROAD_WIDTH[r.cls] * .22;
            for (let s = carry; s < len; s += spacing) {
                const h = hash(Math.floor(x0 * 10 + s * 7) * 31 + i);
                if (h > (busy ? .7 : .35)) continue;
                const side = h > .35 ? 1 : -1, bus = busy && h < .32;
                const L = bus ? 8.5 : 4.4, Wd = bus ? 2.5 : 1.9;
                const cx = x0 + ux * s - uy * lane * side, cy = y0 + uy * s + ux * lane * side;
                ctx.save(); ctx.translate(cx, cy); ctx.transform(ux, uy, -uy, ux, 0, 0);
                ctx.fillStyle = 'rgba(20,20,30,.25)'; ctx.fillRect(-L / 2 + .4, -Wd / 2 + .5, L, Wd);
                ctx.fillStyle = bus ? pal.bus : pal.cars[Math.floor(h * 97) % pal.cars.length];
                ctx.fillRect(-L / 2, -Wd / 2, L, Wd);
                if (bus) { ctx.fillStyle = '#2b2b30'; ctx.fillRect(-L / 2, -.25, L, .5); }
                ctx.lineWidth = .25; ctx.strokeStyle = 'rgba(30,25,30,.7)'; ctx.strokeRect(-L / 2, -Wd / 2, L, Wd);
                if (pal.lamp) { ctx.fillStyle = '#fff3c4'; ctx.fillRect(side > 0 ? L / 2 - .5 : -L / 2, -Wd / 2, .5, Wd); }
                ctx.restore();
            }
            carry = ((carry - len) % spacing + spacing) % spacing;
        }
    }
}

let glow = null;
function lampGlow(ctx) {
    if (glow && glow.ctx === ctx) return glow.gradient;
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 9);
    gradient.addColorStop(0, 'rgba(255,190,100,.42)'); gradient.addColorStop(1, 'rgba(255,190,100,0)');
    glow = { ctx, gradient };
    return gradient;
}
function drawLamps(ctx, t, pal, p) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const r of t.roads) {
        if (r.cls > (p > .9 ? ROAD.street : ROAD.tertiary) || r.flags & 2) continue;
        const spacing = r.cls <= ROAD.primary ? 30 : r.cls === ROAD.street ? 58 : 45, pts = r.pts, off = ROAD_WIDTH[r.cls] * .55;
        let carry = 0;
        for (let k = 2; k < pts.length; k += 2) {
            const x0 = pts[k - 2], y0 = pts[k - 1], dx = pts[k] - x0, dy = pts[k + 1] - y0, len = Math.hypot(dx, dy);
            if (!len) continue;
            const ux = dx / len, uy = dy / len;
            for (let s = carry; s < len; s += spacing) {
                const x = x0 + ux * s - uy * off, y = y0 + uy * s + ux * off;
                ctx.save(); ctx.translate(x, y);
                ctx.fillStyle = lampGlow(ctx); ctx.fillRect(-9, -9, 18, 18);
                if (p > 1) { ctx.fillStyle = pal.lamp; ctx.fillRect(-.45, -.45, .9, .9); }
                ctx.restore();
            }
            carry = ((carry - len) % spacing + spacing) % spacing;
        }
    }
    ctx.restore();
}

function drawBuildings(ctx, list, pal, p, night) {
    const px = 1 / p, simple = p < .3, outline = p > .45, windows = p > (night ? .55 : 1.4);
    if (!simple) {
        ctx.fillStyle = pal.shadow; ctx.beginPath();
        for (const b of list) pathRing(ctx, b.pts, b.h * .32, b.h * .12);
        ctx.fill();
    }
    ctx.lineJoin = 'round';
    for (const b of list) {
        const pts = b.pts, n = pts.length / 2, ex = b.h * EXTRUDE.x, ey = b.h * EXTRUDE.y;
        if (b.roof === 9) { drawStadium(ctx, b, pal, p); continue; }
        const roofColor = pal.roofs[b.roof];
        if (simple) {
            ctx.fillStyle = roofColor; ctx.beginPath(); pathRing(ctx, pts, ex, ey); ctx.fill();
            // From far away at night, lit windows read as a scatter of warm sparks.
            if (night && b.seed < .38) { const size = Math.max(2.5, px * 1.1); ctx.fillStyle = pal.windows; ctx.fillRect(pts[0] + ex, pts[1] + ey, size, size); }
            continue;
        }
        // Signed area tells us which way the ring winds, so we know which walls face the viewer.
        let s = 0; for (let k = 0; k < n; k++) { const j = (k + 1) % n; s += pts[2 * k] * pts[2 * j + 1] - pts[2 * j] * pts[2 * k + 1]; }
        const dir = s > 0 ? 1 : -1;
        for (let k = 0; k < n; k++) {
            const j = (k + 1) % n, ax = pts[2 * k], ay = pts[2 * k + 1], bx = pts[2 * j], by = pts[2 * j + 1];
            // Outward normal for this edge; walls facing down or right are visible.
            const nx = (by - ay) * dir, ny = -(bx - ax) * dir;
            const facing = -(nx * EXTRUDE.x + ny * EXTRUDE.y);
            if (facing <= 0) continue;
            const len = Math.hypot(nx, ny) || 1;
            const shade = nx / len > .45 ? pal.wallEast : nx / len < -.45 ? pal.wallWest : pal.wallSouth;
            ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx + ex, by + ey); ctx.lineTo(ax + ex, ay + ey); ctx.closePath();
            ctx.fillStyle = shade; ctx.fill();
            if (outline) { ctx.strokeStyle = pal.ink; ctx.lineWidth = px * .7; ctx.stroke(); }
            if (windows && b.h > 4) drawWindows(ctx, ax, ay, bx, by, b, pal, night);
        }
        ctx.beginPath(); pathRing(ctx, pts, ex, ey);
        ctx.fillStyle = roofColor; ctx.fill();
        if (outline) { ctx.strokeStyle = pal.ink; ctx.lineWidth = px * .8; ctx.stroke(); }
        if (p > 1.3) drawRoofDetail(ctx, b, ex, ey, pal, px);
        if (night && b.h > 22 && p > .35) { ctx.strokeStyle = pal.edge; ctx.lineWidth = Math.max(.5, px * 1.2); ctx.stroke(); }
    }
}

function drawWindows(ctx, ax, ay, bx, by, b, pal, night) {
    const len = Math.hypot(bx - ax, by - ay), floors = Math.floor((b.h - 1) / 3.2), cols = Math.floor(len / 3.2);
    if (!floors || !cols) return;
    const ux = (bx - ax) / len, uy = (by - ay) / len;
    ctx.fillStyle = pal.windows;
    for (let f = 0; f < floors; f++) {
        for (let w = 0; w < cols; w++) {
            const h = hash(Math.floor(b.seed * 1e6) + f * 131 + w * 17 + Math.floor(ax));
            if (night ? h > .5 : h > .9) continue;
            const along = (w + .5) * len / cols, up = 1.4 + f * 3.2;
            const x = ax + ux * along + EXTRUDE.x * up, y = ay + uy * along + EXTRUDE.y * up;
            ctx.fillRect(x - .55, y - 1.1, 1.1, 1.3);
        }
    }
}

function drawRoofDetail(ctx, b, ex, ey, pal, px) {
    const pts = b.pts;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let k = 0; k < pts.length; k += 2) { x0 = Math.min(x0, pts[k]); x1 = Math.max(x1, pts[k]); y0 = Math.min(y0, pts[k + 1]); y1 = Math.max(y1, pts[k + 1]); }
    const metal = b.roof === 2 || b.roof === 4 || b.roof === 3;
    ctx.save(); ctx.beginPath(); pathRing(ctx, pts, ex, ey); ctx.clip();
    if (metal || b.roof === 0 || b.roof === 1 || b.roof === 7) {
        // Corrugated sheets: fine ridges across the roof.
        ctx.strokeStyle = 'rgba(0,0,0,.13)'; ctx.lineWidth = px * .6; ctx.beginPath();
        const vertical = (x1 - x0) > (y1 - y0);
        if (vertical) for (let x = x0; x < x1; x += 1.1) { ctx.moveTo(x + ex, y0 + ey); ctx.lineTo(x + ex, y1 + ey); }
        else for (let y = y0; y < y1; y += 1.1) { ctx.moveTo(x0 + ex, y + ey); ctx.lineTo(x1 + ex, y + ey); }
        ctx.stroke();
    } else {
        // Flat slab: a parapet line, and often a rooftop water tank.
        ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = .9; ctx.beginPath(); pathRing(ctx, pts, ex, ey); ctx.stroke();
        if (b.seed < .6 && (x1 - x0) > 6 && (y1 - y0) > 6) {
            const tx = x0 + ex + (x1 - x0) * (.25 + b.seed * .5), ty = y0 + ey + (y1 - y0) * (.3 + (b.seed * 7 % 1) * .4);
            ctx.translate(tx, ty);
            ctx.fillStyle = b.seed < .3 ? '#2a2c35' : '#2f5d8f';
            ctx.beginPath(); ctx.arc(0, 0, .9, 0, 6.283); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.arc(-.25, -.25, .3, 0, 6.283); ctx.fill();
        }
    }
    ctx.restore();
}

// OpenStreetMap usually maps a stadium as one closed outline. Draw it as an open bowl:
// raked stands around a running track and a pitch laid along the long axis.
function drawStadium(ctx, b, pal, p) {
    const pts = b.pts, n = pts.length / 2;
    let cx = 0, cy = 0;
    for (let k = 0; k < n; k++) { cx += pts[2 * k] / n; cy += pts[2 * k + 1] / n; }
    let sxx = 0, syy = 0, sxy = 0;
    for (let k = 0; k < n; k++) { const dx = pts[2 * k] - cx, dy = pts[2 * k + 1] - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
    const angle = .5 * Math.atan2(2 * sxy, sxx - syy), ux = Math.cos(angle), uy = Math.sin(angle);
    let half = 0, halfW = 0;
    for (let k = 0; k < n; k++) { const dx = pts[2 * k] - cx, dy = pts[2 * k + 1] - cy; half = Math.max(half, Math.abs(dx * ux + dy * uy)); halfW = Math.max(halfW, Math.abs(-dx * uy + dy * ux)); }
    const ex = b.h * EXTRUDE.x, ey = b.h * EXTRUDE.y, px = 1 / p;
    const ring = (f, dx = 0, dy = 0) => { ctx.beginPath(); for (let k = 0; k < n; k++) { const x = cx + (pts[2 * k] - cx) * f + dx, y = cy + (pts[2 * k + 1] - cy) * f + dy; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); };
    const night = !!pal.lamp;
    // Outer wall, then the stands as a band from the rim down to the track.
    ring(1); ctx.fillStyle = pal.wallSouth; ctx.fill();
    ring(1, ex, ey); ctx.fillStyle = night ? '#2b3348' : '#e7dcc8'; ctx.fill();
    ctx.strokeStyle = pal.ink; ctx.lineWidth = px * .8; ctx.stroke();
    const seats = night ? ['#2c3f6b', '#5b2f3f'] : ['#3f74b5', '#c9473c'];
    for (let i = 0; i < 6; i++) {
        const f = .92 - i * .045, lift = 1 - i / 6;
        ring(f, ex * lift, ey * lift); ctx.fillStyle = seats[i % 2]; ctx.fill();
    }
    ring(.66); ctx.fillStyle = pal.area[18]; ctx.fill();
    ring(.66); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = Math.max(.4, px * .6); ctx.stroke();
    ring(.56); ctx.fillStyle = pal.area[17]; ctx.fill();
    // The pitch itself.
    const L = half * .78, Wd = Math.min(halfW * .62, L * .66);
    ctx.save(); ctx.translate(cx, cy); ctx.transform(ux, uy, -uy, ux, 0, 0);
    ctx.fillStyle = night ? '#24563a' : '#82c45f'; ctx.fillRect(-L / 2 * 1.02, -Wd / 2, L * 1.02, Wd);
    ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = Math.max(.3, px * .6);
    ctx.strokeRect(-L / 2, -Wd / 2 + 2, L, Wd - 4);
    ctx.beginPath(); ctx.moveTo(0, -Wd / 2 + 2); ctx.lineTo(0, Wd / 2 - 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, Math.min(9.15, Wd * .18), 0, 6.283); ctx.stroke();
    if (night) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = 'rgba(190,255,200,.12)'; ctx.fillRect(-L / 2, -Wd / 2, L, Wd); }
    ctx.restore();
    if (p > .3) { ring(1, ex, ey); ctx.strokeStyle = pal.ink; ctx.lineWidth = px; ctx.stroke(); }
}
