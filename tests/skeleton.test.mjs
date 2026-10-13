import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { archiveGridSkeleton, watchImageSkeletons } from '../js/v2/skeleton.js';

function fixture(complete = false, width = 0) {
    const dom = new JSDOM('<figure><img alt="Project"><figcaption>Caption</figcaption></figure>');
    const mount = dom.window.document.querySelector('figure');
    const image = mount.querySelector('img');
    Object.defineProperties(image, { complete: { value: complete }, naturalWidth: { value: width } });
    return { dom, mount, image };
}

test('image skeleton stays until decode finishes, preserves caption and restores image accessibility', async () => {
    const { dom, mount, image } = fixture();
    let resolve;
    image.decode = () => new Promise(done => { resolve = done; });
    watchImageSkeletons(mount);
    assert(mount.querySelector('.skeleton'));
    assert.equal(mount.lastElementChild.tagName, 'FIGCAPTION');
    image.dispatchEvent(new dom.window.Event('load'));
    assert(mount.querySelector('.skeleton'));
    resolve();
    await Promise.resolve();
    assert.equal(mount.querySelector('.skeleton'), null);
    assert.equal(mount.firstElementChild, image);
    assert.equal(image.alt, 'Project');
    assert(!image.closest('[aria-hidden]'));
});

test('failed images clear loaders, including already completed failures', () => {
    const { dom, mount, image } = fixture();
    watchImageSkeletons(mount);
    image.dispatchEvent(new dom.window.Event('error'));
    assert.equal(mount.querySelector('.skeleton'), null);
    const cachedFailure = fixture(true);
    watchImageSkeletons(cachedFailure.mount);
    assert.equal(cachedFailure.mount.querySelector('.skeleton'), null);
});

test('cached images need no skeleton', () => {
    const { mount, image } = fixture(true, 800);
    watchImageSkeletons(mount);
    assert.equal(mount.firstElementChild, image);
    assert.equal(mount.querySelector('.skeleton'), null);
});

test('the archive wall stands up in mixed proportions, inert to a reader', () => {
    const dom = new JSDOM(`<ul>${archiveGridSkeleton(4)}</ul>`);
    const items = [...dom.window.document.querySelectorAll('li')];
    assert.equal(items.length, 4);
    assert(items.every(li => li.getAttribute('aria-hidden') === 'true'));
    assert(items.every(li => li.querySelector('.archive-tile.skeleton-tile > .skeleton')));
    // The plates must not all share a ratio, or the masonry reflows the
    // moment the real pictures land.
    const ratios = new Set(items.map(li => li.querySelector('.skeleton').style.aspectRatio));
    assert(ratios.size > 1, 'placeholders should vary in proportion');
    assert(![...ratios].includes(''), 'every placeholder needs a reserved shape');
});
