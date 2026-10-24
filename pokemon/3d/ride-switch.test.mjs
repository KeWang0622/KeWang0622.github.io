import {canReverseTravel} from './travel-policy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from './lib/three.module.js';
import {planRideSwitch} from './ride-switch.js';
import {TRAVEL,angleDelta,footprintClear,turnClear,motionClear} from './navigation.js';
import {FLIGHT,findLandingSpot} from './flight.js';

function verify(plan,from,fromShape,toShape,walkable,maxDistance=5){
  assert.ok(plan,'a safe switch plan exists');
  let previous=from;
  for(const step of plan.route){
    assert.ok(turnClear(previous.x,previous.z,previous.yaw,step.yaw,fromShape,walkable),'old ride clears every turn');
    assert.ok(motionClear(previous,step,step.yaw,fromShape,walkable),'old ride clears each entire swept path');
    previous=step;
  }
  assert.ok(Math.hypot(plan.placement.x-from.x,plan.placement.z-from.z)<=maxDistance+1e-9);
  assert.ok(Math.hypot(previous.x-plan.placement.x,previous.z-plan.placement.z)<1e-9,'no teleport after the final waypoint');
  assert.ok(turnClear(previous.x,previous.z,previous.yaw,plan.placement.yaw,fromShape,walkable),'final old-ride turn is clear');
  assert.ok(footprintClear(plan.placement.x,plan.placement.z,plan.placement.yaw,toShape,walkable),'new full-sized ride fits');
}

test('changing rides in open space retains the exact position and heading',()=>{
  const from={x:2,z:-3,yaw:.71};
  for(const toShape of Object.values(TRAVEL)){
    const plan=planRideSwitch(from,{fromShape:TRAVEL.bicycle,toShape,walkable:()=>true});
    assert.deepEqual(plan,{placement:from,route:[],distance:0});
  }
});

test('a safe rotation in place is preferred to unnecessary travel',()=>{
  const free=(x,z,r)=>Math.abs(x)+r<1.4&&Math.abs(z)+r<4;
  const from={x:0,z:0,yaw:Math.PI/2};
  assert.ok(footprintClear(0,0,from.yaw,TRAVEL.bicycle,free));
  assert.equal(footprintClear(0,0,from.yaw,TRAVEL['model-s'],free),false);
  const plan=planRideSwitch(from,{fromShape:TRAVEL.bicycle,toShape:TRAVEL['model-s'],walkable:free});
  verify(plan,from,TRAVEL.bicycle,TRAVEL['model-s'],free);
  assert.equal(plan.route.length,0);assert.equal(plan.distance,0);
  assert.ok(Math.abs(angleDelta(from.yaw,plan.placement.yaw))>.2);
});

for(const id of ['model-s','cybertruck','porsche']){
  test(`bicycle automatically finds nearby room for ${id} beyond a narrow path`,()=>{
    const free=(x,z,r)=>z-r>1.5||(Math.abs(x)+r<.6&&z-r>-2);
    const from={x:0,z:0,yaw:0};
    const plan=planRideSwitch(from,{fromShape:TRAVEL.bicycle,toShape:TRAVEL[id],walkable:free,maxMilliseconds:500});
    verify(plan,from,TRAVEL.bicycle,TRAVEL[id],free);
    assert.ok(plan.route.length>0);assert.ok(plan.placement.z>1.5);
    assert.ok(plan.distance<=5,'parking stays nearby');
  });
}

test('a larger ride never appears across a wall around an enclosed bicycle-sized pocket',()=>{
  const free=(x,z,r)=>
    (Math.abs(x)+r<.8&&Math.abs(z)+r<1.6)||
    Math.abs(x)-r>2||Math.abs(z)-r>2;
  const from={x:0,z:0,yaw:0};
  assert.ok(footprintClear(0,0,0,TRAVEL.bicycle,free));
  assert.ok(footprintClear(4.5,0,0,TRAVEL.cybertruck,free),'a tempting free destination exists across the wall');
  const plan=planRideSwitch(from,{fromShape:TRAVEL.bicycle,toShape:TRAVEL.cybertruck,walkable:free,maxMilliseconds:500});
  assert.equal(plan,null,'unreachable free space cannot be used for a switch');
});

