/*
 * Builds the Tiny Lagos map tiles from an OpenStreetMap extract.
 *
 *   osmium extract -b 3.17,6.39,3.60,6.70 --strategy smart nigeria-latest.osm.pbf -o lagos.osm.pbf
 *   osmium tags-filter lagos.osm.pbf nwr/building nwr/highway nwr/railway nwr/natural nwr/landuse \
 *     nwr/leisure nwr/waterway nwr/water nwr/amenity nwr/place nwr/aeroway nwr/man_made nwr/shop=mall \
 *     nwr/tourism nwr/bridge -o sel.pbf
 *   osmium export sel.pbf -f geojsonseq -x print_record_separator=false -o sel.geojsonseq
 *   node scripts/lagos-map/build-data.mjs sel.geojsonseq
 *
 * Output goes to assets/lagos/map/: meta.json plus one binary tile per square kilometre.
 * Map data © OpenStreetMap contributors, available under the Open Database Licence.
 */
import { createReadStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { BBOX, TILE, MARGIN, UNIT, project, AREA, ROAD, WATERLINE, POI } from '../../js/lagos-map-schema.js';

const input = process.argv[2];
if (!input) throw new Error('Pass the exported .geojsonseq file.');
const OUT = 'assets/lagos/map';

const [W, H] = [project(BBOX.east, BBOX.south).x, project(BBOX.east, BBOX.south).y];
const COLS = Math.ceil(W / TILE), ROWS = Math.ceil(H / TILE);
const tiles = new Map();
const tile = (c, r) => {
    const key = c + '_' + r;
    if (!tiles.has(key)) tiles.set(key, { c, r, buildings: [], roads: [], areas: [], lines: [], pois: [], names: new Map() });
    return tiles.get(key);
};
const nameIndex = (t, name) => {
    if (!name) return 0;
    if (!t.names.has(name)) t.names.set(name, t.names.size + 1);
    return t.names.get(name);
};
const places = [], coastline = [];

// ---------- geometry helpers ----------
const ring = coords => coords.map(([lng, lat]) => project(lng, lat));
function bounds(points) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const p of points) { if (p.x < x0) x0 = p.x; if (p.x > x1) x1 = p.x; if (p.y < y0) y0 = p.y; if (p.y > y1) y1 = p.y; }
    return { x0, y0, x1, y1 };
}
function simplify(points, tolerance) {
    if (points.length < 3) return points;
    const keep = new Uint8Array(points.length); keep[0] = keep[points.length - 1] = 1;
    const stack = [[0, points.length - 1]];
    while (stack.length) {
        const [a, b] = stack.pop(); let max = 0, index = -1;
        const ax = points[a].x, ay = points[a].y, dx = points[b].x - ax, dy = points[b].y - ay, len = Math.hypot(dx, dy) || 1e-9;
        for (let i = a + 1; i < b; i++) {
            const d = Math.abs(dy * (points[i].x - ax) - dx * (points[i].y - ay)) / len;
            if (d > max) { max = d; index = i; }
        }
        if (max > tolerance) { keep[index] = 1; stack.push([a, index], [index, b]); }
    }
    return points.filter((_, i) => keep[i]);
}
function polygonArea(points) {
    let s = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) s += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    return Math.abs(s / 2);
}
// Sutherland–Hodgman against an axis-aligned rectangle.
function clipPolygon(points, r) {
    const edges = [
        [p => p.x >= r.x0, (a, b) => ({ x: r.x0, y: a.y + (b.y - a.y) * (r.x0 - a.x) / (b.x - a.x) })],
        [p => p.x <= r.x1, (a, b) => ({ x: r.x1, y: a.y + (b.y - a.y) * (r.x1 - a.x) / (b.x - a.x) })],
        [p => p.y >= r.y0, (a, b) => ({ x: a.x + (b.x - a.x) * (r.y0 - a.y) / (b.y - a.y), y: r.y0 })],
        [p => p.y <= r.y1, (a, b) => ({ x: a.x + (b.x - a.x) * (r.y1 - a.y) / (b.y - a.y), y: r.y1 })],
    ];
    let out = points;
    for (const [inside, cut] of edges) {
        const src = out; out = [];
        for (let i = 0; i < src.length; i++) {
            const cur = src[i], prev = src[(i + src.length - 1) % src.length];
            if (inside(cur)) { if (!inside(prev)) out.push(cut(prev, cur)); out.push(cur); }
            else if (inside(prev)) out.push(cut(prev, cur));
        }
        if (!out.length) break;
    }
    return out;
}
// Liang–Barsky per segment, joined back into runs.
function clipLine(points, r) {
    const runs = []; let run = null;
    for (let i = 1; i < points.length; i++) {
        const a = points[i - 1], b = points[i], dx = b.x - a.x, dy = b.y - a.y;
        let t0 = 0, t1 = 1, ok = true;
        for (const [p, q] of [[-dx, a.x - r.x0], [dx, r.x1 - a.x], [-dy, a.y - r.y0], [dy, r.y1 - a.y]]) {
            if (p === 0) { if (q < 0) { ok = false; break; } }
            else { const t = q / p; if (p < 0) { if (t > t1) { ok = false; break; } if (t > t0) t0 = t; } else { if (t < t0) { ok = false; break; } if (t < t1) t1 = t; } }
        }
        if (!ok) { run = null; continue; }
        const s = { x: a.x + dx * t0, y: a.y + dy * t0 }, e = { x: a.x + dx * t1, y: a.y + dy * t1 };
        if (!run || t0 > 0) { run = [s]; runs.push(run); }
        run.push(e);
        if (t1 < 1) run = null;
    }
    return runs.filter(r => r.length > 1);
}
const tileRect = (c, r, margin) => ({ x0: c * TILE - margin, y0: r * TILE - margin, x1: (c + 1) * TILE + margin, y1: (r + 1) * TILE + margin });
function tilesFor(b, margin) {
    const list = [];
    for (let r = Math.max(0, Math.floor((b.y0 - margin) / TILE)); r <= Math.min(ROWS - 1, Math.floor((b.y1 + margin) / TILE)); r++)
        for (let c = Math.max(0, Math.floor((b.x0 - margin) / TILE)); c <= Math.min(COLS - 1, Math.floor((b.x1 + margin) / TILE)); c++) list.push([c, r]);
    return list;
}
const q = (v, origin) => Math.round((v - origin) / UNIT);

