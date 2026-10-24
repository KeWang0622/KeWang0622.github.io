import test from 'node:test';
import assert from 'node:assert/strict';
import {updateStableFocus,updateStableHeight} from './stable-camera.js';

const settings={yaw:.44,pitch:.64,distance:32,fov:42,aspect:1.6};
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-9,message);

test('central movement, facing changes and ride selection leave the camera exactly stationary',()=>{
  const focus={x:-3.2,y:1.25,z:5.5},before={...focus};
  for(const ride of ['walk','bicycle','model-s','cybertruck','porsche','horse','charizard']){
    for(const heading of [0,.7,Math.PI,Math.PI*1.8]){
      const point={x:before.x+Math.cos(heading),y:0,z:before.z+Math.sin(heading),heading,ride};
      assert.equal(updateStableFocus(focus,point,settings),false);
      assert.deepEqual(focus,before);
    }
  }
});

test('climbing, wing beats and terrain height do not move the map',()=>{
  const focus={x:2,y:1.25,z:-3},before={...focus};
  for(const y of [-10,0,2,6.5,12,30,100]){
    assert.equal(updateStableFocus(focus,{x:2,y,z:-3},settings),false);
    assert.deepEqual(focus,before);
  }
});

test('only excess beyond an edge translates the camera and translation stops at that edge',()=>{
  const focus={x:0,y:1.25,z:0},point={x:8,z:0};
  const options={...settings,yaw:0};
  const width=options.distance*Math.tan(options.fov*Math.PI/360)*options.aspect*.33;
  for(let i=0;i<120;i++)updateStableFocus(focus,point,options);
  close(focus.x,point.x-width,'follow exactly to the dead-zone boundary, not to the player');
  close(focus.z,0);close(focus.y,1.25);
  const settled={...focus};
  for(let i=0;i<120;i++)assert.equal(updateStableFocus(focus,point,options),false);
  assert.deepEqual(focus,settled,'no residual camera drift after reaching the boundary');
  updateStableFocus(focus,{x:focus.x,z:focus.z},options);
  assert.deepEqual(focus,settled,'walking back into the center does not recenter the map');
});

test('edge axes remain aligned with the camera at every yaw',()=>{
  for(const yaw of [0,.44,Math.PI/2,Math.PI,-Math.PI/3]){
    const sin=Math.sin(yaw),cos=Math.cos(yaw);
    for(const side of [-1,1]){
      const horizontal={x:0,y:1.25,z:0};
      updateStableFocus(horizontal,{x:cos*100*side,z:-sin*100*side},{...settings,yaw});
      close(horizontal.x*cos-horizontal.z*sin,side/6,'crossing side edge moves along camera right/left');
      close(horizontal.x*sin+horizontal.z*cos,0,'no unsolicited forward translation');
      const vertical={x:0,y:1.25,z:0};
      updateStableFocus(vertical,{x:sin*100*side,z:cos*100*side},{...settings,yaw});
      close(vertical.x*cos-vertical.z*sin,0);
      close(vertical.x*sin+vertical.z*cos,side/6,'crossing vertical edge moves along camera ground depth');
      close(vertical.y,1.25);
    }
  }
});

test('portrait screens use a narrower ground window instead of losing the player offscreen',()=>{
  const point={x:4,z:0},wide={x:0,y:1.25,z:0},portrait={...wide};
  assert.equal(updateStableFocus(wide,point,{...settings,yaw:0,aspect:1.8}),false);
  assert.equal(updateStableFocus(portrait,point,{...settings,yaw:0,aspect:.5625}),true);
  assert.ok(portrait.x>0);close(portrait.z,0);
});

test('diagonal edge following respects one speed limit and is stable across normal frame rates',()=>{
  const point={x:100,z:100};
  const results=[30,60,120].map(hz=>{
    const focus={x:0,y:1.25,z:0};
    for(let i=0;i<hz;i++){
      const prior={...focus};
      updateStableFocus(focus,point,{...settings,dt:1/hz});
      assert.ok(Math.hypot(focus.x-prior.x,focus.z-prior.z)<=10/hz+1e-10);
    }
    return focus;
  });
  for(const focus of results){close(Math.hypot(focus.x,focus.z),10);close(focus.y,1.25);}
  close(results[0].x,results[2].x);close(results[0].z,results[2].z);
});