test('water between the current path and open land cannot be skipped by changing rides',()=>{
  const free=(x,z,r)=>(Math.abs(x)+r<.55)||x-r>2;
  const from={x:0,z:0,yaw:0};
  assert.equal(planRideSwitch(from,{fromShape:TRAVEL.bicycle,toShape:TRAVEL['model-s'],walkable:free,maxMilliseconds:500}),null);
});

test('a nearby parking area around a corner uses a real multi-segment route, not a jump',()=>{
  const onLand=(x,z)=>(Math.abs(x)<.6&&z>-2&&z<3.5)||
    Math.hypot(x,z-3)<1.5||(x>1.5&&z>1.5)||(x>0&&x<3&&Math.abs(z-3)<.65);
  const free=(x,z,r=0)=>{
    if(!onLand(x,z))return false;
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12;
      if(!onLand(x+Math.cos(a)*r,z+Math.sin(a)*r))return false;
    }
    return true;
  };
  const from={x:0,z:0,yaw:0};
  const plan=planRideSwitch(from,{fromShape:TRAVEL.bicycle,toShape:TRAVEL.cybertruck,walkable:free,maxMilliseconds:500});
  verify(plan,from,TRAVEL.bicycle,TRAVEL.cybertruck,free);
  assert.ok(plan.route.length>2,'route goes around the corner');
  const directYaw=Math.atan2(plan.placement.x,plan.placement.z);
  assert.equal(motionClear(from,plan.placement,directYaw,TRAVEL.bicycle,free),false,'straight-line travel would cross the blocked ground');
  assert.ok(plan.distance>Math.hypot(plan.placement.x,plan.placement.z),'returned distance includes the actual detour');
});

test('dismounting preserves position even when the larger old footprint is already obstructed',()=>{
  const free=(x,z,r)=>Math.abs(x)+r<.5&&Math.abs(z)+r<.5;
  const from={x:0,z:0,yaw:.8};
  const plan=planRideSwitch(from,{fromShape:TRAVEL.cybertruck,toShape:TRAVEL.walk,walkable:free});
  assert.deepEqual(plan,{placement:from,route:[],distance:0});
});

test('world bounds and distance limits still apply when the supplied ground is entirely open',()=>{
  const from={x:9.3,z:0,yaw:0};
  const plan=planRideSwitch(from,{fromShape:TRAVEL.bicycle,toShape:TRAVEL.cybertruck,walkable:()=>true,limit:10,maxMilliseconds:500});
  assert.ok(plan);
  assert.ok(footprintClear(plan.placement.x,plan.placement.z,plan.placement.yaw,TRAVEL.cybertruck,
    (x,z,r)=>Math.abs(x)+r<=10&&Math.abs(z)+r<=10));
  assert.ok(plan.placement.x<from.x,'move inward rather than spawning outside the world');
  assert.equal(planRideSwitch(from,{fromShape:TRAVEL.bicycle,toShape:TRAVEL.cybertruck,walkable:()=>true,limit:10,maxDistance:0}),null);
});