// ---------- classification ----------
function areaKind(p) {
    if (p.building || p['building:part']) return null;
    if (p.natural === 'water' || p.waterway === 'riverbank' || p.waterway === 'dock' || ['reservoir', 'basin'].includes(p.landuse) || p.water) return AREA.water;
    if (p.leisure === 'pitch') return AREA.pitch;
    if (p.leisure === 'track') return AREA.track;
    if (['stadium', 'sports_centre'].includes(p.leisure)) return AREA.sports;
    if (p.leisure === 'golf_course') return AREA.golf;
    if (['park', 'garden', 'nature_reserve', 'playground', 'common'].includes(p.leisure) || ['recreation_ground', 'village_green'].includes(p.landuse)) return AREA.park;
    if (['grass', 'meadow', 'greenfield'].includes(p.landuse) || p.natural === 'grassland') return AREA.grass;
    if (p.landuse === 'forest' || p.natural === 'wood') return AREA.wood;
    if (p.natural === 'scrub' || p.natural === 'heath') return AREA.scrub;
    if (p.natural === 'wetland' || p.wetland) return AREA.wetland;
    if (['beach', 'sand'].includes(p.natural)) return AREA.sand;
    if (p.aeroway === 'runway' || p.aeroway === 'taxiway') return AREA.runway;
    if (['aerodrome', 'apron'].includes(p.aeroway)) return AREA.apron;
    if (p.amenity === 'parking') return AREA.parking;
    if (p.amenity === 'marketplace') return AREA.market;
    if (['school', 'university', 'college', 'hospital', 'clinic', 'kindergarten'].includes(p.amenity) || p.landuse === 'education') return AREA.campus;
    if (p.landuse === 'cemetery' || p.amenity === 'grave_yard') return AREA.cemetery;
    if (['pier', 'bridge', 'breakwater', 'groyne'].includes(p.man_made)) return AREA.pier;
    if (p.highway === 'pedestrian' || p.place === 'square') return AREA.plaza;
    if (p.landuse === 'industrial' || p.landuse === 'port' || p.landuse === 'railway') return AREA.industrial;
    if (['commercial', 'retail'].includes(p.landuse)) return AREA.commercial;
    if (p.landuse === 'military') return AREA.campus;
    if (['construction', 'brownfield', 'farmland', 'landfill', 'quarry'].includes(p.landuse)) return AREA.bare;
    if (p.landuse === 'residential') return AREA.residential;
    return null;
}
function roadClass(p) {
    const h = p.highway;
    if (h) {
        const base = h.replace('_link', '');
        const map = { motorway: ROAD.motorway, trunk: ROAD.trunk, primary: ROAD.primary, secondary: ROAD.secondary, tertiary: ROAD.tertiary,
            residential: ROAD.street, unclassified: ROAD.street, living_street: ROAD.street, road: ROAD.street, service: ROAD.service,
            pedestrian: ROAD.path, footway: ROAD.path, path: ROAD.path, steps: ROAD.path, cycleway: ROAD.path, track: ROAD.path, busway: ROAD.primary };
        return map[base] ?? null;
    }
    if (['rail', 'light_rail', 'subway', 'narrow_gauge'].includes(p.railway)) return ROAD.rail;
    if (p.aeroway === 'runway') return ROAD.runway;
    if (p.aeroway === 'taxiway') return ROAD.taxiway;
    return null;
}
function poiKind(p) {
    if (['stadium'].includes(p.leisure) || p.building === 'stadium') return POI.stadium;
    if (['university', 'college', 'school'].includes(p.amenity)) return POI.education;
    if (['hospital', 'clinic'].includes(p.amenity)) return POI.health;
    if (p.amenity === 'marketplace' || p.shop === 'mall') return POI.market;
    if (p.amenity === 'place_of_worship') return POI.worship;
    if (['park', 'garden', 'nature_reserve', 'golf_course'].includes(p.leisure)) return POI.park;
    if (['bus_station', 'ferry_terminal'].includes(p.amenity) || p.aeroway === 'terminal' || p.aeroway === 'aerodrome' || p.railway === 'station') return POI.transport;
    if (['theatre', 'arts_centre', 'cinema', 'library'].includes(p.amenity) || ['museum', 'gallery', 'attraction', 'zoo'].includes(p.tourism)) return POI.culture;
    if (['townhall', 'courthouse', 'police', 'fire_station', 'embassy'].includes(p.amenity) || p.office === 'government') return POI.civic;
    if (['hotel'].includes(p.tourism)) return POI.hotel;
    if (p.leisure === 'sports_centre') return POI.stadium;
    return null;
}
// A small stable hash so heights and roof colours don't flicker between builds.
const hash = n => { let x = n | 0; x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); x = Math.imul(x ^ (x >>> 16), 0x45d9f3b); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
function buildingStyle(p, area, seed) {
    const levels = parseFloat(p['building:levels']), height = parseFloat(p.height);
    let h;
    if (Number.isFinite(height)) h = height;
    else if (Number.isFinite(levels)) h = levels * 3.2 + 1;
    else {
        const type = p.building;
        const lv = ['apartments', 'hotel', 'office'].includes(type) ? 3 + Math.floor(seed * 4)
            : ['commercial', 'retail'].includes(type) ? 2 + Math.floor(seed * 2)
            : ['industrial', 'warehouse', 'hangar', 'factory'].includes(type) ? 2
            : ['church', 'mosque', 'cathedral'].includes(type) ? 3
            : area > 900 ? 2 + Math.floor(seed * 2) : area > 220 ? 1 + Math.floor(seed * 2) : 1;
        h = lv * 3.2 + 0.6;
    }
    // roof: 0 rust,1 terracotta,2 corrugated blue,3 teal,4 aluminium,5 cream slab,6 brown,7 red, 8 white slab, 9 stadium bowl
    const type = p.building;
    if (['stadium', 'grandstand'].includes(type) || (p.leisure === 'stadium' && area > 4000)) return { h: Number.isFinite(height) ? height : 16, roof: 9 };
    let roof;
    if (['industrial', 'warehouse', 'hangar', 'factory'].includes(type) || area > 2500) roof = [2, 4, 4, 3][Math.floor(seed * 4)];
    else if (['apartments', 'office', 'commercial', 'hotel', 'retail'].includes(type) || h > 12) roof = [5, 8, 5, 4][Math.floor(seed * 4)];
    else roof = [0, 0, 1, 1, 2, 4, 6, 7, 5, 3][Math.floor(seed * 10)];
    return { h: Math.min(250, h), roof };
}

