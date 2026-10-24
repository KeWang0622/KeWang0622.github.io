import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from './lib/three.module.js';
import {TRAVEL,footprintOffsets,footprintClear,turnClear,motionClear,findWalkingRoute,angleDelta} from './navigation.js';
import {createTravelModel} from './travel-models.js';
import {FLIGHT} from './flight.js';
import {BRIDGE_XS,createBridgeSurfaces} from './world-surfaces.js';
import {pondRadius,SCENIC_PLACES,extensionRoadPoints} from './outdoor-extension.js';
import {createInterior} from './interiors.js';
import {EXHIBITS} from './exhibits.js';

const source=readFileSync(new URL('./world.js',import.meta.url),'utf8');
const layoutSource=source.slice(source.indexOf('const layout='),source.indexOf('let renderer;'));
const terrainSource=source.slice(source.indexOf('  const roads=['),source.indexOf('  const terrainGeometry='));
const {layout,riverZ,groundHeight}=new Function('THREE','pondRadius','SCENIC_PLACES','extensionRoadPoints','BRIDGE_XS',
  `${layoutSource}${terrainSource};return {layout,riverZ,groundHeight};`)(THREE,pondRadius,SCENIC_PLACES,extensionRoadPoints,BRIDGE_XS);
const bridges=createBridgeSurfaces(riverZ,groundHeight);
// Keep the actual adjacent Adobe footprint in the bridge test: this is the
// building that made the old east approach unsafe even when the deck was clear.
const adobe=layout.adobe;
const walkable=(x,z,radius=.22)=>{
  if(Math.abs(x)>64||Math.abs(z)>64)return false;
  if(Math.abs(x-adobe.x)<adobe.w/2+.2+radius&&Math.abs(z-adobe.z)<adobe.d/2-.2+radius)return false;
  if(pondRadius(x,z)<1.12)return false;
  if(bridges.some(b=>b.blocks(x,z,radius)))return false;
  return Math.abs(z-riverZ(x))>=1.45+radius||bridges.some(b=>b.supports(x,z,radius));
};

for(const name of Object.keys(TRAVEL).filter(name=>name!=='walk')){
  test(`${name}: clearance envelope encloses every actual mesh vertex throughout articulation`,()=>{
    const model=createTravelModel(name),shape=TRAVEL[name],offsets=footprintOffsets(shape),v=new THREE.Vector3();
    let greatestDistance=0,vertexCount=0;
    try{
      for(let frame=0;frame<18;frame++){
        model.update(.14,{speed:shape.speed,time:frame*.14,steer:frame%2?.32:-.32});
        model.group.updateMatrixWorld(true);
        model.group.traverse(node=>{
          const vertices=node.geometry?.attributes.position;if(!vertices)return;
          for(let i=0;i<vertices.count;i++){
            v.fromBufferAttribute(vertices,i).applyMatrix4(node.matrixWorld);
            let nearest=Infinity;for(const offset of offsets)nearest=Math.min(nearest,Math.hypot(v.x,v.z-offset));
            greatestDistance=Math.max(greatestDistance,nearest);vertexCount++;
          }
        });
      }
      assert.ok(vertexCount>1000,'the actual authored model was inspected, including its mounted rider');
      assert.ok(greatestDistance<=(name==='charizard'?FLIGHT.radius:shape.radius),`${name}: mesh protrudes ${(greatestDistance-shape.radius).toFixed(4)}m beyond collision discs`);
    }finally{model.dispose();}
  });
}

for(const [name,shape]of Object.entries(TRAVEL).filter(([id])=>id!=='charizard')){
  test(`${name}: all three bridges are crossable in both directions`,()=>{
    for(const b of bridges)for(const direction of [-1,1]){
      const length=b.halfLength+b.rampLength+shape.axle+1;
      const from={x:b.x,z:b.z-direction*length},to={x:b.x,z:b.z+direction*length};
      assert.ok(motionClear(from,to,direction===1?0:Math.PI,shape,walkable),`${name} cannot cross bridge ${b.x} toward ${direction}`);
    }
  });
}

