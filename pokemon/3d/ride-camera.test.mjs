import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './lib/three.module.js';
import {firstPersonPose} from './ride-camera.js';
import {createTravelModel} from './travel-models.js';

test('first person follows facing and the real saddle transform while keeping a level horizon',()=>{
  const trainer=new THREE.Group(),group=new THREE.Group();trainer.add(group);
  trainer.position.set(4,.6,-8);trainer.rotation.y=-.7;
  group.position.y=.13;group.rotation.x=.19;
  const mount={group,camera:{eye:new THREE.Vector3(0,2.3,-.2)}};
  trainer.updateMatrixWorld(true);
  const eye=new THREE.Vector3(),look=new THREE.Vector3();
  firstPersonPose({trainer,mount,lookPitch:0},eye,look);
  const expected=mount.camera.eye.clone().applyMatrix4(group.matrixWorld);
  assert.ok(eye.distanceTo(expected)<1e-10,'eye is attached to the tilted mount');
  const forward=look.sub(eye);
  assert.ok(Math.abs(forward.y)<1e-10,'ramps do not tilt or bob the horizon');
  assert.ok(Math.abs(Math.atan2(forward.x,forward.z)-trainer.rotation.y)<1e-10);
});

test('looking around does not change the movement heading or the eye anchor',()=>{
  const trainer=new THREE.Group();trainer.rotation.y=.5;trainer.updateMatrixWorld(true);
  const eye=new THREE.Vector3(),look=new THREE.Vector3();
  firstPersonPose({trainer,lookYaw:-.8,lookPitch:.2},eye,look);
  assert.equal(trainer.rotation.y,.5);
  const direction=look.sub(eye);
  assert.ok(Math.abs(Math.atan2(direction.x,direction.z)+.3)<1e-10);
  assert.ok(Math.abs(direction.y-Math.sin(.2))<1e-10);
});

test('every mounted first-person view has an unobstructed central sightline',()=>{
  for(const id of ['bicycle','horse','charizard','model-s','cybertruck','porsche']){
    const mount=createTravelModel(id);
    try{
      mount.setFirstPerson(true);mount.group.updateMatrixWorld(true);
      const opaque=[];mount.group.traverseVisible(node=>{
        if(node.isMesh&&!node.material.transparent)opaque.push(node);
      });
      const forward=new THREE.Vector3(0,-Math.sin(.1),Math.cos(.1));
      const ray=new THREE.Raycaster(mount.camera.eye,forward,.045,3);
      assert.equal(ray.intersectObjects(opaque,false).length,0,`${id}: the rider must see the road over the mount/cockpit`);
    }finally{mount.dispose();}
  }
});