// ---------- read ----------
let count = 0;
const rl = createInterface({ input: createReadStream(input), crlfDelay: Infinity });
for await (const line of rl) {
    if (!line) continue;
    count++;
    if (count % 500000 === 0) console.log(count.toLocaleString(), 'features read');
    const f = JSON.parse(line), p = f.properties, g = f.geometry;
    if (!g) continue;
    if (g.type === 'Point') {
        const [lng, lat] = g.coordinates;
        if (lng < BBOX.west || lng > BBOX.east || lat < BBOX.south || lat > BBOX.north) continue;
        const pt = project(lng, lat);
        if (p.place && p.name && ['suburb', 'neighbourhood', 'quarter', 'town', 'village', 'city', 'island', 'islet', 'hamlet'].includes(p.place)) {
            places.push({ name: p.name, kind: p.place, x: Math.round(pt.x), y: Math.round(pt.y) });
            continue;
        }
        const kind = p.name && poiKind(p);
        if (kind != null) {
            const c = Math.floor(pt.x / TILE), r = Math.floor(pt.y / TILE);
            if (c >= 0 && r >= 0 && c < COLS && r < ROWS) { const t = tile(c, r); t.pois.push([q(pt.x, c * TILE), q(pt.y, r * TILE), kind, nameIndex(t, p.name), 0]); }
        }
        continue;
    }
    if (g.type === 'LineString') {
        if (p.natural === 'coastline') { coastline.push(ring(g.coordinates)); continue; }
        let cls = roadClass(p);
        const wl = p.waterway && { river: WATERLINE.river, canal: WATERLINE.canal, stream: WATERLINE.stream, drain: WATERLINE.drain, ditch: WATERLINE.drain }[p.waterway];
        if (cls == null && wl == null) continue;
        const pts = simplify(ring(g.coordinates), 0.4), b = bounds(pts);
        for (const [c, r] of tilesFor(b, MARGIN)) {
            const t = tile(c, r), ox = c * TILE, oy = r * TILE;
            for (const run of clipLine(pts, tileRect(c, r, MARGIN))) {
                const coords = run.flatMap(pt => [q(pt.x, ox), q(pt.y, oy)]);
                if (wl != null) t.lines.push([run.length, wl, coords]);
                else {
                    const flags = (p.bridge && p.bridge !== 'no' ? 1 : 0) | (p.tunnel && p.tunnel !== 'no' ? 2 : 0) | (p.highway?.endsWith('_link') ? 4 : 0) | (p.oneway === 'yes' ? 8 : 0);
                    t.roads.push([run.length, cls, flags, nameIndex(t, p.name || p.ref || ''), coords]);
                }
            }
        }
        continue;
    }
    if (g.type !== 'Polygon' && g.type !== 'MultiPolygon') continue;
    const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
    const isBuilding = p.building && p.building !== 'no' && !p.parking;
    const kind = isBuilding ? null : areaKind(p);
    const pk = p.name && poiKind(p);
    for (const poly of polys) {
        const rings = poly.map(ring), outer = rings[0], b = bounds(outer);
        if (b.x1 < 0 || b.y1 < 0 || b.x0 > W || b.y0 > H) continue;
        const area = polygonArea(outer);
        if (pk != null) {
            const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, c = Math.floor(cx / TILE), r = Math.floor(cy / TILE);
            if (c >= 0 && r >= 0 && c < COLS && r < ROWS) { const t = tile(c, r); t.pois.push([q(cx, c * TILE), q(cy, r * TILE), pk, nameIndex(t, p.name), Math.min(32767, Math.round(Math.sqrt(area)))]); }
        }
        if (isBuilding) {
            if (area < 6) continue;
            const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2, c = Math.floor(cx / TILE), r = Math.floor(cy / TILE);
            if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
            const pts = simplify([...outer.slice(0, -1)], 0.3);
            if (pts.length < 3) continue;
            const t = tile(c, r), style = buildingStyle(p, area, hash(count));
            t.buildings.push([pts.length, style.roof, Math.round(style.h * 2), pts.flatMap(pt => [q(pt.x, c * TILE), q(pt.y, r * TILE)])]);
            continue;
        }
        if (kind == null) continue;
        const simplified = rings.map(rg => simplify(rg.slice(0, -1), 0.6)).filter(rg => rg.length >= 3);
        if (!simplified.length) continue;
        for (const [c, r] of tilesFor(b, MARGIN)) {
            const rect = tileRect(c, r, MARGIN), out = [];
            for (const rg of simplified) {
                const clipped = clipPolygon(rg, rect);
                if (clipped.length >= 3) out.push(clipped.flatMap(pt => [q(pt.x, c * TILE), q(pt.y, r * TILE)]));
            }
            if (out.length) tile(c, r).areas.push([kind, out]);
        }
    }
}
console.log(count.toLocaleString(), 'features read;', tiles.size, 'tiles');

