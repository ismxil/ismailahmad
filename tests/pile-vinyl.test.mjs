import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { initPileVinyl } from '../js/v2/pile-vinyl.js';

async function setup(t, reject = false) {
    const dom = new JSDOM(await readFile(new URL('../about.html', import.meta.url), 'utf8'));
    const instances = [];
    class Media extends EventTarget {
        paused = true; volume = 0; currentTime = 0; duration = 120; ended = false;
        constructor(src) { super(); this.src = src; instances.push(this); }
        async play() { if (reject) throw new Error('Playback blocked'); this.paused = false; }
        pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
    }
    const globals = { document: dom.window.document, window: dom.window, Audio: Media,
        matchMedia: () => ({ matches: false }), requestAnimationFrame: () => 1, cancelAnimationFrame: () => {},
        IntersectionObserver: class { observe() {} } };
    const before = Object.fromEntries(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
    for (const [key,value] of Object.entries(globals)) Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
    t.after(() => { dom.window.close(); for (const [key,descriptor] of Object.entries(before)) { if (descriptor) Object.defineProperty(globalThis,key,descriptor); else delete globalThis[key]; } });
    const player = dom.window.document.querySelector('.pile-vinyl');
    const arm = player.querySelector('[data-tonearm]');
    initPileVinyl(player);
    const key = value => arm.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }));
    return { player, arm, key, instances, window: dom.window };
}

test('Vinyl waits for a gesture and recovers from rejected playback', async t => {
    const { player, arm, key, instances } = await setup(t, true);
    assert.equal(instances.length,0);
    assert.equal(arm.getAttribute('aria-pressed'),'false');
    key('Enter');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(instances.length,1);
    assert.equal(arm.getAttribute('aria-pressed'),'false');
    assert(!player.classList.contains('is-playing'));
    assert.match(player.querySelector('.vinyl__status').textContent,/try again/);
});

test('Keyboard playback advances tracks and leaving the page stops the record', async t => {
    const { player, arm, key, instances, window } = await setup(t);
    key(' ');
    await new Promise(resolve=>setImmediate(resolve));
    assert.equal(arm.getAttribute('aria-pressed'),'true');
    assert.equal(instances[0].paused,false);
    instances[0].dispatchEvent(new Event('ended'));
    await new Promise(resolve=>setImmediate(resolve));
    assert.match(instances[0].src,/03-inner_motion/);
    assert.match(player.querySelector('.vinyl__disc img').getAttribute('src'),/03-cover/);
    assert.match(arm.getAttribute('aria-label'),/Inner Motion/);
    window.dispatchEvent(new window.Event('pagehide'));
    assert.equal(instances[0].paused,true);
    assert.equal(arm.getAttribute('aria-pressed'),'false');
});

test('The vinyl surface is a working play and pause button', async t => {
    const { player, arm, instances } = await setup(t);
    const record = player.querySelector('.vinyl__record');
    record.click();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(instances[0].paused, false);
    assert.equal(record.getAttribute('aria-pressed'), 'true');
    assert.equal(arm.getAttribute('aria-pressed'), 'true');
    record.click();
    assert.equal(record.getAttribute('aria-pressed'), 'false');
    assert.match(record.getAttribute('aria-label'), /^Play/);
});
