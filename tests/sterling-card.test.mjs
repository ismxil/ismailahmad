import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { sterlingCard, initSterlingCard } from '../js/v2/sterling-card.js';

function setup(t, reduced = false) {
    const dom = new JSDOM(`<main>${sterlingCard()}</main>`);
    t.after(() => dom.window.close());
    t.mock.method(globalThis, 'matchMedia', () => ({ matches: reduced }));
    const mount = dom.window.document.querySelector('main');
    initSterlingCard(mount);
    return { dom, mount, card: mount.querySelector('.sterling-card__object'), scene: mount.querySelector('.sterling-card__scene') };
}

// Node has no matchMedia; install a configurable shim for the scoped mocks.
globalThis.matchMedia ??= () => ({ matches: false });

test('Sterling card flips with an accessible state and resets to its front', t => {
    const { dom, card } = setup(t);
    card.click();
    assert.equal(card.getAttribute('aria-pressed'), 'true');
    assert.equal(card.style.getPropertyValue('--card-y'), '180deg');
    assert.match(card.getAttribute('aria-label'), /front/);
    card.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape' }));
    assert.equal(card.getAttribute('aria-pressed'), 'false');
    assert.equal(card.style.getPropertyValue('--card-y'), '0deg');
});

test('Keyboard rotation works and Escape restores the original view', t => {
    const { dom, card } = setup(t);
    const key = value => card.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: value, cancelable: true }));
    key('ArrowRight');
    assert.equal(card.style.getPropertyValue('--card-y'), '15deg');
    assert.equal(card.style.getPropertyValue('--light-x'), '71%');
    for (let i = 0; i < 10; i++) key('ArrowUp');
    assert.equal(card.style.getPropertyValue('--card-x'), '45deg');
    key('Escape');
    assert.equal(card.style.getPropertyValue('--card-x'), '0deg');
    assert.equal(card.style.getPropertyValue('--card-y'), '0deg');
});

test('Reduced motion skips hover tilt while preserving explicit flipping', t => {
    const { dom, scene, card } = setup(t, true);
    scene.dispatchEvent(new dom.window.MouseEvent('pointermove', { clientX: 100, clientY: 50 }));
    assert.equal(card.style.getPropertyValue('--card-y'), '');
    card.click();
    assert.equal(card.getAttribute('aria-pressed'), 'true');
});

test('Dragging rotates without also triggering a flip on release', t => {
    const { dom, scene, card } = setup(t);
    card.setPointerCapture = () => {};
    const down = new dom.window.MouseEvent('pointerdown', { clientX: 10, clientY: 10, button: 0 });
    Object.defineProperties(down, { isPrimary: { value: true }, pointerId: { value: 1 } });
    card.dispatchEvent(down);
    scene.dispatchEvent(new dom.window.MouseEvent('pointermove', { clientX: 110, clientY: 10 }));
    card.dispatchEvent(new dom.window.MouseEvent('pointerup'));
    card.click();
    assert.equal(card.style.getPropertyValue('--card-y'), '45deg');
    assert.equal(card.getAttribute('aria-pressed'), 'false');
});