// Execute the production switching functions and movement integrator together;
// no second implementation can hide an early vehicle swap or stale request.
const worldSource=readFileSync(new URL('./world.js',import.meta.url),'utf8');
const travelStart=worldSource.indexOf('  function requestFlightLanding(');
const travelEnd=worldSource.indexOf("  document.addEventListener('world:travel-select'",travelStart);
const clearStart=worldSource.indexOf('  function clearMovement(');
const clearEnd=worldSource.indexOf('\n  function showExterior(',clearStart);
const advanceStart=worldSource.indexOf('  function advance(');
const advanceEnd=worldSource.indexOf('\n  function advanceRide(',advanceStart);
assert.ok(travelStart>=0&&travelEnd>travelStart&&clearEnd>clearStart&&advanceEnd>advanceStart);
function productionSwitchHarness(walkable,{id='bicycle',x=0,z=0,yaw=0}={}){
  const trainer={position:new THREE.Vector3(x,0,z),rotation:{y:yaw}};
  const build=new Function('THREE','TRAVEL','angleDelta','footprintClear','turnClear','motionClear','planRideSwitch','FLIGHT','findLandingSpot','walkable','trainer','initialId','canReverseTravel',`
    let selectedTravel=initialId,ridePending=null,flightPending=null,flightLanding=false,firstMoveYaw=null;
    let activeRoom=null,viewMode='third',flightCruise=6.5,firstLookYaw=0,firstLookPitch=0,doorCooldownUntil=0;
    let steering=0,flightLift=0,reverseHeld=false,navigationRevision=0,path=[],pathIndex=0,arrivalId=null,arrivalAction=null;
    const delta=new THREE.Vector3(),rideControl={speed:0,steer:0},touchDrive={throttle:0,turn:0},keys=new Set(),footprints=[];
    const destinationMarker={visible:false},WORLD_LIMIT=64,groundForWalk=()=>0,flightCeiling=()=>-Infinity,landingCeiling=()=>-Infinity;
    const travelShape=()=>TRAVEL[selectedTravel],flying=()=>selectedTravel==='charizard';
    const statuses=[],announcements=[];
    const document={dispatchEvent(event){if(event.type==='world:travel-status')statuses.push(event.detail);}};
    class CustomEvent{constructor(type,{detail=null}={}){this.type=type;this.detail=detail;}}
    const ui={announce(message){announcements.push(message);}},canvas={focus(){}},leaveOverview=()=>{};
    const updateTravelVisual=()=>{},resetCompanionTrail=()=>{};
    ${worldSource.slice(travelStart,travelEnd)}
    ${worldSource.slice(clearStart,clearEnd)}
    ${worldSource.slice(advanceStart,advanceEnd)}
    return {setTravel,advanceRideSwitch,cancelRideSwitch,clearMovement,trainer,statuses,announcements,
      get selectedTravel(){return selectedTravel;},get pending(){return ridePending;},
      get flightPending(){return flightPending;},get flightLanding(){return flightLanding;},
      get route(){return path;},get doorCooldownUntil(){return doorCooldownUntil;}};
  `);
  return build(THREE,TRAVEL,angleDelta,footprintClear,turnClear,motionClear,planRideSwitch,FLIGHT,findLandingSpot,walkable,trainer,id,canReverseTravel);
}

test('production switching drives the old bicycle to safe parking before showing Cybertruck',()=>{
  const free=(x,z,r)=>z-r>1.5||(Math.abs(x)+r<.6&&z-r>-2);
  const runtime=productionSwitchHarness(free);
  runtime.setTravel('cybertruck');
  assert.equal(runtime.selectedTravel,'bicycle');assert.equal(runtime.pending.id,'cybertruck');
  assert.ok(runtime.statuses.some(status=>status.id==='cybertruck'));
  for(let frame=0;frame<300&&runtime.pending;frame++){
    const before=runtime.trainer.position.clone();
    runtime.advanceRideSwitch(.05);
    assert.ok(runtime.trainer.position.distanceTo(before)<=TRAVEL.bicycle.speed*.65*.05+1e-9,'no teleport when a route starts or finishes');
    const shape=TRAVEL[runtime.selectedTravel];
    assert.ok(footprintClear(runtime.trainer.position.x,runtime.trainer.position.z,runtime.trainer.rotation.y,shape,free));
  }
  assert.equal(runtime.selectedTravel,'cybertruck');assert.equal(runtime.pending,null);
  assert.ok(runtime.doorCooldownUntil>performance.now(),'a completed switch cannot immediately pull the ride through a nearby door');
  assert.equal(runtime.statuses.at(-1).id,null);assert.match(runtime.statuses.at(-1).message,/Ready/);
});

