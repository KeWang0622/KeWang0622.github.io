import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseRenderProfile } from './mobile-rendering.js';

test('a retina phone retains the same render budget after rotation', () => {
  const portrait = chooseRenderProfile({ width: 390, height: 844, pixelRatio: 3, coarsePointer: true });
  const landscape = chooseRenderProfile({ width: 844, height: 390, pixelRatio: 3, coarsePointer: true });
  assert.deepEqual(portrait, landscape);
  assert.equal(portrait.pixelRatio, 1.25);
  assert.equal(portrait.shadowMapSize, 1024);
  assert.equal(portrait.useComposer, false);
  assert.equal(portrait.samples, 0);
});

test('large phones in landscape do not accidentally enter the desktop profile', () => {
  const phone = chooseRenderProfile({ width: 956, height: 440, pixelRatio: 3, coarsePointer: true });
  assert.equal(phone.name, 'mobile');
  assert.equal(phone.bloomEnabled, false);
});

test('full-size tablets and touch laptops preserve the desktop artwork', () => {
  for (const [width, height] of [[768, 1024], [1024, 768], [1280, 800]]) {
    const profile = chooseRenderProfile({ width, height, pixelRatio: 2, coarsePointer: true });
    assert.equal(profile.name, 'desktop');
    assert.equal(profile.pixelRatio, 1.5);
    assert.equal(profile.samples, 4);
    assert.equal(profile.shadowMapSize, 2048);
    assert.equal(profile.bloomEnabled, true);
    assert.equal(profile.useComposer, true);
  }
});

test('a short mouse-driven desktop window is not mistaken for a phone', () => {
  const profile = chooseRenderProfile({ width: 1200, height: 390, pixelRatio: 1, coarsePointer: false });
  assert.equal(profile.name, 'desktop');
  assert.equal(profile.pixelRatio, 1);
});

test('compact windows get a bounded budget without coarse-pointer detection', () => {
  const profile = chooseRenderProfile({ width: 390, height: 844, pixelRatio: 2, coarsePointer: false });
  assert.equal(profile.name, 'mobile');
  assert.equal(profile.antialias, true);
});

test('invalid or unavailable display values cannot allocate invalid GPU buffers', () => {
  for (const value of [NaN, Infinity, -1, 0, undefined]) {
    const profile = chooseRenderProfile({ width: value, height: value, pixelRatio: value });
    assert.equal(profile.pixelRatio, 1);
    assert.equal(profile.name, 'desktop');
    assert.ok(Object.isFrozen(profile));
  }
});
