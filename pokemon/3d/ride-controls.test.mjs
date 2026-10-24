import test from 'node:test';
import assert from 'node:assert/strict';
import {stepRideControl} from './ride-controls.js';
import {TRAVEL} from './navigation.js';

const car = {...TRAVEL['model-s'], id: 'model-s'};
const step = (state, input, shape = car, dt = 1 / 60) => stepRideControl(state, input, shape, dt);
function hold(state, input, seconds, shape = car, hz = 60) {
  let result;
  for (let i = 0; i < Math.round(seconds * hz); i++) result = step(state, input, shape, 1 / hz);
  return result;
}

test('Up/W always moves along the vehicle nose at every heading and in either camera view', () => {
  for (const view of ['first', 'third']) for (const yaw of [0, .7, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const state = {speed: 0};
    const {speed, yawDelta} = hold(state, {throttle: 1}, 1);
    const forward = {x: Math.sin(yaw), z: Math.cos(yaw)};
    const displacement = {x: Math.sin(yaw + yawDelta) * speed, z: Math.cos(yaw + yawDelta) * speed};
    assert.ok(displacement.x * forward.x + displacement.z * forward.z > 0, `${view}, heading ${yaw}: Up must never become reverse`);
    assert.equal(yawDelta, 0);
  }
});

test('Down/S brakes to a full stop before engaging reverse; Up behaves symmetrically', () => {
  const state = {speed: car.speed};
  const first = step(state, {throttle: -1});
  assert.ok(first.speed > 0 && first.speed < car.speed, 'first brake frame still travels forward');
  let sawStop = false;
  for (let i = 0; i < 120; i++) {
    step(state, {throttle: -1});
    if (state.speed === 0) sawStop = true;
    if (state.speed < 0) {assert.ok(sawStop, 'reverse may engage only after a stopped update'); break;}
  }
  assert.ok(state.speed < 0);
  const before = state.speed;
  step(state, {throttle: 1});
  assert.ok(state.speed >= before && state.speed <= 0, 'Up first brakes existing reverse velocity');
  hold(state, {throttle: 1}, 1);
  assert.ok(state.speed > 0);
});

test('speed ramps smoothly, reverse is limited, and releasing input coasts to a stop', () => {
  const state = {speed: 0};
  assert.ok(step(state, {throttle: 1}).speed < car.speed * .05, 'no instant full-speed jump');
  hold(state, {throttle: 1}, 2);
  assert.equal(state.speed, car.speed);
  hold(state, {throttle: -1}, 3);
  assert.equal(state.speed, -car.speed * .45);
  const reverseBefore = state.speed;
  step(state, {});
  assert.ok(state.speed > reverseBefore && state.speed < 0, 'release decelerates without instant stop');
  hold(state, {}, 2);
  assert.equal(state.speed, 0);
});

test('a held brake stops forward and backward motion without engaging either gear', () => {
  for (const initial of [car.speed, -car.speed * .45, 0]) {
    const state = {speed: initial};
    hold(state, {throttle: -1, brake: true}, 2);
    assert.equal(state.speed, 0);
    hold(state, {throttle: 1, brake: true}, 2);
    assert.equal(state.speed, 0);
  }
});

test('each car can engage reverse after braking to a stop', () => {
  for (const id of ['model-s', 'cybertruck', 'porsche']) {
    const shape = {...TRAVEL[id], id};
    const state = {speed: shape.speed};
    hold(state, {throttle: -1}, 3, shape);
    assert.ok(state.speed < 0, `${id} can reverse`);
    assert.equal(state.speed, -shape.speed * .45);
  }
});

test('negative throttle brakes bikes and living mounts without reversing', () => {
  for (const id of ['bicycle', 'horse', 'charizard', 'walk', 'unknown']) {
    const shape = {...(TRAVEL[id] || TRAVEL.walk), id};
    const state = {speed: shape.speed};
    const first = step(state, {throttle: -1}, shape);
    assert.ok(first.speed > 0 && first.speed < shape.speed, `${id} decelerates instead of stopping abruptly`);
    for (let i = 0; i < 180; i++) {
      assert.ok(step(state, {throttle: -1}, shape).speed >= 0, `${id} cannot enter reverse`);
    }
    assert.equal(state.speed, 0);
    hold(state, {throttle: 1}, 1, shape);
    assert.ok(state.speed > 0, `${id} still accelerates forward after braking`);
  }
});

test('noncars discard stale reverse speed and cannot enable reverse through shape overrides', () => {
  for (const id of ['bicycle', 'horse', 'charizard', 'walk', 'unknown']) {
    const shape = {...(TRAVEL[id] || TRAVEL.walk), id, car: true, reverseRatio: 1};
    for (const input of [{}, {throttle: -1}, {throttle: 1}, {brake: true}]) {
      const result = step({speed: -shape.speed}, input, shape);
      assert.ok(result.speed >= 0, `${id} rejects stale negative speed`);
    }
    const state = {speed: 0};
    hold(state, {throttle: -1}, 3, shape);
    assert.equal(state.speed, 0, `${id} cannot opt into reverse with car: true`);
  }
});

test('cars steer their wheels at rest but do not rotate in place', () => {
  for (const id of ['model-s', 'cybertruck', 'porsche']) {
    const state = {speed: 0};
    const result = hold(state, {turn: 1}, 1, {...TRAVEL[id], id});
    assert.equal(result.speed, 0);
    assert.equal(result.yawDelta, 0, `${id} must not spin in place`);
    assert.ok(result.steer > .4, `${id} wheels visibly turn while waiting for throttle`);
  }
});

test('reversing flips the car yaw response while preserving the selected wheel direction', () => {
  const forward = step({speed: 3, steer: .3}, {throttle: 1, turn: 1});
  const reverse = step({speed: -3, steer: .3}, {throttle: -1, turn: 1});
  assert.ok(forward.yawDelta > 0 && reverse.yawDelta < 0);
  assert.equal(forward.steer, reverse.steer);
});

test('a full turn followed by straight acceleration still advances along the nose', () => {
  const state = {speed: 0};
  let yaw = 0;
  for (let i = 0; i < 140; i++) yaw += step(state, {throttle: 1, turn: 1}).yawDelta;
  assert.ok(yaw > Math.PI, 'test covers facing away after turning');
  const forward = {x: Math.sin(yaw), z: Math.cos(yaw)};
  const result = step(state, {throttle: 1, turn: 0});
  const displacement = {x: Math.sin(yaw + result.yawDelta) * result.speed, z: Math.cos(yaw + result.yawDelta) * result.speed};
  assert.ok(displacement.x * forward.x + displacement.z * forward.z > 0);
});

test('bike and living mounts can pivot slowly at a standstill', () => {
  for (const id of ['bicycle', 'horse', 'charizard']) {
    const result = hold({speed: 0}, {turn: 1}, 1, {...TRAVEL[id], id});
    assert.equal(result.speed, 0);
    assert.ok(result.yawDelta > 0 && result.yawDelta < 1 / 60, `${id} permits a slow pivot`);
  }
});

test('continuous forward acceleration is consistent across normal frame rates', () => {
  const speeds = [30, 60, 120].map(hz => hold({speed: 0}, {throttle: 1}, .5, car, hz).speed);
  assert.ok(Math.max(...speeds) - Math.min(...speeds) < 1e-10);
});

test('zero, invalid, and suspended-frame time cannot create invalid state or a large jump', () => {
  const state = {speed: 0};
  assert.deepEqual(step(state, {throttle: 1, turn: 1}, car, 0), {speed: 0, yawDelta: 0, steer: 0});
  assert.equal(step(state, {throttle: 1}, car, Number.NaN).speed, 0);
  const result = step({speed: Number.NaN, steer: Number.NaN}, {throttle: 1, turn: 1}, car, 20);
  assert.ok(result.speed <= car.speed * .11);
  assert.ok(Number.isFinite(result.yawDelta) && Number.isFinite(result.steer));
});
