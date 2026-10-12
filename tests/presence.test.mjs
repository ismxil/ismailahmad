import test from 'node:test';
import assert from 'node:assert/strict';
import { presenceFor } from '../js/v2/presence.js';

test('The bubble follows the hour in Berlin, around the whole clock', () => {
    const line = hour => presenceFor(hour).text;

    // Past midnight is still the night before's answer.
    assert.equal(line(0), 'finding it hard to sleep?');
    assert.equal(line(4), 'finding it hard to sleep?');

    assert.equal(line(5), 'busy, working at a cafe');
    assert.equal(line(9), 'busy, working at a cafe');
    assert.equal(line(16), 'busy, working at a cafe');

    assert.equal(line(17), 'taking a walk');
    assert.equal(line(21), 'taking a walk');

    assert.equal(line(22), 'finding it hard to sleep?');
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
    assert.ok(!presenceFor(23).icon.includes('presence__steam'));
});
