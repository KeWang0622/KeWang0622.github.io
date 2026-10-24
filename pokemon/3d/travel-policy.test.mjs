import test from 'node:test';
import assert from 'node:assert/strict';
import {canReverseTravel} from './travel-policy.js';

test('reverse is available only for the three cars', () => {
  for (const id of ['model-s', 'cybertruck', 'porsche']) {
    assert.equal(canReverseTravel(id), true, `${id} has reverse gear`);
  }
  for (const id of ['walk', 'bicycle', 'horse', 'charizard', 'unknown', '', undefined, null]) {
    assert.equal(canReverseTravel(id), false, `${id} cannot reverse`);
  }
});
