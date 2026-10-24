import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlightEnvelope,stepFlight,findLandingSpot,flightDeployment,FLIGHT} from './flight.js';
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
