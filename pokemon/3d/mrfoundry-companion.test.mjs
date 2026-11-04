import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import * as THREE from './lib/three.module.js';
import {createMRFoundryCompanion, MRFOUNDRY_MASCOT_URL} from './mrfoundry-companion.js';

test('MRFoundry follower preserves approved texture, aspect, grounded height and color',async()=>{
  const bytes=await readFile(new URL(MRFOUNDRY_MASCOT_URL));
  const width=bytes.readUInt32BE(16),height=bytes.readUInt32BE(20);
  const texture=new THREE.Texture({width,height});
  const model=createMRFoundryCompanion(texture),sprite=model.children[0];
  assert.equal(sprite.material.map,texture);
  assert.equal(sprite.material.toneMapped,false);
  assert.equal(texture.colorSpace,THREE.SRGBColorSpace);
  assert.equal(sprite.scale.x/sprite.scale.y,width/height);
  const bounds=new THREE.Box3().setFromObject(model);
  assert.equal(bounds.min.y,0);
  assert.equal(bounds.max.y,1);
  // Shared source identity is frozen; no independently redrawn or scientific image.
  const canonical=await readFile(new URL('../../assets/img/mri-mascot.png',import.meta.url));
  assert.equal(createHash('sha256').update(canonical).digest('hex'),'38441d0eeaf6ab83d9880368f5e31b7fc5f8be6b575101018b1969f8503332c7');
});
