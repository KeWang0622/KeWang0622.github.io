import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from './lib/three.module.js';
import {createCharizardModel} from './charizard-model.js';

test('Charizard beats both wings while hovering and keeps the saddle and world pose fixed',()=>{
  const model=createCharizardModel();
  try{
    model.group.position.set(4,8,-3);model.group.rotation.set(.08,.7,-.12);
    const position=model.group.position.clone(),rotation=model.group.quaternion.clone(),seat=model.seat.clone();
    const left=model.group.getObjectByName('charizard-left-wing'),right=model.group.getObjectByName('charizard-right-wing');
    model.update(0,{time:0,speed:0,airborne:1});const initial=left.rotation.z;
    model.update(.2,{time:.2,speed:0,airborne:1});
    assert.ok(Math.abs(left.rotation.z-initial)>.5,'idle flight has a visible power stroke');
    assert.ok(Math.abs(left.rotation.z+right.rotation.z)<1e-10,'the wing pair beats symmetrically');
    assert.ok(Math.abs(left.getObjectByName('charizard-wing-wrist').rotation.z)>.05,'the outer wing follows the shoulder');
    assert.ok(model.group.position.equals(position));
    assert.ok(model.group.quaternion.equals(rotation));
    assert.ok(model.seat.equals(seat));
    assert.equal(model.group.getObjectByName('charizard-body').position.y,0,'saddle does not bounce independently of rider');
  }finally{model.dispose();}
});

test('flight tucks the feet and maintains a finite broad wingspan over a complete hover cycle',()=>{
  const model=createCharizardModel();
  try{
    let span=0;
    for(let frame=0;frame<=48;frame++){
      model.update(1/60,{time:frame/60,speed:0,airborne:1,bank:.2});
      model.group.updateMatrixWorld(true);
      const box=new THREE.Box3().setFromObject(model.group);
      assert.ok([...box.min.toArray(),...box.max.toArray()].every(Number.isFinite));
      span=Math.max(span,box.max.x-box.min.x);
      assert.ok(model.group.getObjectByName('charizard-left-leg').rotation.x>1,'legs remain tucked instead of walking');
    }
    assert.ok(span>5.5&&span<=model.flight.wingspan,'broad visual envelope is declared separately from the body');
    assert.ok(model.flight.bodyWidth<model.flight.wingspan/2);
  }finally{model.dispose();}
});

test('landing folds the wings back without changing the geometry scale',()=>{
  const model=createCharizardModel();
  try{
    model.update(0,{time:.2,airborne:0});model.group.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(model.group);
    assert.ok(box.max.x-box.min.x<2.1,'folded wings stay close to the body on landing');
    assert.equal(model.group.getObjectByName('charizard-left-leg').rotation.x,0,'feet extend to meet the ground');
    assert.ok(model.group.getObjectByName('charizard-left-wing').scale.equals(new THREE.Vector3(1,1,1)));
  }finally{model.dispose();}
});
