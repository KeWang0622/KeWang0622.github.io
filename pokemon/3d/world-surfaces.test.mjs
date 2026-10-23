import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from './lib/three.module.js';
import {BRIDGE_XS,WALKER_RADIUS,createBridgeSurfaces,clearWalkingSegment} from './world-surfaces.js';
import {pondRadius,SCENIC_PLACES,extensionRoadPoints} from './outdoor-extension.js';

// Exercise the actual authored terrain and bridge geometry without a renderer.
// These source boundaries intentionally make a terrain/renderer refactor require
// updating this integration fixture rather than silently testing a copied model.
const source=readFileSync(new URL('./world.js',import.meta.url),'utf8');
const layoutSource=source.slice(source.indexOf('const layout='),source.indexOf('let renderer;'));
const terrainSource=source.slice(source.indexOf('  const roads=['),source.indexOf('  const terrainGeometry='));
assert.ok(layoutSource.includes('mrfoundry:')&&terrainSource.includes('function groundHeight('),'terrain integration fixture exists');
const {riverZ,groundHeight}=new Function('THREE','pondRadius','SCENIC_PLACES','extensionRoadPoints','BRIDGE_XS',
  `${layoutSource}${terrainSource};return {riverZ,groundHeight};`)(THREE,pondRadius,SCENIC_PLACES,extensionRoadPoints,BRIDGE_XS);
const bridges=createBridgeSurfaces(riverZ,groundHeight);
const surface=(x,z)=>bridges.find(b=>b.contains(x,z))?.height(x,z)??groundHeight(x,z);
const navigable=(x,z,radius=WALKER_RADIUS)=>!bridges.some(b=>b.blocks(x,z,radius))&&
  (Math.abs(z-riverZ(x))>=1.45+radius||bridges.some(b=>b.supports(x,z,radius)));

test('all bridge approaches are continuous, gently sloped, and crossable in both directions',()=>{
  for(const b of bridges)for(const offset of [0,-.75,.75]){
    const x=b.x+offset,end=b.halfLength+b.rampLength;
    for(const sign of [-1,1])for(const join of [b.halfLength,end]){
      const z=b.z+sign*join,eps=1e-5;
      assert.ok(Math.abs(surface(x,z-eps)-surface(x,z+eps))<.0001,`continuous join ${b.x}/${offset}/${sign}/${join}`);
      const left=(surface(x,z)-surface(x,z-.001))/.001,right=(surface(x,z+.001)-surface(x,z))/.001;
      assert.ok(Math.abs(left-right)<.025,`no derivative spike ${b.x}/${offset}/${sign}/${join}`);
    }
    for(let local=-end-.2;local<=end+.2;local+=.025){
      const z=b.z+local,slope=(surface(x,z+.005)-surface(x,z-.005))/.01;
      assert.ok(Math.abs(slope)<.55,`walkable slope ${b.x}/${offset}/${local}: ${slope}`);
    }
    const a={x,z:b.z-end-.2},c={x,z:b.z+end+.2};
    assert.ok(clearWalkingSegment(a,c,navigable),`south-to-north passage ${b.x}/${offset}`);
    assert.ok(clearWalkingSegment(c,a,navigable),`north-to-south passage ${b.x}/${offset}`);
  }
});

test('rails reject bodies, bridge centres support feet, and unbridged water stays closed',()=>{
  for(const b of bridges)for(const sign of [-1,1]){
    for(const zOffset of [-1.8,0,1.8]){
      assert.equal(navigable(b.x+sign*(b.railX-.20),b.z+zOffset),false,'body cannot pass through a rail');
      assert.equal(navigable(b.x+sign*.75,b.z+zOffset),true,'off-centre lane remains usable');
    }
    const railEnd={x:b.x+sign*b.railX,z:b.z+b.railHalfLength};
    assert.equal(b.blocks(railEnd.x,railEnd.z),true,'rail end post is solid');
    assert.equal(b.blocks(railEnd.x,railEnd.z+.6),false,'approach beyond the post is open');
  }
  for(const x of [-31,-20,0,22,35,59])assert.equal(navigable(x,riverZ(x)),false,`water cannot be walked at ${x}`);
  assert.equal(clearWalkingSegment({x:0,z:riverZ(0)-3},{x:0,z:riverZ(0)+3},navigable),false,'swept route cannot hop over water');
});

test('open ramp shoulders can be entered laterally without a height step',()=>{
  for(const b of bridges)for(const side of [-1,1])for(const end of [-1,1])for(const along of [.3,.6,.9]){
    const x=b.x+side*b.halfWidth,z=b.z+end*(b.halfLength+along),eps=1e-5;
    assert.ok(navigable(x,z),'the exposed shoulder is a legal approach');
    assert.ok(Math.abs(surface(x-eps,z)-surface(x+eps,z))<.0001,'ramp meets the bank continuously at its side');
    for(let offset=b.halfWidth-.65;offset<=b.halfWidth+.15;offset+=.025){
      const px=b.x+side*offset,slope=(surface(px+.005,z)-surface(px-.005,z))/.01;
      assert.ok(Math.abs(slope)<1,`no lateral derivative spike ${b.x}/${side}/${end}/${along}: ${slope}`);
    }
  }
});

