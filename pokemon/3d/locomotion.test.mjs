import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from './lib/three.module.js';
import {TRAVEL,angleDelta,footprintClear,turnClear,motionClear} from './navigation.js';
import {createBridgeSurfaces} from './world-surfaces.js';
import {stepRideControl} from './ride-controls.js';

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

// Run the actual mounted movement and keyboard dispatch together. Camera and
// projection APIs are deliberately absent: mounted keys must never be routed
// back through screenGroundDirection after the character or camera turns.
const rideStart=source.indexOf('  function advanceRide('),rideEnd=source.indexOf('\n  function advanceFlightRoute(',rideStart);
const inputStart=source.indexOf("      const sx=Number(keys.has('d')",rideEnd);
const inputEnd=source.indexOf('\n      if(!flying())trainer.position.y=',inputStart);
assert.ok(rideStart>=0&&rideEnd>rideStart&&inputStart>rideEnd&&inputEnd>inputStart,'production mounted movement and input dispatch can be located');
const rideSource=source.slice(rideStart,rideEnd),inputSource=source.slice(inputStart,inputEnd);
function rideHarness(id,walkable,{x=0,z=0,yaw=0,speed=0,steer=0}={}){
  const trainer={position:new THREE.Vector3(x,0,z),rotation:{y:yaw}};
  const rideControl={speed,steer};
  const runtime=new Function('THREE','stepRideControl','turnClear','motionClear','trainer','rideControl','selectedTravel','travelShape','walkable',
    `let steering=0,reverseHeld=false,keys=new Set();const flying=()=>false;${rideSource};
    function frame(inputKeys,viewMode='third',dt=.05,controls={}){
      keys=new Set(inputKeys);reverseHeld=controls.reverseHeld||false;
      const touchDrive=controls.touchDrive||{throttle:0,turn:0},direction=new THREE.Vector3(),activeRoom=null,path=[],pathIndex=0;
      let manualInput=false,flightLanding=false,flightLift=0,flightCruise=6.5;
      ${inputSource}
    }
    return {advanceRide,frame,get steering(){return steering;}};`)
    (THREE,stepRideControl,turnClear,motionClear,trainer,rideControl,id,()=>TRAVEL[id],walkable);
  return {trainer,rideControl,advanceRide:runtime.advanceRide,frame:runtime.frame,get steering(){return runtime.steering;}};
}

for(const id of ['model-s','cybertruck','porsche']){
  test(`${id}: production Up dispatch remains forward at every heading in first and third person`,()=>{
    for(const view of ['first','third'])for(const yaw of [0,.7,Math.PI/2,Math.PI,Math.PI*1.5]){
      const state=rideHarness(id,()=>true,{yaw}),nose=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
      for(let i=0;i<20;i++)state.frame(['arrowup'],view);
      assert.ok(state.trainer.position.dot(nose)>1,`${view}, yaw ${yaw}: Up advances along the vehicle nose`);
      assert.ok(Math.abs(angleDelta(yaw,state.trainer.rotation.y))<1e-12,'accelerating never chooses a heading from the camera');
    }
  });

  test(`${id}: production steering turns the car only when its wheels are moving`,()=>{
    const state=rideHarness(id,()=>true);
    for(let i=0;i<10;i++)state.frame(['a']);
    assert.equal(state.trainer.rotation.y,0,'holding A at rest may turn wheels but cannot spin the car');
    assert.equal(state.trainer.position.length(),0);
    assert.ok(state.steering>.4,'steering wheels respond while stopped');
    for(let i=0;i<10;i++)state.frame(['w','a']);
    assert.ok(state.trainer.rotation.y>0&&state.trainer.position.length()>.5,'forward-left turns are responsive');
    const reverse=rideHarness(id,()=>true,{speed:-TRAVEL[id].speed*.4,steer:.4});
    reverse.frame(['s','a']);
    assert.ok(reverse.trainer.rotation.y<0,'the same wheel angle yaws in the opposite direction in reverse');
  });

  test(`${id}: production Down reverses along the real bridge without crossing a rail`,()=>{
    const shape=TRAVEL[id],state=rideHarness(id,bridgeWalkable,{x:bridge.x,z:bridge.z});
    for(let i=0;i<24;i++){
      const before=state.trainer.position.clone();
      state.frame(['arrowdown']);
      assert.ok(state.trainer.position.z<before.z,'reverse continues to make progress');
      assert.equal(state.trainer.rotation.y,0);
      assert.ok(Math.abs(state.trainer.position.x-bridge.x)<1e-12);
      assert.ok(footprintClear(state.trainer.position.x,state.trainer.position.z,0,shape,bridgeWalkable),'full collision footprint remains inside the bridge');
    }
    assert.ok(state.trainer.position.z<bridge.z-2,'reverse clears a meaningful section of the bridge');
  });
}

