// Renders Tiny Lagos map tiles off the main thread, so panning never waits on drawing.
import { parseTile, renderRegion } from './lagos-render.js';
import { TILE } from './lagos-map-schema.js';

const BASE = '/assets/lagos/map/t/';
let present = new Set();
const tiles = new Map();
const order = [];

function load(c, r) {
    const key = c + '_' + r;
    if (!present.has(key)) return Promise.resolve(null);
    if (!tiles.has(key)) {
        tiles.set(key, fetch(BASE + key + '.bin').then(res => res.ok ? res.arrayBuffer() : null).then(buffer => {
            if (!buffer) return null;
            const tile = parseTile(buffer, c, r);
            postMessage({ type: 'labels', key, labels: labelsFor(tile) });
            return tile;
        }).catch(() => null));
        order.push(key);
        // Keep memory bounded; parsed tiles are cheap to fetch again from the HTTP cache.
        while (order.length > 360) tiles.delete(order.shift());
    }
    return tiles.get(key);
}

// Street names and points of interest for the main thread's label layer.
function labelsFor(tile) {
    const streets = [];
    for (const road of tile.roads) {
        if (!road.name || road.cls > 6) continue;
        const pts = road.pts;
        let best = 0, at = 0;
        for (let k = 2; k < pts.length; k += 2) {
            const len = Math.hypot(pts[k] - pts[k - 2], pts[k + 1] - pts[k - 1]);
            if (len > best) { best = len; at = k; }
        }
        if (best < 25) continue;
        const ax = pts[at - 2], ay = pts[at - 1], bx = pts[at], by = pts[at + 1];
        streets.push([road.name, road.cls, (ax + bx) / 2, (ay + by) / 2, Math.atan2(by - ay, bx - ax), best]);
    }
    return { streets, pois: tile.pois.filter(p => p.name).map(p => [p.name, p.kind, p.x, p.y, p.rank]) };
}

onmessage = async ({ data }) => {
    if (data.type === 'init') { present = new Set(data.tiles); return; }
    if (data.type === 'labels') { for (const [c, r] of data.tiles) load(c, r); return; }
    const { id, x0, y0, size, p, mode, px } = data;
    const region = { x0, y0, x1: x0 + size, y1: y0 + size };
    const wanted = [];
    for (let r = Math.floor((y0 - 300) / TILE); r <= Math.floor((region.y1 + 300) / TILE); r++)
        for (let c = Math.floor((x0 - 300) / TILE); c <= Math.floor((region.x1 + 300) / TILE); c++) wanted.push(load(c, r));
    const loaded = (await Promise.all(wanted)).filter(Boolean);
    const canvas = new OffscreenCanvas(px, px), ctx = canvas.getContext('2d');
    ctx.setTransform(p, 0, 0, p, -x0 * p, -y0 * p);
    renderRegion(ctx, region, loaded, p, mode);
    const bitmap = canvas.transferToImageBitmap();
    postMessage({ type: 'tile', id, bitmap }, [bitmap]);
};
