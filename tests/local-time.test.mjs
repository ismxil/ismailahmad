import test from 'node:test';
import assert from 'node:assert/strict';
import { berlinTime } from '../js/v2/local-time.js';
test('Home clock uses Berlin time and follows daylight saving changes', () => {
    assert.equal(berlinTime(new Date('2026-01-15T12:54:00Z')), '1:54 PM');
    assert.equal(berlinTime(new Date('2026-07-15T12:54:00Z')), '2:54 PM');
});