test('after an actual half turn, releasing steering and pressing Up still moves forward',()=>{
  const state=rideHarness('model-s',()=>true);
  for(let i=0;i<160&&state.trainer.rotation.y<Math.PI;i++)state.frame(['w','a']);
  assert.ok(state.trainer.rotation.y>=Math.PI,'the production controls complete the half turn');
  const previous=state.trainer.position.clone(),yaw=state.trainer.rotation.y;
  state.frame(['arrowup']);
  const displacement=state.trainer.position.clone().sub(previous);
  assert.ok(displacement.dot(new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)))>0,'Up cannot become reverse after turning away from the original camera');
  const speed=state.rideControl.speed;
  state.frame([]);
  assert.ok(state.rideControl.speed>0&&state.rideControl.speed<speed,'releasing keys continues smooth coasting through the actual tick branch');
});

test('production reverse retains the prior heading when a steered rear corner would collide',()=>{
  const shape=TRAVEL['model-s'],corner={x:.22,z:-2.44},dt=.05;
  const free=(x,z,r)=>Math.hypot(x-corner.x,z-corner.z)>r+.06;
  const speed=-shape.speed*.45,control=stepRideControl({speed,steer:.48},{throttle:-1,turn:1},{...shape,id:'model-s'},dt);
  const steered={x:Math.sin(control.yawDelta)*control.speed*dt,z:Math.cos(control.yawDelta)*control.speed*dt};
  assert.ok(turnClear(0,0,0,control.yawDelta,shape,free),'the proposed rotation is clear');
  assert.equal(motionClear({x:0,z:0},steered,control.yawDelta,shape,free),false,'translation at the new angle would trap the rear corner');
  assert.ok(motionClear({x:0,z:0},{x:0,z:speed*dt},0,shape,free),'a straight backward escape exists');
  const state=rideHarness('model-s',free,{speed,steer:.48});
  state.frame(['s','a'],'third',dt);
  assert.equal(state.trainer.rotation.y,0,'do not keep the trapping rotation');
  assert.ok(Math.abs(state.trainer.position.z-speed*dt)<1e-12,'take the clear straight reverse escape');
  assert.equal(state.trainer.position.x,0);
  assert.ok(footprintClear(0,state.trainer.position.z,0,shape,free));
});

test('production collision cancels stored velocity and Down can immediately back away',()=>{
  const shape=TRAVEL.cybertruck,wall=(x,z,r)=>z+r<3;
  const state=rideHarness('cybertruck',wall,{speed:shape.speed});
  assert.ok(footprintClear(0,0,0,shape,wall));
  let stopped=false;
  for(let i=0;i<20;i++){
    const before=state.trainer.position.clone();state.frame(['w']);
    assert.ok(footprintClear(state.trainer.position.x,state.trainer.position.z,state.trainer.rotation.y,shape,wall));
    if(state.trainer.position.distanceTo(before)<1e-12){stopped=true;assert.equal(state.rideControl.speed,0,'blocked motion cannot retain virtual forward momentum');break;}
  }
  assert.ok(stopped,'the forward motion reaches the wall');
  const before=state.trainer.position.clone();state.frame(['s']);
  assert.ok(state.trainer.position.z<before.z,'reverse responds immediately after a blocked forward step');
  assert.ok(state.rideControl.speed<0);
});

