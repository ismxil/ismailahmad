import test from 'node:test';
import assert from 'node:assert/strict';
import { presenceFor } from '../js/v2/presence.js';

test('The bubble follows the reader\'s own hour, around the whole clock', () => {
    const line = hour => presenceFor(hour).text;

    // Past midnight is still the night before's answer.
    assert.equal(line(0), 'finding it hard to sleep?');
    assert.equal(line(6), 'finding it hard to sleep?');

    assert.equal(line(7), 'busy, working at a cafe');
    assert.equal(line(12), 'busy, working at a cafe');
    assert.equal(line(17), 'busy, working at a cafe');

    assert.equal(line(18), 'taking a walk');
    assert.equal(line(20), 'taking a walk');

    assert.equal(line(21), 'finding it hard to sleep?');
    assert.equal(line(23), 'finding it hard to sleep?');

    // Every hour has something to say.
    for (let hour = 0; hour < 24; hour += 1) {
        assert.ok(presenceFor(hour).text, `hour ${hour}`);
        assert.ok(presenceFor(hour).icon.startsWith('<svg'), `hour ${hour} has artwork`);
    }
});

test('Only the morning carries steam to animate', () => {
    assert.ok(presenceFor(9).icon.includes('presence__steam'));
    assert.ok(!presenceFor(19).icon.includes('presence__steam'));
    assert.ok(!presenceFor(22).icon.includes('presence__steam'));
});