test('selecting the current ride cancels pending parking and prevents delayed changes',()=>{
  const free=(x,z,r)=>z-r>1.5||(Math.abs(x)+r<.6&&z-r>-2);
  const runtime=productionSwitchHarness(free);
  runtime.setTravel('model-s');runtime.advanceRideSwitch(.05);
  assert.ok(runtime.pending);
  runtime.setTravel('bicycle');const stopped=runtime.trainer.position.clone();
  for(let frame=0;frame<300;frame++)runtime.advanceRideSwitch(.05);
  assert.equal(runtime.pending,null);assert.equal(runtime.selectedTravel,'bicycle');
  assert.ok(runtime.trainer.position.equals(stopped));
  assert.deepEqual(runtime.statuses.at(-1),{id:null,message:''});
});

test('a new ride request replaces pending parking rather than applying an old choice afterward',()=>{
  const free=(x,z,r)=>z-r>1.5||(Math.abs(x)+r<.6&&z-r>-2);
  const runtime=productionSwitchHarness(free);
  runtime.setTravel('model-s');runtime.advanceRideSwitch(.05);
  runtime.setTravel('porsche');
  assert.equal(runtime.pending.id,'porsche');
  for(let frame=0;frame<300&&runtime.pending;frame++)runtime.advanceRideSwitch(.05);
  assert.equal(runtime.selectedTravel,'porsche');assert.equal(runtime.pending,null);
});

test('production cancellation clears a pending flight-to-vehicle request and its status',()=>{
  const runtime=productionSwitchHarness(()=>true,{id:'charizard'});
  runtime.setTravel('cybertruck');
  assert.equal(runtime.flightPending.travel,'cybertruck');assert.equal(runtime.selectedTravel,'charizard');
  runtime.cancelRideSwitch();
  assert.equal(runtime.flightPending,null);assert.equal(runtime.flightLanding,false);
  assert.equal(runtime.selectedTravel,'charizard');
  assert.deepEqual(runtime.statuses.at(-1),{id:null,message:''});
  runtime.setTravel('horse');assert.equal(runtime.flightPending.travel,'horse');
  runtime.setTravel('charizard');
  assert.equal(runtime.flightPending,null);assert.deepEqual(runtime.route,[]);
});

test('a failed new flight-to-vehicle request cannot silently complete an earlier ride choice',()=>{
  // The folded dragon and horse fit this east-west clearing, but a truck with
  // its current north-south heading is too long to land anywhere in it.
  const free=(x,z,r)=>Math.abs(z)+r<2.3;
  const runtime=productionSwitchHarness(free,{id:'charizard'});
  runtime.setTravel('horse');assert.equal(runtime.flightPending.travel,'horse');
  runtime.setTravel('cybertruck');
  assert.equal(runtime.flightPending,null,'failed replacement cancels the old landing action');
  assert.equal(runtime.flightLanding,false);assert.equal(runtime.selectedTravel,'charizard');
  assert.deepEqual(runtime.route,[],'old flight path does not keep executing invisibly');
  assert.match(runtime.statuses.at(-1).message,/No clear landing/);
});

test('blocked production parking times out without changing rides or teleporting',()=>{
  let blocked=false;
  const free=(x,z,r)=>!blocked&&(z-r>1.5||(Math.abs(x)+r<.6&&z-r>-2));
  const runtime=productionSwitchHarness(free);
  runtime.setTravel('cybertruck');assert.ok(runtime.pending);blocked=true;
  const position=runtime.trainer.position.clone();
  for(let frame=0;frame<301;frame++)runtime.advanceRideSwitch(.05);
  assert.equal(runtime.pending,null);assert.equal(runtime.selectedTravel,'bicycle');
  assert.ok(runtime.trainer.position.equals(position));
  assert.match(runtime.statuses.at(-1).message,/path is tight/);
});
