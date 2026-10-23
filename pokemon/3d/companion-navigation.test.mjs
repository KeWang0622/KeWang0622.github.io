import test from 'node:test';
import assert from 'node:assert/strict';
import {companionSegmentClear,stepCompanion} from './companion-navigation.js';

const dt=1/60;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function update(f,desired,occupants,walkable=()=>true,extra={}) {
  const next=stepCompanion({current:f,desired,occupants,walkable,dt,state:f.state,...extra});
  assert.ok(distance(f,next)<=(extra.maxSpeed??5.2)*dt+1e-9,'bounded step: no teleport');
  assert.ok(companionSegmentClear(f,next,walkable,extra.footprintRadius??.12),'swept footprint stays walkable');
  return next;
}

test('a .7m player reversal does not put MRI on the player',()=>{
  let f={x:0,z:-1.4},minimum=Infinity;
  for(let i=1;i<=18;i++){
    const travel=i*3.6*dt,player={x:0,z:-travel,radius:.30,vx:0,vz:-3.6};
    f=update(f,{x:0,z:-1.4+travel},[player]);
    minimum=Math.min(minimum,distance(f,player));
  }
  assert.ok(minimum>=.64-1e-6,`clearance at reversal: ${minimum}`);
  assert.ok(Math.abs(f.x)>.35,'MRI visibly steps aside');
});

test('a narrow bridge supports a five-companion reversal without overlap',()=>{
  const corridor=(x,z)=>Math.abs(x)<=1&&z>=-20&&z<=20;
  let followers=Array.from({length:5},(_,i)=>({x:0,z:-1.4-i*1.3})),minimum=Infinity;
  for(let frame=1;frame<=145;frame++){
    const travel=frame*3.6*dt,player={x:0,z:-travel,radius:.30,vx:0,vz:-3.6},occupied=[player];
    followers=followers.map((f,rank)=>{
      const lead=1.4+rank*1.3,desired={x:0,z:travel<=lead?travel-lead:lead-travel};
      const next=update(f,desired,occupied,corridor,{footprintRadius:.10});
      for(const p of occupied)minimum=Math.min(minimum,distance(next,p)-.34-p.radius);
      occupied.push({...next,radius:.34,vx:(next.x-f.x)/dt,vz:(next.z-f.z)/dt});
      return next;
    });
  }
  assert.ok(minimum>=-1e-5,`party clearance: ${minimum}`);
});

test('a tight corridor waits rather than cutting through a wall or occupant',()=>{
  const corridor=x=>Math.abs(x)<=.45;
  let f={x:0,z:-1.4};
  const leader={x:0,z:-.65,radius:.30};
  for(let frame=0;frame<90;frame++)f=update(f,{x:0,z:-.1},[leader],corridor,{footprintRadius:.10});
  assert.ok(distance(f,leader)>=.64);
  assert.ok(f.z<leader.z,'does not cross the stationary blocker');
});

test('the swept footprint rejects corner cutting and follows ordered trail corners',()=>{
  const corridor=(x,z)=>(x>=-3&&x<=.55&&Math.abs(z)<=.55)||(Math.abs(x)<=.55&&z>=-.55&&z<=3);
  assert.equal(companionSegmentClear({x:-1,z:0},{x:0,z:1},corridor,.12),false);
  let f={x:-2,z:0};
  for(const desired of [{x:-.3,z:0},{x:0,z:0},{x:0,z:2}]){
    for(let frame=0;frame<90&&distance(f,desired)>.01;frame++)f=update(f,desired,[],corridor);
    assert.ok(distance(f,desired)<.02,'reaches each existing trail waypoint');
  }
});

test('vehicle leader radius and a faster follow speed are supported',()=>{
  let f={x:0,z:-2.0};
  for(let frame=1;frame<=180;frame++){
    const player={x:0,z:frame*7*dt,radius:.65,vx:0,vz:7};
    f=update(f,{x:0,z:player.z-2},[player],()=>true,{maxSpeed:8.5});
    assert.ok(distance(f,player)>=.99);
  }
  assert.ok(Math.abs(f.z-(21-2))<.02,'keeps up without teleporting');
});

test('an externally imposed initial overlap recovers smoothly outward',()=>{
  let f={x:0,z:0};const player={x:0,z:.1,radius:.3};let before=distance(f,player);
  for(let frame=0;frame<45;frame++){
    f=update(f,{x:0,z:-1.4},[player]);const after=distance(f,player);
    assert.ok(after>=before-1e-8);before=after;
  }
  assert.ok(before>=.64);
});