test('invalid inputs cannot corrupt framing and a resumed tab cannot jump the map',()=>{
  for(const invalid of [{dt:0},{dt:NaN},{yaw:Infinity},{aspect:0},{fov:180},{maxSpeed:-1}]){
    const focus={x:0,y:1.25,z:0};
    assert.equal(updateStableFocus(focus,{x:100,z:100},{...settings,...invalid}),false);
    assert.deepEqual(focus,{x:0,y:1.25,z:0});
  }
  const focus={x:0,y:1.25,z:0};
  updateStableFocus(focus,{x:100,z:100},{...settings,dt:10});
  close(Math.hypot(focus.x,focus.z),.5,'suspended frames are capped at 50 ms');
});

const heightSettings={yaw:.44,pitch:.64,distance:24,fov:42};
function verticalProjection(focus,point,options=heightSettings){
  const along=(point.x-focus.x)*Math.sin(options.yaw)+(point.z-focus.z)*Math.cos(options.yaw);
  const dy=point.y-focus.y;
  const depth=options.distance-along*Math.cos(options.pitch)-dy*Math.sin(options.pitch);
  const vertical=-along*Math.sin(options.pitch)+dy*Math.cos(options.pitch);
  return {depth,ndc:vertical/(depth*Math.tan(options.fov*Math.PI/360))};
}

test('low hovering and wing beats inside the outer height window leave the camera stationary',()=>{
  const focus={x:0,y:1.25,z:0},before={...focus};
  for(let frame=0;frame<240;frame++){
    assert.equal(updateStableHeight(focus,{x:0,y:6.5+Math.sin(frame*.1)*.1,z:0},heightSettings),false);
    assert.deepEqual(focus,before);
  }
});

test('a high flyer is recovered inside the outer window by elevation alone, then framing stays still',()=>{
  const focus={x:0,y:1.25,z:0},point={x:0,y:33,z:0},options={...heightSettings};
  assert.ok(verticalProjection(focus,point).ndc>1,'high flyer starts outside the viewport');
  for(let frame=0;frame<300;frame++){
    const before=focus.y;
    updateStableHeight(focus,point,options);
    assert.ok(Math.abs(focus.y-before)<=8/60+1e-10,'elevation has a fixed speed ceiling');
    close(focus.x,0);close(focus.z,0);
    assert.deepEqual(options,heightSettings,'viewing direction and zoom are unchanged');
  }
  const projected=verticalProjection(focus,point);
  assert.ok(projected.depth>0);close(projected.ndc,.65,'stop on the outer boundary, not at screen center');
  const settled={...focus};
  for(let frame=0;frame<120;frame++)assert.equal(updateStableHeight(focus,point,options),false);
  assert.deepEqual(focus,settled);
  assert.equal(updateStableHeight(focus,{...point,y:point.y-1},options),false);
  assert.deepEqual(focus,settled,'small altitude changes inside the window do not recenter');
});

test('descending below the outer window lowers framing without rotating or moving the map sideways',()=>{
  const focus={x:-2,y:25,z:4},point={x:-2,y:5,z:4};
  assert.ok(verticalProjection(focus,point).ndc<-.65);
  for(let frame=0;frame<300;frame++)updateStableHeight(focus,point,heightSettings);
  close(verticalProjection(focus,point).ndc,-.65);
  close(focus.x,-2);close(focus.z,4);
  const settled={...focus};
  updateStableHeight(focus,{...point,y:point.y+1},heightSettings);
  assert.deepEqual(focus,settled);
});

test('elevation correction accounts for camera depth at every yaw',()=>{
  for(const yaw of [0,.44,Math.PI/2,Math.PI,-Math.PI/3]){
    const focus={x:0,y:1.25,z:0},point={x:Math.sin(yaw)*4,y:30,z:Math.cos(yaw)*4};
    const options={...heightSettings,yaw};
    for(let frame=0;frame<300;frame++)updateStableHeight(focus,point,options);
    close(verticalProjection(focus,point,options).ndc,.65);
    close(focus.x,0);close(focus.z,0);
  }
});

test('flight elevation recovery is frame-rate independent and caps suspended frames',()=>{
  const point={x:0,y:33,z:0};
  const results=[30,60,120].map(hz=>{
    const focus={x:0,y:1.25,z:0};
    for(let i=0;i<hz;i++)updateStableHeight(focus,point,{...heightSettings,dt:1/hz});
    return focus.y;
  });
  for(const y of results)close(y,9.25);
  const focus={x:0,y:1.25,z:0};
  updateStableHeight(focus,point,{...heightSettings,dt:10});
  close(focus.y,1.65);
  const before={...focus};
  for(const invalid of [{dt:NaN},{dt:0},{yaw:Infinity},{halfHeight:1},{maxSpeed:0}]){
    assert.equal(updateStableHeight(focus,point,{...heightSettings,...invalid}),false);
    assert.deepEqual(focus,before);
  }
});