test('rendered plank top vertices share the foot surface and raycast feet stay within 4mm',()=>{
  const begin=source.indexOf('  const bridgeFloors=[];'),end=source.indexOf('  const gardenBeds=',begin);
  assert.ok(begin>=0&&end>begin,'authored bridge geometry fixture exists');
  const scene=new THREE.Scene(),noop=()=>{},surfaces={bridgeWood:new THREE.MeshBasicMaterial(),bridgeWoodLight:new THREE.MeshBasicMaterial()};
  const add=(geometry,color,parent)=>{const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial());parent.add(mesh);return mesh;};
  const floors=new Function('THREE','bridges','scene','add','cyl','sphere','lineBetween','surfaces',`${source.slice(begin,end)};return bridgeFloors;`)
    (THREE,bridges,scene,add,noop,noop,noop,surfaces);
  scene.updateMatrixWorld(true);
  assert.ok(floors.length>=bridges.length*18,'real deck and approach planks were built');
  let greatestGap=0,gapLocation='';
  for(const plank of floors){
    const v=plank.geometry.attributes.position;
    for(let i=0;i<v.count;i++){
      const x=v.getX(i),z=v.getZ(i),y=v.getY(i),b=bridges.find(item=>Math.abs(x-item.x)<=item.halfWidth+.0001&&Math.abs(z-item.z)<=item.halfLength+item.rampLength+.0001);
      assert.ok(b,'plank belongs to a bridge');
      const difference=b.height(x,z)-y;
      assert.ok(Math.min(Math.abs(difference),Math.abs(difference-.12))<.00002,'top/bottom geometry shares the foot function');
    }
    plank.geometry.computeBoundingBox();const center=plank.geometry.boundingBox.getCenter(new THREE.Vector3());
    for(const xOffset of [0,-.65,.65]){
      const x=center.x+xOffset,z=center.z;
      const ray=new THREE.Raycaster(new THREE.Vector3(x,10,z),new THREE.Vector3(0,-1,0));
      const hit=ray.intersectObject(plank)[0];assert.ok(hit,'plank is raycastable for click-to-walk');
      const gap=Math.abs(hit.point.y-surface(x,z));
      if(gap>greatestGap){greatestGap=gap;gapLocation=`${x},${z}`;}
    }
  }
  for(const plank of floors){plank.geometry.dispose();plank.material.dispose();}
  assert.ok(greatestGap<.004,`greatest rendered/foot gap is ${greatestGap}m at ${gapLocation}`);
});

// Reproduction of the old screen-to-ground Jacobian on the documented camera.
function upDirection(height,x,z){
  const p=new THREE.Vector3(x,height(x,z),z),focus=p.clone().add(new THREE.Vector3(0,1.25,-4));
  const camera=new THREE.PerspectiveCamera(42,1.6,.1,1000),yaw=.44,pitch=.64;
  camera.position.set(focus.x+Math.sin(yaw)*Math.cos(pitch)*24,focus.y+Math.sin(pitch)*24,focus.z+Math.cos(yaw)*Math.cos(pitch)*24);
  camera.lookAt(focus);camera.updateMatrixWorld();
  const m=new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).elements;
  const sx=(height(x+.04,z)-height(x-.04,z))/.08,sz=(height(x,z+.04)-height(x,z-.04))/.08;
  const cx=m[0]*p.x+m[4]*p.y+m[8]*p.z+m[12],cy=m[1]*p.x+m[5]*p.y+m[9]*p.z+m[13],cw=m[3]*p.x+m[7]*p.y+m[11]*p.z+m[15];
  const a=((m[0]+m[4]*sx)*cw-cx*(m[3]+m[7]*sx))*1.6,b=((m[8]+m[4]*sz)*cw-cx*(m[11]+m[7]*sz))*1.6;
  const c=(m[1]+m[5]*sx)*cw-cy*(m[3]+m[7]*sx),d=(m[9]+m[5]*sz)*cw-cy*(m[11]+m[7]*sz),det=a*d-b*c;
  return new THREE.Vector3(-b/det,0,a/det).normalize();
}

test('the recorded north-landing Up reversal disappears on the continuous surface',()=>{
  const oldHeight=(x,z)=>Math.abs(z-riverZ(x))<2.2&&[-9,9,47].some(bx=>Math.abs(x-bx)<1.3)
    ?.18+Math.cos((z-riverZ(x))/2.2*Math.PI/2)*.22:groundHeight(x,z);
  const x=-9.65,z=-9.513915613769896,flat=()=>.08;
  const forward=upDirection(flat,x,z);
  assert.ok(upDirection(oldHeight,x,z).dot(forward)<-.99,'fixture reproduces the old near-180° reversal');
  assert.ok(upDirection(surface,x,z).dot(forward)>.99,'new ramp preserves the intended Up direction');
  for(const b of bridges)for(const xOffset of [0,-.75,.75])for(const side of [-1,1]){
    const px=b.x+xOffset,pz=b.z+side*(b.halfLength+.1);
    assert.ok(upDirection(surface,px,pz).dot(upDirection(flat,px,pz))>.98,`stable direction on bridge ${b.x}/${xOffset}/${side}`);
  }
});
