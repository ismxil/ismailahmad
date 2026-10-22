import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {build} from 'esbuild';
import {project, BBOX} from '../js/lagos-map-schema.js';

const html = await readFile(new URL('../lagos.html', import.meta.url), 'utf8');
const {outputFiles} = await build({entryPoints: [new URL('../js/lagos.js', import.meta.url).pathname], bundle: true, write: false, format: 'iife', logLevel: 'silent'});
const script = outputFiles[0].text;
const WORLD = project(BBOX.east, BBOX.south);

// jsdom has no canvas, workers or network here, so the map data never loads; these tests
// cover the camera and the interface around it. Animation frames run on a fake clock.
function setup(path = '', size = {width: 1024, height: 900}) {
    const dom = new JSDOM(html, {url: 'http://localhost/lagos' + path, runScripts: 'outside-only'});
    const {window: w} = dom;
    const context = new Proxy({measureText: () => ({width: 40}), createLinearGradient: () => ({addColorStop() {}})}, {get: (target, key) => target[key] ?? (() => {})});
    w.HTMLCanvasElement.prototype.getContext = () => context;
    Object.defineProperty(w, 'innerWidth', {value: size.width, configurable: true});
    Object.defineProperty(w.document.getElementById('explorer'), 'clientHeight', {value: size.height});
    let clock = 0, queue = [];
    w.performance.now = () => clock;
    w.requestAnimationFrame = cb => { queue.push(cb); return queue.length; };
    w.fetch = () => new Promise(() => {});
    w.eval(script);
    const settle = () => { for (let i = 0; i < 50 && queue.length; i++) { clock += 1000; const run = queue; queue = []; run.forEach(cb => cb(clock)); } };
    settle();
    const $ = id => w.document.getElementById(id);
    const click = id => { $(id).click(); settle(); };
    return {w, d: w.document, $, click, settle, close: () => w.close()};
}
const zoom = $ => parseInt($('zoom-level').textContent);
const pin = ($, id) => ({x: parseFloat($('pin-' + id).style.left), y: parseFloat($('pin-' + id).style.top)});

test('search selects a landmark, updates its shareable URL, and closes cleanly', () => {
    const {w, $, d, click, close} = setup();
    $('search').value = 'lekki'; $('search').dispatchEvent(new w.Event('input'));
    assert.deepEqual([...d.querySelectorAll('#results button')].map(b => b.textContent), ['Lekki–Ikoyi Bridge', 'Lekki Conservation Centre']);
    d.querySelector('#results button').click();
    assert.equal($('place-title').textContent, 'Lekki–Ikoyi Bridge'); assert.equal(w.location.hash, '#lekki'); assert.equal($('place-card').hidden, false);
    click('close-place');
    assert.equal($('place-card').hidden, true); assert.equal(w.location.hash, ''); close();
});

test('deep links, zoom limits, reset, lighting, and empty search work', () => {
    const {w, $, click, close} = setup('#marina');
    assert.equal($('place-title').textContent, 'Marina');
    for (let i = 0; i < 20; i++) click('zoom-in');
    assert.equal($('zoom-level').textContent, '4000%');
    click('reset'); assert.equal($('zoom-level').textContent, '100%');
    click('night'); assert.equal($('night').getAttribute('aria-pressed'), 'true'); assert.ok(w.document.body.classList.contains('night'));
    click('day'); assert.equal($('day').getAttribute('aria-pressed'), 'true');
    $('search').value = 'unknown place'; $('search').dispatchEvent(new w.Event('input'));
    assert.match($('results').textContent, /No places found/); close();
});

test('map controls expose places, toggle labels, and collapse the overview', () => {
    const {$, d, click, close} = setup();
    click('places-toggle'); assert.equal($('place-index').hidden, false);
    assert.equal(d.querySelectorAll('#destinations button').length, 34);
    d.querySelector('#destinations button').click(); assert.equal($('place-index').hidden, true);
    click('labels-toggle'); assert.equal($('labels-toggle').getAttribute('aria-pressed'), 'false');
    assert.ok([...d.querySelectorAll('.pin')].every(p => p.hidden));
    click('mini-toggle'); assert.equal($('minimap').hidden, true);
    assert.equal($('mini-toggle').getAttribute('aria-expanded'), 'false'); close();
});

test('shared views restore position, zoom and lighting', () => {
    const {$, close} = setup('?lat=6.4983&lng=3.3646&z=2.5&night=1');
    assert.equal($('zoom-level').textContent, '250%');
    assert.equal($('night').getAttribute('aria-pressed'), 'true');
    // The National Stadium pin sits in the middle of the screen.
    const s = pin($, 'national-stadium');
    assert.ok(Math.abs(s.x - 1024 / 2) < 2 && Math.abs(s.y - 900 / 2) < 2); close();
});

test('the whole city fits, zooming out stops at 33%, and reset returns to 100%', () => {
    const {$, w, click, close} = setup();
    click('fit-map');
    assert.ok(zoom($) < 100); assert.ok(w.document.body.classList.contains('map-overview'));
    for (let i = 0; i < 20; i++) click('zoom-out');
    assert.equal($('zoom-level').textContent, '33%');
    click('reset'); assert.equal($('zoom-level').textContent, '100%');
    assert.ok(!w.document.body.classList.contains('map-overview')); close();
});

test('zoomed-out shared views and resize retain the camera zoom', () => {
    const {w, $, settle, close} = setup('?lat=6.5&lng=3.38&z=0.5');
    assert.equal($('zoom-level').textContent, '50%');
    Object.defineProperty(w, 'innerWidth', {value: 1100, configurable: true}); w.dispatchEvent(new w.Event('resize')); settle();
    assert.equal($('zoom-level').textContent, '50%'); close();
});

test('zoomed all the way out, the map stays centred wherever you were', () => {
    // On a large screen the whole city fits at 33%, so it locks to the middle.
    const {$, click, close} = setup('?lat=6.69&lng=3.18&z=0.6', {width: 1800, height: 1200});
    for (let i = 0; i < 20; i++) click('zoom-out');
    assert.equal($('zoom-level').textContent, '33%');
    const p = 0.1 * 0.33, marina = project(3.3920, 6.4500), s = pin($, 'marina');
    assert.ok(Math.abs(s.x - ((marina.x - WORLD.x / 2) * p + 1800 / 2)) < 1);
    assert.ok(Math.abs(s.y - ((marina.y - WORLD.y / 2) * p + 1200 / 2)) < 1); close();
});

test('places sit in their real positions and open in Apple Maps', () => {
    const {$, close} = setup('#oshodi');
    assert.equal($('place-title').textContent, 'Oshodi');
    assert.match($('apple-maps').href, /^https:\/\/maps\.apple\.com\/\?ll=6\.55550,3\.35100&q=Oshodi/);
    assert.ok(pin($, 'ikeja').x > pin($, 'agege').x, 'Ikeja is east of Agege');
    assert.ok(pin($, 'oshodi').y < pin($, 'mushin').y, 'Oshodi is north of Mushin');
    assert.ok(pin($, 'teslim-balogun').x < pin($, 'national-stadium').x, 'Teslim Balogun is west of the National Stadium'); close();
});