// The Atlantic: every coastline run in the box is closed straight down to the box's south edge.
for (const line of coastline) {
    const runs = clipLine(line, { x0: -1, y0: -1, x1: W + 1, y1: H + 1 });
    for (const run of runs) {
        const poly = [...run, { x: run.at(-1).x, y: H + 50 }, { x: run[0].x, y: H + 50 }];
        for (const [c, r] of tilesFor(bounds(poly), MARGIN)) {
            const clipped = clipPolygon(poly, tileRect(c, r, MARGIN));
            if (clipped.length >= 3) tile(c, r).areas.push([AREA.sea, [clipped.flatMap(pt => [q(pt.x, c * TILE), q(pt.y, r * TILE)])]]);
        }
    }
}

// ---------- write ----------
await rm(OUT + '/t', { recursive: true, force: true });
await mkdir(OUT + '/t', { recursive: true });
let bytes = 0, buildingCount = 0;
const index = [];
for (const t of tiles.values()) {
    const ints = [];
    const push = (...v) => { for (const n of v) { if (n < -32768 || n > 32767) throw new Error('int16 overflow ' + n); ints.push(n); } };
    push(t.areas.length);
    for (const [kind, rings] of t.areas) { push(kind, rings.length); for (const rg of rings) { push(rg.length / 2); push(...rg); } }
    push(t.lines.length);
    for (const [n, kind, coords] of t.lines) { push(n, kind); push(...coords); }
    push(t.roads.length);
    for (const [n, cls, flags, name, coords] of t.roads) { push(n, cls, flags, name); push(...coords); }
    t.buildings.sort((a, b) => a[3][1] - b[3][1]);
    push(t.buildings.length);
    for (const [n, roof, h, coords] of t.buildings) { push(n, roof, h); push(...coords); }
    push(t.pois.length);
    for (const poi of t.pois) push(...poi);
    buildingCount += t.buildings.length;
    const names = JSON.stringify([...t.names.keys()]);
    const json = Buffer.from(names);
    const pad = json.length % 2;
    const buf = Buffer.alloc(4 + json.length + pad + ints.length * 2);
    buf.writeUInt32LE(json.length, 0); json.copy(buf, 4);
    const data = new Int16Array(buf.buffer, buf.byteOffset + 4 + json.length + pad, ints.length);
    data.set(ints);
    await writeFile(`${OUT}/t/${t.c}_${t.r}.bin`, buf);
    bytes += buf.length;
    index.push([t.c, t.r]);
}
await writeFile(`${OUT}/meta.json`, JSON.stringify({ width: Math.round(W), height: Math.round(H), cols: COLS, rows: ROWS, tiles: index, places }));
console.log(buildingCount.toLocaleString(), 'buildings,', (bytes / 1e6).toFixed(1), 'MB in', index.length, 'tiles,', places.length, 'places');
