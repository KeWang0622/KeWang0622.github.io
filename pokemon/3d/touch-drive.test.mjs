import test from 'node:test';
import assert from 'node:assert/strict';
import { padDirectionAt, combinePadDirections } from './touch-drive.js';

const cross = [
  { action: 'forward', left: 52, right: 100, top: 0, bottom: 48 },
  { action: 'left', left: 0, right: 48, top: 52, bottom: 100 },
  { action: 'right', left: 104, right: 152, top: 52, bottom: 100 },
  { action: 'back', left: 52, right: 100, top: 104, bottom: 152 },
];

test('a captured thumb changes direction as it slides between buttons', () => {
  assert.equal(padDirectionAt(76, 24, cross), 'forward');
  assert.equal(padDirectionAt(24, 76, cross), 'left');
  assert.equal(padDirectionAt(128, 76, cross), 'right');
  assert.equal(padDirectionAt(76, 128, cross), 'back');
});

test('gaps are forgiving, while the empty center and outside stop movement', () => {
  assert.equal(padDirectionAt(76, 52, cross), 'forward');
  assert.equal(padDirectionAt(76, 76, cross), '');
  assert.equal(padDirectionAt(-20, 76, cross), '');
  assert.equal(padDirectionAt(76, 172, cross), '');
});

test('direction hit testing follows responsive button geometry', () => {
  const row = ['left', 'forward', 'back', 'right'].map((action, i) => ({
    action, left: 10 + i * 52, right: 58 + i * 52, top: 440, bottom: 488,
  }));
  assert.equal(padDirectionAt(138, 460, row), 'back');
  assert.equal(padDirectionAt(190, 460, row), 'right');
  assert.equal(padDirectionAt(76, 24, row), '');
});

test('diagonal multi-touch, opposing touches and release preserve remaining input', () => {
  const touches = new Map([[1, 'forward'], [2, 'right']]);
  assert.deepEqual(combinePadDirections(touches.values()), { throttle: 1, turn: -1 });
  touches.set(3, 'back');
  assert.deepEqual(combinePadDirections(touches.values()), { throttle: 0, turn: -1 });
  touches.delete(3);
  touches.delete(2);
  assert.deepEqual(combinePadDirections(touches.values()), { throttle: 1, turn: 0 });
  touches.clear();
  assert.deepEqual(combinePadDirections(touches.values()), { throttle: 0, turn: 0 });
});

test('duplicate fingers do not double movement and an out-of-pad finger is neutral', () => {
  assert.deepEqual(combinePadDirections(['forward', 'forward', '']), { throttle: 1, turn: 0 });
});