test('turning rejects a car sweeping through furniture even when endpoint poses are clear',()=>{
  const shape=TRAVEL['model-s'],corner={x:1.35,z:1.35};
  const furniture=(x,z,radius)=>Math.hypot(x-corner.x,z-corner.z)>=radius+.30;
  assert.ok(footprintClear(0,0,0,shape,furniture));
  assert.ok(footprintClear(0,0,Math.PI/2,shape,furniture));
  assert.equal(turnClear(0,0,0,Math.PI/2,shape,furniture),false,'intermediate yaw hits the table corner');
});

test('a long frame cannot jump a vehicle or walker across closed water',()=>{
  for(const [name,shape]of Object.entries(TRAVEL).filter(([id])=>id!=='charizard')){
    const from={x:0,z:riverZ(0)-5},to={x:0,z:riverZ(0)+5};
    assert.ok(footprintClear(from.x,from.z,0,shape,walkable),`${name} starts on land`);
    assert.ok(footprintClear(to.x,to.z,0,shape,walkable),`${name} ends on land`);
    assert.equal(motionClear(from,to,0,shape,walkable),false,`${name} may not tunnel through water`);
  }
});

test('all travel route footprints use a valid bridge rather than crossing the water directly',()=>{
  for(const [name,shape]of Object.entries(TRAVEL).filter(([id])=>id!=='charizard'))for(const b of bridges){
    const from={x:b.x,z:b.z+6,yaw:Math.PI},to={x:b.x,z:b.z-6};
    const route=findWalkingRoute(from,to,{shape,walkable,min:-64,max:64,step:.6});
    assert.ok(route.length,`${name} route across bridge ${b.x} exists`);
    let prior=from,crossesDeck=false;
    for(const next of route){
      assert.ok(turnClear(prior.x,prior.z,prior.yaw,next.yaw,shape,walkable),`${name}: turning footprint is clear`);
      assert.ok(motionClear(prior,next,next.yaw,shape,walkable),`${name}: route segment is swept clear`);
      const dz=next.z-prior.z;
      if(Math.abs(dz)>1e-8){const t=(b.z-prior.z)/dz;if(t>=0&&t<=1&&Math.abs(prior.x+(next.x-prior.x)*t-b.x)<.7)crossesDeck=true;}
      prior=next;
    }
    assert.ok(Math.hypot(prior.x-to.x,prior.z-to.z)<.55,'route reaches the requested far bank');
    assert.ok(crossesDeck,`${name}: route segments cross bridge ${b.x}, including a one-segment direct route`);
  }
});

test('every real room exhibit and exit remains accessible around its furniture',async()=>{
  // Only paint operations are stubbed: geometry, furniture blockers, exhibit
  // coordinates and the navigation planner are the actual production modules.
  const noop=()=>{},context=new Proxy({measureText:s=>({width:s.length*20}),createLinearGradient:()=>({addColorStop:noop})},{get:(o,p)=>o[p]??noop});
  const originalDocument=globalThis.document;
  globalThis.document={createElement:()=>({width:0,height:0,getContext:()=>context})};
  try{
    for(const [id,items]of Object.entries(EXHIBITS)){
      const room=await createInterior({place:{id},exhibits:items.map(({image,...item})=>item)});
      try{
        const free=(x,z,radius=.22)=>x>=room.bounds.minX+radius&&x<=room.bounds.maxX-radius&&z>=room.bounds.minZ+radius&&z<=room.bounds.maxZ-radius&&
          !room.blockers.some(b=>Math.abs(x-b.x)<b.w+radius&&Math.abs(z-b.z)<b.d+radius);
        for(const target of [...room.exhibits.map(e=>({id:e.id,point:e.approach})),{id:'exit',point:room.exit.approach}]){
          assert.ok(free(target.point.x,target.point.z),`${id}/${target.id}: approach does not overlap furniture`);
          const route=findWalkingRoute({...room.spawn,yaw:Math.PI},target.point,{shape:TRAVEL.walk,walkable:free,min:-64,max:64,step:.6});
          assert.ok(route.length,`${id}/${target.id}: actual planner reaches the approach`);
        }
      }finally{room.dispose();}
    }
  }finally{if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;}
});

