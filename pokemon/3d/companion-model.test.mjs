import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from './lib/three.module.js';
import {GLTFLoader} from './lib/addons/loaders/GLTFLoader.js';

test('MRI companion has a genuinely open long bore and retains its height and front direction',async()=>{
  const bytes=await readFile(new URL('./assets/companion.glb',import.meta.url));
  const data=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
  const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(data,'',resolve,reject));
  const model=gltf.scene;model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model);
  assert.ok(Math.abs(bounds.getSize(new THREE.Vector3()).y-.8)<1e-5,'the original 0.8m authoring height is retained');
  let meta=null;model.traverse(o=>{if(o.userData.front_axis_gltf)meta=o.userData;});
  assert.equal(meta.front_axis_gltf,'+Z');
  assert.ok(meta.magnet_axial_depth_m/meta.bore_diameter_m>1.8,'magnet depth exceeds 1.8 bore diameters');
  const forward=new THREE.Raycaster(new THREE.Vector3(0,.52,2),new THREE.Vector3(0,0,-1));
  assert.equal(forward.intersectObject(model,true).length,0,'a ray above the table traverses the entire bore without a rear cap');
  const front=new THREE.Raycaster(new THREE.Vector3(.25,.52,2),new THREE.Vector3(0,0,-1)).intersectObject(model,true);
  const rear=new THREE.Raycaster(new THREE.Vector3(.25,.52,-2),new THREE.Vector3(0,0,1)).intersectObject(model,true);
  assert.ok(front.length&&rear.length,'the surrounding magnet remains a solid housing');
  assert.ok(front[0].point.z-rear[0].point.z>.46,'the rendered shell has real axial depth, not a flat ring');
});