test('Space brakes through production mounted dispatch and never reverses the vehicle',()=>{
  const state=rideHarness('porsche',()=>true,{speed:TRAVEL.porsche.speed});
  for(let i=0;i<30;i++)state.frame(['s',' ']);
  assert.equal(state.rideControl.speed,0,'brake takes priority over Down');
  const stopped=state.trainer.position.clone();
  for(let i=0;i<10;i++)state.frame([' ']);
  assert.equal(state.trainer.position.distanceTo(stopped),0);
});

test('R straight reverse clears prior steering and behaves like the held reverse UI control',()=>{
  const yaw=.8,keyboard=rideHarness('cybertruck',()=>true,{yaw,steer:.48});
  const button=rideHarness('cybertruck',()=>true,{yaw,steer:.48});
  for(let i=0;i<12;i++){
    keyboard.frame(['r','a']);
    button.frame([],'third',.05,{reverseHeld:true});
    assert.equal(keyboard.trainer.rotation.y,yaw,'prior steering cannot bend the explicit straight-back command');
  }
  assert.ok(keyboard.trainer.position.dot(new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)))<-.5);
  assert.ok(keyboard.trainer.position.distanceTo(button.trainer.position)<1e-12);
});

test('touch throttle and steering use the same mounted motion as keyboard input',()=>{
  const keyboard=rideHarness('model-s',()=>true,{yaw:2.7});
  const touch=rideHarness('model-s',()=>true,{yaw:2.7});
  for(let i=0;i<20;i++){
    keyboard.frame(['w','d'],'first');
    touch.frame([],'third',.05,{touchDrive:{throttle:1,turn:-1}});
  }
  assert.ok(keyboard.trainer.position.distanceTo(touch.trainer.position)<1e-12);
  assert.equal(keyboard.trainer.rotation.y,touch.trainer.rotation.y);
});

for(const id of ['model-s','cybertruck','porsche']){
  test(`${id}: rearward input reverses on an open road without beginning a U-turn`,()=>{
    const shape=TRAVEL[id],state=harness(shape,()=>true,{yaw:.41});
    const reverse=new THREE.Vector3(-Math.sin(.41),0,-Math.cos(.41));
    for(let i=0;i<12;i++)state.advance(reverse,.05);
    assert.ok(Math.abs(angleDelta(.41,state.trainer.rotation.y))<1e-9,'room for a U-turn does not change reverse behavior');
    assert.ok(state.trainer.position.dot(new THREE.Vector3(Math.sin(.41),0,Math.cos(.41)))<-1,'reverse makes useful progress');
  });

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

test('a rear-diagonal input backs away from a rail when steering is blocked',()=>{
  const shape=TRAVEL.cybertruck,x=bridge.x+.40,state=harness(shape,bridgeWalkable,{x,z:0});
  assert.ok(footprintClear(x,0,0,shape,bridgeWalkable));
  assert.equal(turnClear(x,0,0,-shape.turn*.05,shape,bridgeWalkable),false,'rear-right corner would hit the rail during a left turn');
  const rearDiagonal=new THREE.Vector3(1,0,-1).normalize();
  for(let i=0;i<6;i++){
    state.advance(rearDiagonal,.05);
    assert.ok(footprintClear(state.trainer.position.x,state.trainer.position.z,state.trainer.rotation.y,shape,bridgeWalkable));
    assert.ok(Math.abs(state.trainer.rotation.y)<1e-9,'blocked steering cannot prevent straight backing');
  }
  assert.ok(state.trainer.position.z<-.7,'a135-degree input escapes instead of waiting for a full turn');
  assert.ok(Math.abs(state.trainer.position.x-x)<1e-9);
});

test('reverse restores the old heading when a new angle would trap the rear corner',()=>{
  const shape=TRAVEL['model-s'],corner={x:.40,z:-2.44};
  const free=(x,z,r)=>Math.hypot(x-corner.x,z-corner.z)>r+.06;
  const dt=.05,requestedYaw=-shape.turn*dt,distance=shape.speed*dt*.55;
  assert.ok(turnClear(0,0,0,requestedYaw,shape,free),'rotation itself is physically clear');
  assert.equal(motionClear({x:0,z:0},{x:-Math.sin(requestedYaw)*distance,z:-Math.cos(requestedYaw)*distance},requestedYaw,shape,free),false,'the rotated rear corner hits the obstacle when backing');
  assert.ok(motionClear({x:0,z:0},{x:0,z:-distance},0,shape,free),'the original straight backward escape is clear');
  const state=harness(shape,free);
  state.advance(new THREE.Vector3(),dt,Infinity,false,{throttle:-1,turn:-1});
  assert.ok(Math.abs(state.trainer.rotation.y)<1e-9,'failed steered reverse does not leave the car at the trapping angle');
  assert.ok(Math.abs(state.trainer.position.z+distance)<1e-9,'the clear backward escape is taken');
  assert.ok(footprintClear(state.trainer.position.x,state.trainer.position.z,0,shape,free));
});

test('the explicit back-up command works without a world vector and still sweeps obstacles',()=>{
  const shape=TRAVEL.cybertruck,yaw=.72,state=harness(shape,()=>true,{yaw});
  state.advance(new THREE.Vector3(),.05,Infinity,false,{forceReverse:true});
  assert.equal(state.trainer.rotation.y,yaw);
  assert.ok(state.trainer.position.dot(new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)))<0);
  const water=(x,z,r)=>Math.abs(z)>1+r,blocked=harness(shape,water,{z:4});
  blocked.advance(new THREE.Vector3(),4,Infinity,false,{forceReverse:true});
  assert.equal(blocked.trainer.position.z,4,'explicit reverse does not override water collision');
});