test('route origin cannot snap through a wall to a nearby free grid node',()=>{
  const corridor=(x,z,radius)=>!(Math.abs(x)<.10+radius&&Math.abs(z)<2+radius);
  const from={x:-.5,z:0,yaw:Math.PI/2},to={x:.5,z:0};
  const route=findWalkingRoute(from,to,{shape:TRAVEL.walk,walkable:corridor,min:-3,max:3,step:.6});
  assert.ok(route.length,'there is a route around the ends of the wall');
  assert.ok(route.some(p=>Math.abs(p.z)>2.2),'routing goes around, not through, the wall');
  let previous=from;
  for(const p of route){assert.ok(motionClear(previous,p,p.yaw,TRAVEL.walk,corridor));previous=p;}
});

test('a car near a narrow corridor never receives a sideways initial connector',()=>{
  const shape=TRAVEL['model-s'];
  const from={x:.12,z:.12,yaw:0},to={x:8,z:8};
  const corridor=width=>(x,z,radius)=>Math.abs(x)+radius<width&&z>-8&&z<8 || z>3+radius&&z<12-radius&&x>-2+radius&&x<12-radius;
  const tight=corridor(1.23),oldHop={x:-.2,z:1};
  assert.ok(motionClear(from,oldHop,0,shape,tight),'the old sideways seed appeared safe with a forward-facing body');
  const actualYaw=Math.atan2(oldHop.x-from.x,oldHop.z-from.z);
  assert.equal(turnClear(from.x,from.z,0,actualYaw,shape,tight),false,'the same seed cannot be executed facing its direction');
  // The narrow case needs a straight forward anchor before joining the grid;
  // the wider case can connect directly. Both must execute without side hops.
  for(const width of [1.23,1.6]){
  const free=corridor(width),route=findWalkingRoute(from,to,{shape,walkable:free,min:-8,max:14,step:.6});
  assert.ok(route.length,`the car proceeds down the ${width}m half-width corridor before turning in the open room`);
  let prior=from;
  for(const next of route){
    const heading=Math.hypot(next.x-prior.x,next.z-prior.z)>1e-7?Math.atan2(next.x-prior.x,next.z-prior.z):prior.yaw;
    assert.ok(Math.abs(angleDelta(heading,next.yaw))<1e-6,'waypoint yaw matches the runtime movement direction');
    assert.ok(turnClear(prior.x,prior.z,prior.yaw,heading,shape,free),'the actual runtime turn is clear');
    assert.ok(motionClear(prior,next,heading,shape,free),'the actual runtime connector is clear');
    prior=next;
  }
  }
});

test('a long straight car route checks a single swept capsule instead of repeated overlapping footprints',()=>{
  let checks=0;const free=()=>{checks++;return true;};
  assert.ok(motionClear({x:0,z:0},{x:0,z:60},0,TRAVEL.cybertruck,free));
  assert.ok(checks<550,`60m straight route used ${checks} collision queries`);
});

test('an unreachable long search has a bounded work budget and reports exhaustion',()=>{
  let exhausted=false;
  const free=(x,z,r)=>Math.abs(z)>r+.2||Math.abs(x)>10;
  const route=findWalkingRoute({x:0,z:-5,yaw:0},{x:0,z:5},{shape:TRAVEL.walk,walkable:free,min:-12,max:12,maxMilliseconds:0,onBudgetExceeded:()=>{exhausted=true;}});
  assert.deepEqual(route,[]);
  assert.equal(exhausted,true,'caller can distinguish exhausted search from a solid destination');
});

test('folded launch footprint encloses Charizard and its seated rider',()=>{
  const model=createTravelModel('charizard'),shape=TRAVEL.charizard,offsets=footprintOffsets(shape),v=new THREE.Vector3();
  try {model.update(.05,{airborne:0,time:1});model.group.updateMatrixWorld(true);model.group.traverse(n=>{
    const a=n.geometry?.attributes.position;if(!a)return;
    for(let i=0;i<a.count;i++){v.fromBufferAttribute(a,i).applyMatrix4(n.matrixWorld);assert.ok(Math.min(...offsets.map(z=>Math.hypot(v.x,v.z-z)))<=shape.radius);}
  });}finally{model.dispose();}
});
