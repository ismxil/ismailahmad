import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { JSDOM } from 'jsdom';
import { selectWork } from '../js/v2/work-selection.js';

test('Home stays at four cards while its badge counts all published work', () => {
    for (const length of [0, 3, 5, 12]) {
        const cases = Array.from({length}, (_,i) => ({slug:`project-${i}`}));
        const home = selectWork(cases,true), work = selectWork(cases);
        assert.equal(home.visible.length,Math.min(4,length));
        assert.equal(home.total,length);
        assert.deepEqual(home.visible,cases.slice(0,4));
        assert.deepEqual(work.visible,cases);
        assert.equal(work.total,length);
        assert.equal(cases.length,length);
    }
});

test('Only the home page opts into the four-card preview', async () => {
    const home = new JSDOM(await readFile(new URL('../index.html', import.meta.url),'utf8'));
    const work = new JSDOM(await readFile(new URL('../work.html', import.meta.url),'utf8'));
    assert(home.window.document.querySelector('#work-list').hasAttribute('data-work-preview'));
    assert(!work.window.document.querySelector('#work-list').hasAttribute('data-work-preview'));
    home.window.close();work.window.close();
});