test('relative controls turn in place and walk backward without flipping the view',()=>{
  for(const id of ['walk','model-s']){
    const shape=TRAVEL[id],state=harness(shape,()=>true);
    state.advance(new THREE.Vector3(),.05,Infinity,false,{throttle:0,turn:1});
    const yaw=state.trainer.rotation.y;
    assert.ok(yaw>0,'steering-only input changes orientation');
    assert.ok(state.trainer.position.length()<1e-12,'steering-only input does not translate');
    state.advance(new THREE.Vector3(),.05,Infinity,false,{throttle:-1,turn:0});
    assert.equal(state.trainer.rotation.y,yaw,'backing preserves the current facing');
    assert.ok(state.trainer.position.dot(new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)))<0);
  }
  const state=harness(TRAVEL.cybertruck,bridgeWalkable,{x:bridge.x+.4});
  state.advance(new THREE.Vector3(),.05,Infinity,false,{throttle:0,turn:-1});
  assert.equal(state.trainer.rotation.y,0,'steering-only input cannot rotate through the railing');
});

test('a queued route remains forward-driven even if its next point is behind the car',()=>{
  const state=harness(TRAVEL['model-s'],()=>true);
  state.advance(new THREE.Vector3(0,0,-1),.05,10,true,{forceReverse:true,throttle:-1});
  assert.ok(state.trainer.rotation.y>0,'route starts its validated forward turn');
  assert.ok(state.trainer.position.length()<1e-12,'route waits for the intended heading rather than auto-reversing');
});

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
function porchCrossings({destination=null,planned=false,selectedTravel='model-s'}){
  const opened=[];
  // These are the production workshop and Pika front-porch coordinates. The
  // actor moves toward the workshop while a longer route can target Pika.
  const trainer={position:new THREE.Vector3(-4,0,7.8)};
  const landmarkState=[
    {place:{id:'mrfoundry'},entry:{x:-4,z:6.3}},
    {place:{id:'pika'},entry:{x:22,z:-14.45}}
  ];
  const update=new Function('trainer','direction','landmarkState','travelShape','queueDoorTransition','path','arrivalId','selectedTravel',
    `let activeRoom=null,blockedDoorId=null,roomExitArmed=false,pathIndex=0;${doorSource};return updateDoorCrossings;`)
    (trainer,new THREE.Vector3(0,0,-.03),landmarkState,()=>TRAVEL[selectedTravel],id=>opened.push(id),planned?[{x:-4,z:7},{x:22,z:-14.45}]:[],destination,selectedTravel);
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

test('Charizard flying over a porch cannot accidentally enter its building',()=>{
  assert.deepEqual(porchCrossings({planned:false,selectedTravel:'charizard'}),[]);
  assert.deepEqual(porchCrossings({planned:true,destination:'mrfoundry',selectedTravel:'charizard'}),[]);
});
