import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlightEnvelope,stepFlight,findLandingSpot,flightDeployment,FLIGHT} from './flight.js';
import {TRAVEL,footprintClear} from './navigation.js';
const ground=()=>0;
test('spread wings clear a roof before horizontal flight can enter it',()=>{
  const ceiling=createFlightEnvelope([{minX:1,maxX:4,minZ:-2,maxZ:2,top:8}]);
  let p={x:-4,y:6.5,z:0};
  for(let i=0;i<80;i++){
    const q=stepFlight(p,{x:p.x+.2,z:0},{dt:.05,ground,ceiling});
    if(q.x!==p.x&&ceiling(q.x,q.z)>0)assert.ok(q.y>=9-.02);
    p=q;
  }
  assert.ok(p.x>5,'flies across the roof once safely above it');
});
test('flight crosses a river without requiring a ground bridge',()=>{
  let p={x:0,y:7,z:4};const ceiling=()=>-Infinity;
  for(let i=0;i<45;i++)p=stepFlight(p,{x:0,z:p.z-.2},{dt:.05,ground,ceiling});
  assert.ok(p.z<-4);assert.ok(p.y>=FLIGHT.minCruise);
});
test('descent never goes through tree canopy and world bounds contain full wingspan',()=>{
  const ceiling=createFlightEnvelope([{minX:55,maxX:60,minZ:-3,maxZ:3,top:12}]);
  let p={x:55,y:20,z:0};for(let i=0;i<200;i++)p=stepFlight(p,{x:p.x+.3,z:0},{dt:.05,ground,ceiling,cruise:2});
  assert.ok(p.x<=64-FLIGHT.radius);assert.ok(p.y>=13-.02);
});
test('landing seeks open dry ground and descends before reporting landed',()=>{
  const clear=(x,z)=>x>2&&Math.abs(z)<4,ceiling=(x,z)=>x<3?7:-Infinity;
  const spot=findLandingSpot({x:0,z:0},{shape:{},clear,ground,ceiling});assert.ok(spot.x>=3);
  let p={...spot,y:8};let first=stepFlight(p,p,{dt:.05,ground,ceiling,landing:true});assert.equal(first.landed,false);
  for(let i=0;i<100;i++)p=stepFlight(p,p,{dt:.05,ground,ceiling,landing:true});
  assert.equal(p.landed,true);assert.equal(p.y,0);
});

test('takeoff keeps wings folded below nearby roof clearance',()=>{
  assert.equal(flightDeployment(1,0,7),0);
  assert.equal(flightDeployment(7.2,0,7),0);
  assert.ok(flightDeployment(7.6,0,7)>.4);
  assert.equal(flightDeployment(8.1,0,7),1);
});

test('folded-body landing can use a narrow dry clearing while full-wing flight stays conservative',()=>{
  const trees=[
    {minX:2.9,maxX:3.5,minZ:-1,maxZ:1,top:4},
    {minX:-3.5,maxX:-2.9,minZ:-1,maxZ:1,top:4}
  ];
  const flightCeiling=createFlightEnvelope(trees);
  const landingCeiling=createFlightEnvelope(trees,{radius:TRAVEL.charizard.radius+TRAVEL.charizard.axle,cell:.5});
  const free=(x,z,r)=>trees.every(tree=>
    x+r<tree.minX||x-r>tree.maxX||z+r<tree.minZ||z-r>tree.maxZ);
  const clear=(x,z,shape)=>footprintClear(x,z,0,shape,free)&&footprintClear(x,z,0,TRAVEL.charizard,free);
  const options={shape:TRAVEL.cybertruck,clear,ground,maxRadius:0};
  assert.equal(findLandingSpot({x:0,z:0},{...options,ceiling:flightCeiling}),null,'spread wings do not fit the narrow clearing');
  assert.deepEqual(findLandingSpot({x:0,z:0},{...options,ceiling:landingCeiling}),{x:0,z:0},'both folded dragon and target truck fit');
  assert.equal(flightDeployment(0,0,flightCeiling(0,0)),0,'landing near trees retains folded wings');
  const descending=stepFlight({x:0,y:7,z:0},{x:0,z:0},{dt:.05,ground,ceiling:flightCeiling,landing:true});
  assert.ok(descending.y<7,'a verified folded-body landing can descend');
  const airborne=stepFlight({x:0,y:4,z:0},{x:.1,z:0},{dt:.05,ground,ceiling:flightCeiling,cruise:2});
  assert.equal(airborne.x,0,'ordinary flight still cannot sweep spread wings through the trees');
});

test('the smaller folded landing envelope still rejects a roof over the intended landing point',()=>{
  const roof=[{minX:-1,maxX:1,minZ:-1,maxZ:1,top:8}];
  const ceiling=createFlightEnvelope(roof,{radius:TRAVEL.charizard.radius+TRAVEL.charizard.axle,cell:.5});
  assert.equal(findLandingSpot({x:0,z:0},{shape:TRAVEL.cybertruck,clear:()=>true,ground,ceiling,maxRadius:0}),null);
});
