import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from './lib/three.module.js';
import {TRAVEL,angleDelta,footprintClear,turnClear,motionClear} from './navigation.js';
import {createBridgeSurfaces} from './world-surfaces.js';

// Exercise the production input integrator, not a second implementation of it.
// The browser-only scene is omitted; the actual advance function closes over
// the same Three vectors and navigation helpers as it does in world.js.
const source=readFileSync(new URL('./world.js',import.meta.url),'utf8');
const start=source.indexOf('  function advance('),end=source.indexOf('\n  function tick(',start);
assert.ok(start>=0&&end>start,'production movement function can be located');
const advanceSource=source.slice(start,end);
function harness(shape,walkable,{x=0,z=0,yaw=0}={}){
  const trainer={position:new THREE.Vector3(x,0,z),rotation:{y:yaw}};
  const runtime=new Function('THREE','angleDelta','turnClear','motionClear','trainer','travelShape','walkable',
    `let steering=0;${advanceSource};return {advance,get steering(){return steering;}};`)
    (THREE,angleDelta,turnClear,motionClear,trainer,()=>shape,walkable);
  return {...runtime,trainer,advance:runtime.advance};
}

const bridge=createBridgeSurfaces(()=>0,()=>0)[0];
const bridgeWalkable=(x,z,r)=>!bridge.blocks(x,z,r)&&
  (Math.abs(z-bridge.z)>=1.45+r||bridge.supports(x,z,r));

for(const id of ['model-s','cybertruck','porsche']){
  test(`${id}: reversing on the real bridge preserves heading and rail clearance`,()=>{
    const shape=TRAVEL[id],state=harness(shape,bridgeWalkable,{x:bridge.x,z:bridge.z});
    assert.ok(footprintClear(bridge.x,bridge.z,0,shape,bridgeWalkable));
    assert.equal(turnClear(bridge.x,bridge.z,0,Math.PI,shape,bridgeWalkable),false,
      'the deck is not wide enough for a full U-turn');
    const reverse=new THREE.Vector3(0,0,-1);
    for(let i=0;i<12;i++){
      const before=state.trainer.position.clone();state.advance(reverse,.05);
      const {position,rotation}=state.trainer;
      assert.ok(Math.abs(angleDelta(0,rotation.y))<1e-9,'reverse must not first turn toward the railing');
      assert.ok(Math.abs(position.x-bridge.x)<1e-9,'reversing stays on the bridge centreline');
      assert.ok(footprintClear(position.x,position.z,rotation.y,shape,bridgeWalkable),'the entire ride clears the rails');
      const signedDistance=(position.x-before.x)*Math.sin(rotation.y)+(position.z-before.z)*Math.cos(rotation.y);
      assert.ok(signedDistance<0,'actual movement is backward, allowing signed wheel rotation');
    }
    assert.ok(state.trainer.position.z<bridge.z-1,'reverse makes useful progress rather than freezing');
  });
}

test('a queued route cannot move a car sideways through a narrow passage',()=>{
  const shape=TRAVEL['model-s'];
  const corridor=(x,z,r)=>Math.abs(x)+r<1.06;
  const state=harness(shape,corridor),diagonal=new THREE.Vector3(.7,0,1).normalize();
  assert.equal(turnClear(0,0,0,Math.atan2(diagonal.x,diagonal.z),shape,corridor),false);
  for(let i=0;i<50;i++){
    state.advance(diagonal,.02,1,true);
    assert.ok(footprintClear(state.trainer.position.x,state.trainer.position.z,state.trainer.rotation.y,shape,corridor));
  }
  assert.ok(state.trainer.position.length()<1e-9,'a route waits for a safe heading instead of strafing');
});

test('the movement integrator rejects a whole large step across water',()=>{
  const water=(x,z,r)=>Math.abs(z)>1+r;
  for(const id of ['walk','model-s']){
    const shape=TRAVEL[id],state=harness(shape,water,{z:4,yaw:Math.PI});
    assert.ok(footprintClear(0,4,Math.PI,shape,water));
    assert.ok(footprintClear(0,-4,Math.PI,shape,water));
    state.advance(new THREE.Vector3(0,0,-1),3,8);
    assert.equal(state.trainer.position.z,4,`${id} cannot jump from one bank to the other`);
  }
});

test('a pedestrian slides along a wall while the wall still blocks penetration',()=>{
  const wall=(x,z,r)=>x+r<=.6;
  const state=harness(TRAVEL.walk,wall);
  state.advance(new THREE.Vector3(1,0,1).normalize(),.5);
  assert.equal(state.trainer.position.x,0);
  assert.ok(state.trainer.position.z>1,'the tangential part of walking remains responsive');
  assert.ok(footprintClear(state.trainer.position.x,state.trainer.position.z,state.trainer.rotation.y,TRAVEL.walk,wall));
});

test('a waypoint closer than one frame of travel is not overshot',()=>{
  for(const id of ['walk','bicycle','model-s','horse']){
    const state=harness(TRAVEL[id],()=>true);
    state.advance(new THREE.Vector3(0,0,1),.05,.017,true);
    assert.ok(Math.abs(state.trainer.position.z-.017)<1e-12,`${id} stops at the requested waypoint`);
  }
});

const doorStart=source.indexOf('  function updateDoorCrossings('),doorEnd=source.indexOf('\n  function queueDoorTransition(',doorStart);
assert.ok(doorStart>=0&&doorEnd>doorStart,'production door crossing function can be located');
const doorSource=source.slice(doorStart,doorEnd);
function porchCrossings({destination=null,planned=false}){
  const opened=[];
  // These are the production workshop and Pika front-porch coordinates. The
  // actor moves toward the workshop while a longer route can target Pika.
  const trainer={position:new THREE.Vector3(-4,0,7.8)};
  const landmarkState=[
    {place:{id:'mrfoundry'},entry:{x:-4,z:6.3}},
    {place:{id:'pika'},entry:{x:22,z:-14.45}}
  ];
  const update=new Function('trainer','direction','landmarkState','travelShape','queueDoorTransition','path','arrivalId',
    `let activeRoom=null,blockedDoorId=null,roomExitArmed=false,pathIndex=0;${doorSource};return updateDoorCrossings;`)
    (trainer,new THREE.Vector3(0,0,-.03),landmarkState,()=>TRAVEL['model-s'],id=>opened.push(id),planned?[{x:-4,z:7},{x:22,z:-14.45}]:[],destination);
  update(true,1000);return opened;
}

test('a planned trip to Pika does not enter the workshop while passing its porch',()=>{
  assert.deepEqual(porchCrossings({planned:true,destination:'pika'}),[]);
});

test('manually approaching the workshop still opens its door automatically',()=>{
  assert.deepEqual(porchCrossings({planned:false}),['mrfoundry']);
});

test('a planned trip opens the door of its intended destination',()=>{
  assert.deepEqual(porchCrossings({planned:true,destination:'mrfoundry'}),['mrfoundry']);
});

test('a planned scenic walk does not get intercepted by a building porch',()=>{
  assert.deepEqual(porchCrossings({planned:true,destination:null}),[]);
});
