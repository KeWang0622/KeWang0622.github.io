import * as THREE from './lib/three.module.js';
import { GLTFLoader } from './lib/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from './lib/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from './lib/addons/postprocessing/EffectComposer.js';
import { RenderPass } from './lib/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from './lib/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from './lib/addons/postprocessing/OutputPass.js';
import { buildArrivalGround } from './ground.js';
import { buildSecondaryLandmarks } from './landmarks.js';
import { buildVillageDetails } from './details.js';
import { createCameraCompanion } from './camera-companion.js';
import { createMacCompanion, createPrismCompanion, createMusicCompanion } from './companion-models.js';
import { WORLD_LIMIT, pondRadius, SCENIC_PLACES, extensionRoadPoints, buildOutdoorExtension } from './outdoor-extension.js';
import { createBridgeSurfaces, WALKER_RADIUS } from './world-surfaces.js';
import { TRAVEL, angleDelta, footprintOffsets, footprintClear, turnClear, motionClear, findWalkingRoute } from './navigation.js?v=20261023-centered-travel';
import { stepCompanion } from './companion-navigation.js';
import { createTravelModel } from './travel-models.js?v=20261023-centered-travel';
import { createWorldMaterials } from './world-materials.js';
import { FIRST_PERSON_FOV, firstPersonPose } from './ride-camera.js';
import { stepRideControl } from './ride-controls.js';
import { planRideSwitch } from './ride-switch.js?v=20261023-centered-travel';
import { updateCenteredFocus } from './stable-camera.js?v=20261023-centered-travel';
import { FLIGHT, createFlightEnvelope, stepFlight, findLandingSpot, flightDeployment } from './flight.js';
import { createVillageSky } from './village-sky.js';
import { mergeGeometries } from './lib/addons/utils/BufferGeometryUtils.js';

const data = window.KE_WORLD;
const ui = window.KE_WORLD_UI;
const canvas = document.getElementById('world');
const stage = document.getElementById('world-stage');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const C={cream:0xf1e0bc,glass:0x628e99,ink:0x244652,gold:0xd9af60,darkLeaf:0x4b814e};
const layout={
  mrfoundry:{x:-4,z:2,w:7.5,d:6.4,h:5.6},
  adobe:{x:13,z:1,w:7,d:6,h:5.5},
  pika:{x:22,z:-17,w:3.7,d:2.9,h:3.9},
  berkeley:{x:-24,z:-22,w:3,d:3,h:7},
  imaging:{x:2,z:-34,w:4.2,d:3.7,h:4.6},
  tsinghua:{x:-33,z:4,w:5,d:3,h:3.5},
  internships:{x:-22,z:25,w:4,d:3.6,h:3.2}
};
let renderer;
try { renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'}); }
catch(error){fallback(error);}
if(renderer&&data?.places?.length) init().catch(fallback);
function fallback(error){
  document.getElementById('loading').classList.add('loaded');
  document.getElementById('render-fallback').hidden=false;
  console.warn('The 3D view is unavailable. Every field note remains accessible.',error?.message||error);
}

async function init(){
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  renderer.setClearColor(0xc5dfdd);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.NeutralToneMapping;
  renderer.toneMappingExposure=1.0;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0xc5dfdd);
  scene.fog=new THREE.FogExp2(0xb8d1c3,.011);
  scene.add(createVillageSky());
  const camera=new THREE.PerspectiveCamera(42,1,.15,1600);
  const hemi=new THREE.HemisphereLight(0xdceeff,0x60735e,1.85);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffe9ca,2.65);sun.position.set(-18,34,20);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-28,right:28,top:28,bottom:-28,near:1,far:100});
  sun.shadow.normalBias=.045;sun.shadow.bias=-.00008;sun.shadow.radius=5;
  scene.add(sun,sun.target);
  const skyFill=new THREE.DirectionalLight(0x9ac7d5,.6);skyFill.position.set(15,9,-20);scene.add(skyFill);
  const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples:4});
  renderer.info.autoReset=false;
  const composer=new EffectComposer(renderer,target);
  composer.addPass(new RenderPass(scene,camera));
  const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.12,.45,1.1);composer.addPass(bloom);composer.addPass(new OutputPass());
  const loader=new GLTFLoader();
  const surfaces=createWorldMaterials(renderer);
  const mats=new Map(), targets=[], blockers=[], flagCloths=[], waterGlints=[], distantBuildings=[];
  const windUniform={value:0};
  let activeRoom=null,roomPlaceId=null,roomLoading=false,outdoorReturn=null;
  const roomCache=new Map(),outdoorFog=scene.fog;
  const rand=seeded(2027);
  function mat(color,extra={}){const k=color+JSON.stringify(extra);if(!mats.has(k))mats.set(k,new THREE.MeshStandardMaterial({color,roughness:.87,...extra}));return mats.get(k);}
  function add(geometry,color,parent=scene,x=0,y=0,z=0,extra={}){const m=new THREE.Mesh(geometry,mat(color,extra));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  function box(parent,x,y,z,w,h,d,color,extra={}){return add(new RoundedBoxGeometry(w,h,d,2,Math.min(w,h,d)*.07),color,parent,x,y,z,extra);}
  function cyl(parent,x,y,z,rt,rb,h,color,segments=20){return add(new THREE.CylinderGeometry(rt,rb,h,segments),color,parent,x,y,z);}
  function sphere(parent,x,y,z,r,color,sx=1,sy=1,sz=1){const m=add(new THREE.SphereGeometry(r,16,12),color,parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
  function roof(parent,x,y,z,w,h,d,color){const m=add(new THREE.ConeGeometry(1,h,4),color,parent,x,y,z);m.rotation.y=Math.PI/4;m.scale.set(w/Math.SQRT2,1,d/Math.SQRT2);return m;}
  function lineBetween(parent,a,b,r,color){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b);const m=cyl(parent,0,0,0,r,r,p.distanceTo(q),color,8);m.position.copy(p).add(q).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());return m;}
  function shadow(){return null;}

  // A continuous landscape. The village lives in the terrain, rather than on a disc.
  const roads=[
    [[-44,14],[-30,11],[-21,10],[-13,9],[-4,9],[5,10],[14,10],[28,8],[44,14]],
    [[-18,9],[-25,7],[-33,6.5]],
    [[-13,9],[-10,1],[-9,riverZ(-9)+3.7],[-9,riverZ(-9)],[-9,riverZ(-9)-3.7],[-13,-13],[-24,-19.4]],
    [[-3,9],[-4,7],[-4,5.7]],
    [[6,10],[8,4],[7.25,riverZ(7.25)+3.7],[7.25,riverZ(7.25)],[7.25,riverZ(7.25)-3.7],[16,-10],[22,-14.45]],
    [[8,4],[10,5],[13,5]],
    [[7.25,riverZ(7.25)],[7.25,riverZ(7.25)-3.7],[6,-13],[4,-23],[2,-30.5]],
    [[-19,10],[-23,17],[-22,27.9]],
    ...extensionRoadPoints(riverZ)
  ].map(points=>new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z))));
  const roadSegments=[];
  roads.forEach(curve=>{const p=curve.getPoints(28);for(let i=1;i<p.length;i++)roadSegments.push([p[i-1],p[i]]);});
  function roadDistance(x,z){let d=1000;for(const [a,b] of roadSegments){const dx=b.x-a.x,dz=b.z-a.z;const t=THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz),0,1);d=Math.min(d,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));}return d;}
  function riverZ(x){return -5.5+Math.sin(x*.12)*2.0;}
  function groundHeight(x,z){
    const edge=THREE.MathUtils.smoothstep(Math.max(Math.abs(x),Math.abs(z)),25,52);
    let h=.10+Math.sin(x*.13)*Math.cos(z*.18)*.22+edge*(1.9+Math.sin(x*.11+z*.07)*1.6);
    h+=3.0*Math.exp(-((x+21)**2+(z+26)**2)/150)+4.1*Math.exp(-((x-24)**2+(z+30)**2)/200);
    const river=Math.abs(z-riverZ(x));
    h-=.9*Math.exp(-(river*river)/3.5);
    const road=roadDistance(x,z);const roadHeight=.08+THREE.MathUtils.smoothstep(-z,38,51)*2.4;h=THREE.MathUtils.lerp(roadHeight,h,THREE.MathUtils.smoothstep(road,1.5,3.4));
    for(const p of Object.values(layout)){
      const d=Math.hypot((x-p.x)/(p.w*.85),(z-p.z)/(p.d*.9));
      h=THREE.MathUtils.lerp(.12,h,THREE.MathUtils.smoothstep(d,1,1.65));
    }
    for(const p of SCENIC_PLACES){const d=Math.hypot((x-p.x)/(p.w*.65),(z-p.z)/(p.d*.65));h=THREE.MathUtils.lerp(p.height,h,THREE.MathUtils.smoothstep(d,1,1.5));}
    h=THREE.MathUtils.lerp(-.67,h,THREE.MathUtils.smoothstep(river,1.05,2.4));
    h=THREE.MathUtils.lerp(-.52,h,THREE.MathUtils.smoothstep(pondRadius(x,z),.91,1.24));
    return h;
  }
  const terrainGeometry=new THREE.PlaneGeometry(150,150,220,220);terrainGeometry.rotateX(-Math.PI/2);
  const p=terrainGeometry.attributes.position, colors=new Float32Array(p.count*3);
  const grassA=new THREE.Color(0x6d9b52),grassB=new THREE.Color(0x91ad63),roadColor=new THREE.Color(0xc9b382),bankColor=new THREE.Color(0x7d9164),tint=new THREE.Color();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),d=roadDistance(x,z),river=Math.abs(z-riverZ(x));
    p.setY(i,groundHeight(x,z));
    const patch=.5+.2*Math.sin(x*.56+z*.32)+.16*Math.cos(x*.17-z*.32);
    tint.copy(grassA).lerp(grassB,patch);
    tint.lerp(bankColor,Math.max(1-THREE.MathUtils.smoothstep(river,1.5,3.1),1-THREE.MathUtils.smoothstep(pondRadius(x,z),1.06,1.36)));
    // Path ribbons supply the surface; grass remains crisp at the verge.
    tint.multiplyScalar(.97+rand()*.06);tint.toArray(colors,i*3);
  }
  terrainGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3));terrainGeometry.computeVertexNormals();
  const terrain=new THREE.Mesh(terrainGeometry,surfaces.terrainGrass);terrain.receiveShadow=true;scene.add(terrain);
  // The playable village remains finite, but distant land continues beyond it.
  // A light outer ring avoids the square-board silhouette in the map overview.
  const backdropParts=[],edges=[-600,-75,75,600];
  for(let row=0;row<3;row++)for(let col=0;col<3;col++){
    if(row===1&&col===1)continue;
    const x0=edges[col],x1=edges[col+1],z0=edges[row],z1=edges[row+1];
    const g=new THREE.PlaneGeometry(x1-x0,z1-z0,col===1?220:64,row===1?220:64);g.rotateX(-Math.PI/2);g.translate((x0+x1)/2,0,(z0+z1)/2);
    const p=g.attributes.position,c=new Float32Array(p.count*3);
    for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,groundHeight(x,z));tint.copy(grassA).lerp(grassB,.5+.12*Math.sin(x*.045+z*.018)+.10*Math.cos(x*.023-z*.033));tint.toArray(c,i*3);}
    g.setAttribute('color',new THREE.BufferAttribute(c,3));g.computeVertexNormals();backdropParts.push(g);
  }
  const backdrop=new THREE.Mesh(mergeGeometries(backdropParts),terrain.material);backdrop.receiveShadow=true;scene.add(backdrop);backdropParts.forEach(g=>g.dispose());
  const riverGeometry=new THREE.BufferGeometry(),rverts=[],ruvs=[],rindices=[];
  const riverSegments=1264;
  for(let i=0;i<=riverSegments;i++){
    const x=-600+i*1200/riverSegments,zc=riverZ(x);rverts.push(x,-.36,zc-1.45,x,-.36,zc+1.45);ruvs.push(i/18,0,i/18,1);
    if(i<riverSegments){const n=i*2;rindices.push(n,n+1,n+2,n+1,n+3,n+2);}
  }
  riverGeometry.setAttribute('position',new THREE.Float32BufferAttribute(rverts,3));riverGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(ruvs,2));riverGeometry.setIndex(rindices);riverGeometry.computeVertexNormals();
  const waterMaterial=new THREE.MeshPhysicalMaterial({color:0x397f91,roughness:.22,metalness:.14,clearcoat:.8,clearcoatRoughness:.2});
  waterMaterial.onBeforeCompile=shader=>{shader.uniforms.uTime=windUniform;shader.vertexShader='uniform float uTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y+=sin(position.x*1.5+uTime*.8)*.025+sin(position.z*3.+uTime)*.02;');};
  const water=new THREE.Mesh(riverGeometry,waterMaterial);water.receiveShadow=true;scene.add(water);
  for(let i=0;i<35;i++){const x=-40+rand()*80;const m=box(scene,x,-.315,riverZ(x)+(rand()-.5)*2,.3+rand()*.55,.006,.016,0xa3d3ce);m.castShadow=false;m.userData.seed=rand()*10;waterGlints.push(m);}
  const bridges=createBridgeSurfaces(riverZ,groundHeight);
  const bridgeFloors=[];
  for(const bridge of bridges){
    const {x,z,halfWidth,halfLength,rampLength,railX,railHalfLength}=bridge;
    const g=new THREE.Group();g.name=`bridge-${x}`;scene.add(g);
    // The same height function shapes every plank and positions actors' feet.
    const sections=[[-halfLength-rampLength,-halfLength,5],[-halfLength,halfLength,18],[halfLength,halfLength+rampLength,5]];
    for(const [start,end,count]of sections)for(let i=0;i<count;i++){
      const depth=(end-start)/count,center=start+(i+.5)*depth;
      const geometry=new THREE.BoxGeometry(halfWidth*2,.12,depth-.012,16,1,4);
      const vertices=geometry.attributes.position;
      for(let v=0;v<vertices.count;v++){
        const px=x+vertices.getX(v),pz=z+center+vertices.getZ(v);
        vertices.setXYZ(v,px,bridge.height(px,pz)-(vertices.getY(v)<0?.12:0),pz);
      }
      geometry.computeVertexNormals();
      const plank=new THREE.Mesh(geometry,i%3?surfaces.bridgeWood:surfaces.bridgeWoodLight);plank.castShadow=plank.receiveShadow=true;g.add(plank);bridgeFloors.push(plank);
    }
    for(const sign of [-1,1]){
      for(const zz of [-railHalfLength,0,railHalfLength]){cyl(g,x+sign*railX,.69,z+zz,.07,.08,1.25,0x705e48,8);sphere(g,x+sign*railX,1.33,z+zz,.095,0x9b7c50);}
      lineBetween(g,[x+sign*railX,1.04,z-railHalfLength],[x+sign*railX,1.24,z],.055,0x9b7c50);lineBetween(g,[x+sign*railX,1.24,z],[x+sign*railX,1.04,z+railHalfLength],.055,0x9b7c50);
    }
  }

  const gardenBeds=buildArrivalGround({scene,roads,groundHeight,riverZ,rand,surfaceMaterials:surfaces});
  for(const bed of gardenBeds)blockers.push({x:bed.x,z:bed.z,w:bed.w/2,d:bed.d/2});

  // Load one authored workshop family and genuine CC0 textured vegetation.
  const [arrivalResult,companionResult,foliageResult,adobeResult]=await Promise.allSettled([
    loader.loadAsync('./assets/arrival.glb'),loader.loadAsync('./assets/companion.glb'),loader.loadAsync('./assets/foliage/foliage.glb'),loader.loadAsync('./assets/adobe-lab.glb')
  ]);
  const arrival=arrivalResult.status==='fulfilled'?arrivalResult.value.scene:null;
  const adobeModel=adobeResult.status==='fulfilled'?adobeResult.value.scene:null;
  const foliage=foliageResult.status==='fulfilled'?foliageResult.value.scene:null;
  const companionModel=companionResult.status==='fulfilled'?companionResult.value.scene:null;
  function prepareModel(model){model.traverse(obj=>{if(!obj.isMesh)return;obj.castShadow=obj.receiveShadow=true;for(const material of [].concat(obj.material)){material.roughness=Math.max(material.roughness??.8,.65);if(material.map)material.map.anisotropy=4;if(material.alphaTest>0||/leaf|leaves|grass|flower/i.test(material.name)){material.side=THREE.DoubleSide;material.transparent=false;material.alphaTest=Math.max(material.alphaTest,.4);}}});}
  if(arrival)prepareModel(arrival);if(adobeModel)prepareModel(adobeModel);
  if(companionModel)prepareModel(companionModel);
  if(foliage)prepareModel(foliage);
  const secondary=buildSecondaryLandmarks({THREE,scene,groundHeight,box,cyl,sphere,roof,add,mat,shadow,lineBetween,C,blockers,targets,flagCloths});
  const landmarkState=data.places.map(place=>{
    const loc=layout[place.id];const copy={...place,x:loc.x,z:loc.z};
    if(['mrfoundry','adobe'].includes(place.id)&&arrival){
      const model=(place.id==='adobe'&&adobeModel?adobeModel:arrival).clone(true);model.position.set(loc.x,groundHeight(loc.x,loc.z),loc.z);
      const scale=place.id==='mrfoundry'?1:.92;model.scale.setScalar(scale);
      model.traverse(o=>{if(!o.isMesh)return;o.userData.placeId=place.id;targets.push(o);
      });scene.add(model);
      blockers.push({x:loc.x,z:loc.z,w:loc.w/2+.2,d:loc.d/2-.2});
    }else if(secondary[place.id]){const before=scene.children.length;secondary[place.id](copy);for(const object of scene.children.slice(before))distantBuildings.push({object,x:loc.x,z:loc.z});}
    const label=document.createElement('button');label.className='landmark-label';label.dataset.place=place.id;label.style.setProperty('--place-color',place.color);label.setAttribute('aria-label',`Walk to ${place.title}`);
    const dot=document.createElement('span');dot.className='label-dot';dot.setAttribute('aria-hidden','true');const text=document.createElement('span');text.textContent=place.title;label.append(dot,text);document.getElementById('landmark-labels').append(label);label.addEventListener('click',()=>ui.walkTo(place.id));
    return {place,loc,label,anchor:new THREE.Vector3(loc.x,loc.h+.7,loc.z),entry:new THREE.Vector3(loc.x,groundHeight(loc.x,loc.z+loc.d/2+1.1),loc.z+loc.d/2+1.1)};
  });

  // Curated authored foliage is instanced, preserving detailed silhouettes and texture atlases.
  const environmentRoots=[];
  function addInstances(name,placements){
    const source=foliage?.children.find(child=>child.name.startsWith(name));if(!source||!placements.length)return;
    source.updateMatrixWorld(true);const inverse=new THREE.Matrix4().copy(source.matrixWorld).invert();
    if(/^Rock/.test(name)){
      const bounds=new THREE.Box3();source.traverse(mesh=>{if(mesh.isMesh){mesh.geometry.computeBoundingBox();bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld)));}});
      for(const v of placements){const transform=new THREE.Matrix4().compose(new THREE.Vector3(v.x,0,v.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),v.r),new THREE.Vector3(v.s,v.s,v.s));const b=bounds.clone().applyMatrix4(transform),center=b.getCenter(new THREE.Vector3()),size=b.getSize(new THREE.Vector3());blockers.push({x:center.x,z:center.z,w:size.x/2,d:size.z/2});}
    }
    source.traverse(mesh=>{if(!mesh.isMesh)return;
      const geometry=mesh.geometry.clone();const local=new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld);geometry.applyMatrix4(local);
      const material=mesh.material.clone();if(/^Rock/.test(name)&&surfaces.stoneBump){material.bumpMap=surfaces.stoneBump;material.bumpScale=.018;material.roughnessMap=surfaces.stoneRoughness;material.roughness=.95;}const leaves=/leaf|leaves|grass|flower/i.test(material.name);
      if(leaves){
        material.side=THREE.DoubleSide;material.alphaTest=Math.max(material.alphaTest,.3);material.transparent=false;material.customProgramCacheKey=()=>material.name;
        material.onBeforeCompile=shader=>{shader.uniforms.uWind=windUniform;shader.vertexShader='uniform float uWind;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat sway=sin(uWind*.8+position.x*.7+position.z*.5)*.022; transformed.x += sway*max(position.y,0.);');if(/TwistedTree/i.test(material.name))shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\ndiffuseColor.rgb=vec3(.22,.38,.11);');};
      }
      const instanced=new THREE.InstancedMesh(geometry,material,placements.length);instanced.castShadow=true;instanced.receiveShadow=true;const temp=new THREE.Object3D();
      placements.forEach((v,i)=>{temp.position.set(v.x,groundHeight(v.x,v.z)+v.y,v.z);temp.rotation.set(0,v.r,0);temp.scale.setScalar(v.s);temp.updateMatrix();instanced.setMatrixAt(i,temp.matrix);});
      instanced.instanceMatrix.needsUpdate=true;scene.add(instanced);environmentRoots.push(instanced);
    });
  }
  function nearBuilding(x,z,margin=2){return [...Object.values(layout),...SCENIC_PLACES].some(p=>Math.abs(x-p.x)<p.w/2+margin&&Math.abs(z-p.z)<p.d/2+margin);}
  const treeSets={CommonTree_2:[],CommonTree_4:[],TwistedTree_2:[],Pine_3:[]};
  const treeSamples=[];
  for(let i=0;i<600;i++){
    const x=(rand()-.5)*104,z=(rand()-.5)*100;
    if(Math.abs(x)<29&&z>24)continue;
    if(x>-14&&x<14&&z>7&&z<24)continue;
    if(roadDistance(x,z)<3.4||nearBuilding(x,z,3.2)||Math.abs(z-riverZ(x))<2.6)continue;
    if(treeSamples.some(p=>Math.hypot(p.x-x,p.z-z)<4.2))continue;
    const dist=Math.hypot(x+2,z-10);if(dist<5)continue;
    const set=i%5===0?'TwistedTree_2':i%3===0?'Pine_3':i%2?'CommonTree_2':'CommonTree_4';
    const v={x,z,y:0,r:rand()*Math.PI*2,s:.56+rand()*.35};treeSets[set].push(v);treeSamples.push(v);if(treeSamples.length>115)break;
  }
  // Distinct groves frame the garden, campus, studio and camp districts.
  for(const [x,z,s]of [[-37,3,.65],[-29,2,.65],[-36,-1,.72],[-30,-2,.62],[-29,-26,.73],[-20,-27,.72],[-28,-19,.65],[25,-21,.65],[27,-14,.72]])treeSets.CommonTree_2.push({x,z,y:0,r:rand()*6,s});
  for(const [x,z,s]of [[-27,25,.75],[-24,21,.7],[-18,22,.72],[-27,29,.75],[-17,30,.68],[-29,21,.66],[-19,31,.8],[-3,-37,.75],[7,-38,.7]])treeSets.Pine_3.push({x,z,y:0,r:rand()*6,s});
  // Deliberate foreground trees frame the arrival rather than a uniform scatter.
  treeSets.CommonTree_4.push({x:-15,z:14,y:0,r:.9,s:.55},{x:18,z:13,y:0,r:2,s:.55});
  for(const [name,placements]of Object.entries(treeSets)){addInstances(name,placements);for(const t of placements)blockers.push({x:t.x,z:t.z,w:.22+t.s*.18,d:.22+t.s*.18});}
  const fern=[],grass=[],flowers=[],rocks=[],bushes=[];
  for(let i=0;i<380;i++){
    const x=-35+rand()*72,z=-32+rand()*60,d=roadDistance(x,z),river=Math.abs(z-riverZ(x));
    if(nearBuilding(x,z,.8)||river<1.8||d<1.6)continue;
    if(x>-11&&x<4&&z>4.7&&z<15)continue;
    const v={x,z,y:0,r:rand()*Math.PI*2,s:.3+rand()*.3};
    if(i%11===0)rocks.push({...v,s:.22+rand()*.4});else if(i%6===0)bushes.push({...v,s:.22+rand()*.2});else if(i%3===0)fern.push({...v,s:.35+rand()*.3});else if(i%5===0)flowers.push(v);else grass.push({...v,s:.45+rand()*.4});
  }
  // Flower drifts around the campus gateway and the summer camp garden.
  for(const [cx,cz]of [[-36,7],[-29.5,7],[-26,28],[-18,28],[18,-13.4],[25.4,-13.4]])for(let i=0;i<16;i++){
    const x=cx+(rand()-.5)*2.0,z=cz+(rand()-.5)*1.15;
    if(roadDistance(x,z)<1.3)continue;flowers.push({x,z,y:0,r:rand()*6,s:.26+rand()*.08});
  }
  // Shoreline clusters describe the river bank and bridge landings.
  for(const x0 of [-25,-17,-13,-5,2,5,13,18,26])for(const side of [-1,1]){
    for(let i=0;i<6;i++){
      const x=x0+(rand()-.5)*2.2,z=riverZ(x)+side*(2.0+rand()*.8);
      if(nearBuilding(x,z,.8)||roadDistance(x,z)<1.5)continue;
      const v={x,z,y:0,r:rand()*6,s:.3+rand()*.24};
      if(i<2)rocks.push({...v,s:.25+rand()*.2});else if(i===2)fern.push(v);else grass.push({...v,s:.62+rand()*.2});
    }
  }
  // Repeated drifts of small plants read as deliberate beds, not random props.
  for(const bed of gardenBeds){
    for(let x=-bed.w/2+.26;x<bed.w/2-.1;x+=.40)for(let z=-bed.d/2+.25;z<bed.d/2-.1;z+=.45){
      const v={x:bed.x+x+(rand()-.5)*.1,z:bed.z+z,y:.04,r:rand()*6,s:.23+rand()*.09};
      if((Math.round(x*10)+Math.round(z*10))%3===0)fern.push({...v,s:.33});else flowers.push(v);
    }
  }
  addInstances('Fern_1',fern);addInstances('Grass_Common_Short',grass);addInstances('Flower_3_Group',flowers);addInstances('Rock_Medium_2',rocks);addInstances('Bush_Common',bushes);

  // Diegetic route signs and paving add scale at walking distance.
  function textSign(text,x,z,angle=0){
    const g=new THREE.Group();g.position.set(x,groundHeight(x,z),z);g.rotation.y=angle;scene.add(g);
    box(g,0,.65,0,.09,1.3,.1,0x72563c);box(g,0,1.18,.025,1.65,.44,.1,0xeadfbd);
    const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#eadfbd';ctx.fillRect(0,0,512,128);ctx.fillStyle='#39554e';ctx.font='600 41px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66);
    const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(1.59,.39),new THREE.MeshBasicMaterial({map:texture}));m.position.set(0,1.18,.081);g.add(m);
  }
  textSign('MRFoundry ↖',-7.2,8.5,.12);textSign('Adobe →',7.1,11.2,.08);textSign('Campus trail',-11.7,2.4,-.2);
  textSign('Berkeley ←',-16,-15.8,-.15);textSign('Pika Studio →',17.8,-12.1,-.08);textSign('Summer camp ↙',-23.8,18.2,.15);
  const villageDetails=buildVillageDetails({scene,groundHeight,riverZ});blockers.push(...villageDetails.blockers);
  const extension=buildOutdoorExtension({scene,groundHeight,waterMaterial});blockers.push(...extension.blockers);
  for(const[name,placements]of Object.entries(extension.trees)){
    const clear=placements.filter(p=>roadDistance(p.x,p.z)>2.6);
    addInstances(name,clear);for(const p of clear)blockers.push({x:p.x,z:p.z,w:.22+p.s*.18,d:.22+p.s*.18});
  }
  for(const[name,placements]of Object.entries(extension.plants))addInstances(name,placements.filter(p=>roadDistance(p.x,p.z)>1.3));
  textSign('River lookout →',36,10.7,-.12);textSign('Pine grove ↙',-29,33.4,.12);textSign('Hilltop trail ↑',3.6,-38.5,-.1);
  const scenicState=SCENIC_PLACES.map(place=>{
    const label=document.createElement('button');label.className='landmark-label';label.dataset.scenic=place.id;label.style.setProperty('--place-color',place.color);label.setAttribute('aria-label',`Walk to ${place.title}`);
    const dot=document.createElement('span');dot.className='label-dot';dot.setAttribute('aria-hidden','true');label.append(dot,document.createTextNode(place.title));document.getElementById('landmark-labels').append(label);label.addEventListener('click',()=>walkToScenic(place.id));
    return{place,label,anchor:new THREE.Vector3(place.x,place.height+4.2,place.z),entry:new THREE.Vector3(place.entry[0],place.height,place.entry[1])};
  });
  const mapStates=[...landmarkState,...scenicState];
  const outdoorObjects=scene.children.filter(object=>!object.isLight);
  // One conservative height atlas from rendered meshes, including every tree
  // instance. Large terrain/sky surfaces are handled by groundHeight instead.
  const flightBoxes=[],bounds=new THREE.Box3(),instanceMatrix=new THREE.Matrix4(),worldMatrix=new THREE.Matrix4();
  scene.updateMatrixWorld(true);
  for(const root of outdoorObjects)root.traverse(obj=>{
    if(!obj.isMesh||!obj.geometry)return;
    obj.geometry.computeBoundingBox();
    const record=matrix=>{
      bounds.copy(obj.geometry.boundingBox).applyMatrix4(matrix);
      if(bounds.max.x-bounds.min.x>30||bounds.max.z-bounds.min.z>30||bounds.max.y<.35)return;
      flightBoxes.push({minX:bounds.min.x,maxX:bounds.max.x,minZ:bounds.min.z,maxZ:bounds.max.z,top:bounds.max.y});
    };
    if(obj.isInstancedMesh){for(let i=0;i<obj.count;i++){obj.getMatrixAt(i,instanceMatrix);worldMatrix.multiplyMatrices(obj.matrixWorld,instanceMatrix);record(worldMatrix);}}
    else record(obj.matrixWorld);
  });
  const flightCeiling=createFlightEnvelope(flightBoxes,{limit:WORLD_LIMIT});
  // Landing folds the wings before passing surrounding obstacles. Keep a
  // separate conservative bound for the folded body, not the spread wings.
  const landingCeiling=createFlightEnvelope(flightBoxes,{limit:WORLD_LIMIT,cell:.5,radius:TRAVEL.charizard.radius+TRAVEL.charizard.axle});


  // Character and scanner companion. Character asset is optional during authoring.
  const trainer=new THREE.Group();trainer.position.set(-3.2,groundHeight(-3.2,9.8),9.8);scene.add(trainer);
  let mixer=null,idleAction=null,walkAction=null,trainerBody=null,avatar=null,limbs=[];
  let ridePending=null;
  let selectedTravel='walk',travelModel=null,viewMode='third',firstLookYaw=0,firstLookPitch=-.10,reverseHeld=false;
  const touchDrive={throttle:0,turn:0};
  const rideControl={speed:0,steer:0};
  let flightStatusTime=0,mountTime=0,flightLift=0,flightCruise=FLIGHT.cruise,flightLanding=false,flightPending=null;
  const flying=()=>!activeRoom&&selectedTravel==='charizard';
  const travelCache=new Map();
  const travelShape=()=>TRAVEL[activeRoom?'walk':selectedTravel];
  try{
    const gltf=await loader.loadAsync('./assets/trainer.glb');prepareModel(gltf.scene);const bounds=new THREE.Box3().setFromObject(gltf.scene),size=bounds.getSize(new THREE.Vector3());const scale=1.8/size.y;gltf.scene.scale.setScalar(scale);gltf.scene.position.y=-bounds.min.y*scale;
    // The exported face points 60° right of +Z in Idle and Walk. Correct the
    // visual model, leaving the navigation heading and MRI companion at +Z.
    gltf.scene.rotation.y=-Math.PI/3;trainer.add(gltf.scene);avatar=gltf.scene;
    mixer=new THREE.AnimationMixer(gltf.scene);const idle=gltf.animations.find(a=>/idle/i.test(a.name))||gltf.animations[0],walk=gltf.animations.find(a=>a.name==='Walk')||gltf.animations.find(a=>/walk|run/i.test(a.name));if(idle)idleAction=mixer.clipAction(idle).play();if(walk){walkAction=mixer.clipAction(walk);walkAction.timeScale=1.65;}
  }catch{
    trainerBody=new THREE.Group();trainer.add(trainerBody);avatar=trainerBody;
    const torso=box(trainerBody,0,.95,0,.46,.65,.33,0x477c91);sphere(trainerBody,0,1.48,0,.25,0xe1b18b,1,1.12,.95);
    sphere(trainerBody,0,1.64,-.04,.26,0x243d40,1,.66,1);
    for(const s of [-1,1])sphere(trainerBody,s*.085,1.48,.232,.024,0x253b3d,1,1.3,1);
    box(trainerBody,0,1.0,-.25,.38,.49,.2,0xae7f42);
    for(const s of [-1,1]){const arm=new THREE.Group();arm.position.set(s*.29,1.12,0);trainerBody.add(arm);cyl(arm,0,-.19,0,.075,.063,.41,0x477c91,12);sphere(arm,0,-.43,0,.066,0xe1b18b);limbs.push(arm);const leg=new THREE.Group();leg.position.set(s*.13,.64,0);trainerBody.add(leg);box(leg,0,-.21,0,.15,.42,.18,0x2d4653);box(leg,0,-.48,.05,.19,.14,.29,0xe8dac1);limbs.push(leg);}
  }
  const companion=new THREE.Group();scene.add(companion);if(companionModel){companion.add(companionModel);const b=new THREE.Box3().setFromObject(companionModel),s=b.getSize(new THREE.Vector3());companionModel.scale.setScalar(.86/s.y);companionModel.position.y=-b.min.y*.86/s.y;}companion.position.set(-3,groundHeight(-3,10.4),10.4);
  const followers=[
    {id:'mri',model:companion,motion:{bob:.025,roll:.012,pace:9}},
    {id:'camera',model:createCameraCompanion(),motion:{bob:.035,roll:.018,pace:11}},
    {id:'mac',model:createMacCompanion(),motion:{bob:.020,roll:.025,pace:8}},
    {id:'prism',model:createPrismCompanion(),motion:{bob:.055,roll:.012,pace:5}},
    {id:'music',model:createMusicCompanion(),motion:{bob:.045,roll:.035,pace:10}}
  ].map((f,index)=>{
    Object.assign(f,{enabled:f.id==='mri',arc:0,deploy:1,phase:index*1.7});
    f.model.visible=f.enabled;scene.add(f.model);return f;
  });
  const footprints=[],footMat=new THREE.MeshBasicMaterial({color:0x8f784c,transparent:true,opacity:0,depthWrite:false});
  for(let i=0;i<20;i++){const m=new THREE.Mesh(new THREE.CircleGeometry(.075,12),footMat.clone());m.rotation.x=-Math.PI/2;m.scale.y=1.5;m.visible=false;scene.add(m);footprints.push({m,age:8});}
  let footIndex=0,footTime=0;
  const destinationMarker=new THREE.Group();scene.add(destinationMarker);destinationMarker.visible=false;
  const marker=new THREE.Mesh(new THREE.RingGeometry(.28,.34,40),new THREE.MeshBasicMaterial({color:0xf3d17b,transparent:true,opacity:.85,depthWrite:false}));marker.rotation.x=-Math.PI/2;destinationMarker.add(marker);

  // Movement follows the same accessible place IDs, over a navigation grid.
  const keys=new Set();let path=[],pathIndex=0,arrivalId=null,arrivalAction=null,navigationRevision=0,paused=false,nearest=null,time=0,lastTime=0,previousMoving=false,routeTimedOut=false;
  const STEP=.6,MIN=-WORLD_LIMIT,MAX=WORLD_LIMIT,N=Math.ceil((MAX-MIN)/STEP)+1;
  function walkable(x,z,radius=WALKER_RADIUS){
    if(activeRoom){const b=activeRoom.bounds;if(x<b.minX+radius||x>b.maxX-radius||z<b.minZ+radius||z>b.maxZ-radius)return false;return !activeRoom.blockers.some(b=>Math.abs(x-b.x)<b.w+radius&&Math.abs(z-b.z)<b.d+radius);}
    if(x<MIN+radius||x>MAX-radius||z<MIN+radius||z>MAX-radius)return false;
    if(blockers.some(b=>Math.abs(x-b.x)<b.w+radius&&Math.abs(z-b.z)<b.d+radius))return false;
    if(pondRadius(x,z)<1.08+radius/5.5)return false;
    if(Math.abs(x-54)<3.95-radius&&Math.abs(z+9)<2.3-radius)return true;
    if(bridges.some(bridge=>bridge.blocks(x,z,radius)))return false;
    if(Math.abs(z-riverZ(x))<1.45+radius&&!bridges.some(bridge=>bridge.supports(x,z,radius)))return false;
    return true;
  }
  function groundForWalk(x,z){
    if(activeRoom)return 0;
    const bridge=bridges.find(bridge=>bridge.contains(x,z));
    if(bridge)return bridge.height(x,z);
    const base=groundHeight(x,z);
    if(Math.abs(x-54)<3.95&&Math.abs(z+9)<2.3)return groundHeight(54,-9)+.14;
    if(Math.hypot(x+49,z-41)<4.55||Math.hypot(x-17,z+53)<4.1)return base+.065;
    return base;
  }

  // All companions follow the same travelled polyline in single file. Arc-length
  // spacing prevents sideways formation, corner cutting and delayed overshoot.
  let followerLead=1.4;const followerSpacing=1.3;
  const trailLength=11;
  const trailCapacity=1024,trailX=new Float64Array(trailCapacity),trailZ=new Float64Array(trailCapacity),trailArc=new Float64Array(trailCapacity);
  let trailFirst=0,trailLast=0,trailDistance=0;
  function followerArc(rank){return Math.max(trailArc[trailFirst],trailDistance-followerLead-rank*followerSpacing);}
  function placeFollower(f,animate,dt,occupants=[]){
    let first=trailFirst;
    while(first!==trailLast&&trailArc[(first+1)%trailCapacity]<f.arc)first=(first+1)%trailCapacity;
    const next=first===trailLast?first:(first+1)%trailCapacity,span=trailArc[next]-trailArc[first];
    const t=span>1e-6?THREE.MathUtils.clamp((f.arc-trailArc[first])/span,0,1):0;
    let x=THREE.MathUtils.lerp(trailX[first],trailX[next],t),z=THREE.MathUtils.lerp(trailZ[first],trailZ[next],t);
    if(animate){const resolved=stepCompanion({current:f.model.position,desired:{x,z},occupants,walkable:(x,z)=>walkable(x,z),dt,radius:.34,footprintRadius:.12,maxSpeed:Math.max(5.2,travelShape().speed*1.2),state:f.navigationState||{}});x=resolved.x;z=resolved.z;f.navigationState=resolved.state;}
    const dx=x-f.model.position.x,dz=z-f.model.position.z;
    if(animate)occupants.push({x,z,radius:.34,vx:dt?dx/dt:0,vz:dt?dz/dt:0});
    const walking=animate&&dx*dx+dz*dz>1e-8;
    if(walking){const goal=Math.atan2(dx,dz),turn=Math.atan2(Math.sin(goal-f.model.rotation.y),Math.cos(goal-f.model.rotation.y));f.model.rotation.y+=turn*Math.min(1,dt*16);}
    else if(!animate&&span>1e-6)f.model.rotation.y=Math.atan2(trailX[next]-trailX[first],trailZ[next]-trailZ[first]);
    const motion=f.motion,phase=time*(motion?.pace||9)+(f.phase||0),moving=walking&&!quietMotion;
    f.model.position.set(x,groundForWalk(x,z)+(moving?Math.abs(Math.sin(phase))*(motion?.bob||.025):0),z);
    f.model.rotation.z=moving?Math.sin(phase)*(motion?.roll||0):0;
  }
  function seedCompanionTrail(){
    // A new scene has no travelled history. Build a short, collision-checked
    // entrance queue, curving along the free aisle instead of through a wall.
    // This runs only at scene changes; no route-search allocations in the tick.
    const points=[{x:trainer.position.x,z:trainer.position.z}],step=.35;
    const turns=[0,Math.PI/12,-Math.PI/12,Math.PI/6,-Math.PI/6,Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2];
    let best=points.slice(),attempts=0;
    function clearSegment(a,b){
      for(let i=1;i<=3;i++){
        const x=a.x+(b.x-a.x)*i/3,z=a.z+(b.z-a.z)*i/3;
        if(!walkable(x,z)||!walkable(x+.18,z)||!walkable(x-.18,z)||!walkable(x,z+.18)||!walkable(x,z-.18))return false;
      }
      for(let i=0;i<points.length-4;i++)if(Math.hypot(b.x-points[i].x,b.z-points[i].z)<1.02)return false;
      return true;
    }
    function extend(yaw){
      if(points.length>best.length)best=points.slice();
      if((points.length-1)*step>=trailLength)return true;
      if(++attempts>1600)return false;
      const end=points[points.length-1];
      for(const turn of turns){
        const heading=yaw+turn,next={x:end.x+Math.sin(heading)*step,z:end.z+Math.cos(heading)*step};
        if(!clearSegment(end,next)||!walkable(next.x+Math.sin(heading)*1.2,next.z+Math.cos(heading)*1.2))continue;
        points.push(next);if(extend(heading))return true;points.pop();
      }
      return false;
    }
    extend(trainer.rotation.y+Math.PI);
    return best.reverse();
  }
  function resetCompanionTrail(){
    const seed=seedCompanionTrail();trailFirst=0;trailLast=seed.length-1;trailDistance=0;
    seed.forEach((p,i)=>{if(i)trailDistance+=Math.hypot(p.x-seed[i-1].x,p.z-seed[i-1].z);trailX[i]=p.x;trailZ[i]=p.z;trailArc[i]=trailDistance;});
    let rank=0;
    for(const f of followers){f.navigationState={};f.arc=followerArc(rank);if(f.enabled)rank++;placeFollower(f,false,0);}
  }
  function updateCompanion(dt){
    if(flying()){
      let leader=trainer.position,heading=trainer.rotation.y;
      for(const f of followers){if(!f.enabled)continue;
        const gap=leader===trainer.position?3.7:1.4;
        const target=new THREE.Vector3(leader.x-Math.sin(heading)*gap,leader.y+1.2,leader.z-Math.cos(heading)*gap);
        target.y=Math.max(target.y,flightCeiling(target.x,target.z)+1.1);
        f.model.position.lerp(target,Math.min(1,dt*5));
        f.model.rotation.y+=angleDelta(f.model.rotation.y,heading)*Math.min(1,dt*7);
        f.model.rotation.z=0;
        if(f.deploy<1){f.deploy=Math.min(1,f.deploy+dt/.4);f.model.scale.setScalar(reducedMotion?1:Math.max(.001,1-(1-f.deploy)**3));}
        leader=f.model.position;heading=f.model.rotation.y;
      }return;
    }
    const step=Math.hypot(trainer.position.x-trailX[trailLast],trainer.position.z-trailZ[trailLast]);
    if(step>1e-6){trailDistance+=step;trailLast=(trailLast+1)%trailCapacity;if(trailLast===trailFirst)trailFirst=(trailFirst+1)%trailCapacity;trailX[trailLast]=trainer.position.x;trailZ[trailLast]=trainer.position.z;trailArc[trailLast]=trailDistance;}
    while(trailFirst!==trailLast&&trailArc[(trailFirst+1)%trailCapacity]<trailDistance-trailLength)trailFirst=(trailFirst+1)%trailCapacity;
    const shape=travelShape(),offsets=footprintOffsets(shape);
    const occupants=offsets.map(offset=>({x:trainer.position.x+Math.sin(trainer.rotation.y)*offset,z:trainer.position.z+Math.cos(trainer.rotation.y)*offset,radius:shape.radius,vx:dt?direction.x/dt:0,vz:dt?direction.z/dt:0}));
    let rank=0;
    for(const f of followers){
      if(!f.enabled)continue;
      const target=followerArc(rank++);
      const pace=Math.max(5,shape.speed*1.25);f.arc+=THREE.MathUtils.clamp(target-f.arc,-dt*pace,dt*pace);placeFollower(f,true,dt,occupants);
      if(f.deploy<1){f.deploy=Math.min(1,f.deploy+dt/.4);const t=1-(1-f.deploy)**3;f.model.scale.setScalar(reducedMotion?1:Math.max(.001,t));}
    }
  }
  function getCompanions(){return Object.fromEntries(followers.map(f=>[f.id,f.enabled]));}
  function setCompanion(id,enabled){
    const f=followers.find(f=>f.id===id);if(!f||f.enabled===Boolean(enabled))return;
    f.enabled=Boolean(enabled);f.model.visible=f.enabled;
    if(f.enabled){
      // A send-out changes the ordering. Space the party immediately so a new
      // first companion does not materialize on top of an existing follower.
      if(flying()){f.model.position.copy(trainer.position);f.model.position.y+=1.2;}
      let rank=0;
      for(const member of followers){if(!member.enabled)continue;member.arc=followerArc(rank++);if(!flying())placeFollower(member,false,0);}
      f.deploy=reducedMotion?1:0;f.model.scale.setScalar(reducedMotion?1:.001);
    }
    document.dispatchEvent(new CustomEvent('world:companions-changed',{detail:getCompanions()}));
  }
  resetCompanionTrail();
  function updateTravelVisual(){
    if(travelModel)travelModel.group.visible=false;
    const mounted=!activeRoom&&selectedTravel!=='walk';
    avatar.visible=!mounted&&viewMode!=='first';
    if(mounted){
      if(!travelCache.has(selectedTravel)){const model=createTravelModel(selectedTravel);travelCache.set(selectedTravel,model);trainer.add(model.group);}
      travelModel=travelCache.get(selectedTravel);travelModel.group.visible=true;travelModel.setFirstPerson?.(viewMode==='first');
    }
    followerLead=mounted?travelShape().axle+travelShape().radius+.85:1.4;
    document.dispatchEvent(new CustomEvent('world:travel-changed',{detail:{id:selectedTravel,indoors:Boolean(activeRoom)}}));
  }
  function requestFlightLanding({travel=null,id=null,action=null,point=trainer.position}={}){
    // A replacement request must cancel the old destination even if there is
    // no safe landing for the newly requested ride.
    clearMovement();
    const shape=TRAVEL[travel||'walk'];
    const spot=findLandingSpot(point,{shape,ground:groundForWalk,ceiling:landingCeiling,limit:WORLD_LIMIT,
      clear:(x,z,shape)=>footprintClear(x,z,trainer.rotation.y,shape,walkable)&&footprintClear(x,z,trainer.rotation.y,TRAVEL.charizard,walkable)});
    if(!spot){const message='No clear landing spot here. Fly toward an open path first.';travelStatus(null,message);ui.announce(message);return false;}
    flightPending={travel,id,action,yaw:trainer.rotation.y};path=[spot];pathIndex=0;leaveOverview();
    ui.announce(travel?'Flying to a clear spot to land and change rides.':'Landing near the entrance.');return true;
  }
  const rideName=id=>({'walk':'walking','bicycle':'Bicycle','model-s':'Model S','cybertruck':'Cybertruck','porsche':'Porsche 911','horse':'Horse','charizard':'Charizard'}[id]||id);
  function travelStatus(id,message){document.dispatchEvent(new CustomEvent('world:travel-status',{detail:{id,message}}));}
  function cancelRideSwitch(){if(ridePending||flightPending?.travel){ridePending=null;flightPending=null;flightLanding=false;travelStatus(null,'');}}
  function applyTravel(id){
    clearMovement();selectedTravel=id;flightCruise=FLIGHT.cruise;
    firstLookYaw=0;firstLookPitch=-.10;updateTravelVisual();resetCompanionTrail();
    doorCooldownUntil=performance.now()+600;
    travelStatus(null,id==='walk'?'Back on foot.':`Ready to explore with ${rideName(id)}.`);
    ui.announce(id==='charizard'?'Taking flight. Arrows move on screen; Space rises and C descends.':`Switched to ${rideName(id)}.`);
    canvas.focus({preventScroll:true});
  }
  function setTravel(id){
    if(!TRAVEL[id]||activeRoom)return;
    if(id===selectedTravel){if(ridePending||flightPending?.travel)clearMovement();return;}
    if(flying()){if(requestFlightLanding({travel:id}))travelStatus(id,`Landing to switch to ${rideName(id)}…`);return;}
    clearMovement();
    const plan=planRideSwitch({x:trainer.position.x,z:trainer.position.z,yaw:trainer.rotation.y},
      {fromShape:travelShape(),toShape:TRAVEL[id],walkable,limit:WORLD_LIMIT});
    if(!plan){const message='No room nearby for this ride. Follow the path to an open area, then try again.';travelStatus(null,message);ui.announce(message);return;}
    if(!plan.route.length&&Math.abs(angleDelta(trainer.rotation.y,plan.placement.yaw))<1e-8){applyTravel(id);return;}
    ridePending={id,...plan,index:0,elapsed:0};
    travelStatus(id,`Making room for ${rideName(id)}…`);
    ui.announce(`Moving to a clear spot for ${rideName(id)}.`);canvas.focus({preventScroll:true});
  }
  document.addEventListener('world:travel-select',event=>setTravel(event.detail?.id));
  function route(from,to){if(flying())return [{x:THREE.MathUtils.clamp(to.x,MIN+FLIGHT.radius,MAX-FLIGHT.radius),z:THREE.MathUtils.clamp(to.z,MIN+FLIGHT.radius,MAX-FLIGHT.radius)}];routeTimedOut=false;return findWalkingRoute({...from,yaw:trainer.rotation.y},to,{shape:travelShape(),walkable,min:MIN,max:MAX,onBudgetExceeded:()=>{routeTimedOut=true;}});}
  let overview=false,cameraYaw=.44,cameraPitch=.64,zoom=1,targetZoom=1,actualDistance=innerWidth<600?28:24,actualPitch=.64;
  const focus=new THREE.Vector3(-3.2,groundHeight(-3.2,9.8)+1.2,9.8),focusTarget=focus.clone(),exploreFocus=focus.clone();
  const eyePosition=new THREE.Vector3(),lookPosition=new THREE.Vector3();
  function setView(mode){
    if(!['first','third'].includes(mode))return;
    clearMovement();viewMode=mode;overview=false;firstLookYaw=0;firstLookPitch=-.10;
    focus.set(trainer.position.x,trainer.position.y+(flying()?1.8:1.2),trainer.position.z);focusTarget.copy(focus);
    actualDistance=(activeRoom?(activeRoom.camera.distance||19)*(innerWidth<600?1.75:1):innerWidth<600?28:24)/zoom;actualPitch=cameraPitch;
    updateOverviewButton();updateTravelVisual();resize();
    document.dispatchEvent(new CustomEvent('world:view-changed',{detail:{mode}}));
    ui.announce(mode==='first'?'First person. W and S move forward and back; A and D turn. Drag to look around. V returns to third person.':'Third person. The camera follows you smoothly and keeps the same orientation. Arrows move on screen; R reverses a ground ride.');
    canvas.focus({preventScroll:true});
  }
  document.addEventListener('world:view-select',event=>setView(event.detail?.mode));
  document.addEventListener('world:reverse',event=>{reverseHeld=Boolean(event.detail?.active);if(reverseHeld){cancelRideSwitch();navigationRevision++;path=[];pathIndex=0;arrivalId=null;arrivalAction=null;destinationMarker.visible=false;}});
  document.addEventListener('world:flight',event=>{flightLift=THREE.MathUtils.clamp(Number(event.detail?.lift)||0,-1,1);if(flightLift){cancelRideSwitch();navigationRevision++;path=[];flightPending=null;flightLanding=false;}});
  document.addEventListener('world:drive',event=>{touchDrive.throttle=THREE.MathUtils.clamp(Number(event.detail?.throttle)||0,-1,1);touchDrive.turn=THREE.MathUtils.clamp(Number(event.detail?.turn)||0,-1,1);if(touchDrive.throttle||touchDrive.turn){cancelRideSwitch();flightLanding=false;flightPending=null;navigationRevision++;path=[];pathIndex=0;arrivalId=null;arrivalAction=null;destinationMarker.visible=false;}});
  const zoomOut=document.getElementById('zoom-out'),zoomIn=document.getElementById('zoom-in'),overviewButton=document.getElementById('view-overview');
  function updateOverviewButton(){overviewButton.textContent=overview?'Explore':'Map';overviewButton.setAttribute('aria-pressed',String(overview));overviewButton.setAttribute('aria-label',overview?'Return to the trainer':'Show village map');}
  function leaveOverview(){
    if(overview){focus.copy(exploreFocus);actualDistance=(innerWidth<600?28:24)/zoom;actualPitch=cameraPitch;}
    overview=false;updateOverviewButton();
  }
  function setZoom(v){if(viewMode==='first')setView('third');leaveOverview();targetZoom=THREE.MathUtils.clamp(v,.6,1.7);zoomIn.disabled=targetZoom>=1.7;zoomOut.disabled=targetZoom<=.6;}
  zoomIn.addEventListener('click',()=>setZoom(targetZoom+.22));zoomOut.addEventListener('click',()=>setZoom(targetZoom-.22));
  updateOverviewButton();overviewButton.addEventListener('click',()=>{if(viewMode==='first')setView('third');if(overview)leaveOverview();else{exploreFocus.copy(focus);overview=true;updateOverviewButton();}});
  function queueArrival(id,action){const revision=navigationRevision;setTimeout(()=>{if(revision!==navigationRevision||paused||roomLoading)return;if(action)action();else if(id)enterInterior(id);},150);}
  function moveTo(point,id=null,action=null){
    if(flying()&&id){requestFlightLanding({id,point});return;}
    cancelRideSwitch();rideControl.speed=0;flightPending=null;flightLanding=false;
    if(id&&selectedTravel!=='walk'&&!activeRoom)point=point.clone().add(new THREE.Vector3(0,0,travelShape().axle+travelShape().radius));
    navigationRevision++;path=route(trainer.position,point);pathIndex=0;arrivalId=id;arrivalAction=action;leaveOverview();
    if(!path.length){destinationMarker.visible=false;const distance=Math.hypot(trainer.position.x-point.x,trainer.position.z-point.z),steps=Math.max(1,Math.ceil(distance/.16));let direct=true;for(let i=0;i<=steps;i++){const t=i/steps;if(!walkable(THREE.MathUtils.lerp(trainer.position.x,point.x,t),THREE.MathUtils.lerp(trainer.position.z,point.z,t))){direct=false;break;}}if(distance<(activeRoom?1.65:2.15)&&direct)queueArrival(id,action);else ui.announce(routeTimedOut?'Choose a nearer point along the path, then continue to your destination.':'That route is blocked. Try approaching from the path, or open the chapter in the field guide.');return;}
    const p=path.at(-1);destinationMarker.position.set(p.x,groundForWalk(p.x,p.z)+.06,p.z);destinationMarker.visible=true;
    landmarkState.forEach(s=>s.label.classList.toggle('active',s.place.id===id));
    if(id)ui.announce(`Heading to ${data.places.find(p=>p.id===id).title}.`);
  }
  function walkToScenic(id){if(activeRoom)exitInterior();const s=scenicState.find(s=>s.place.id===id);if(s)moveTo(s.entry,null,()=>ui.announce(`${s.place.title}. ${s.place.note}`));}
  function walkTo(id){if(activeRoom)exitInterior();const s=landmarkState.find(s=>s.place.id===id);if(s)moveTo(s.entry,id);}
  let doorTransitionPending=false,doorCooldownUntil=0,blockedDoorId=null,roomExitArmed=false;
  function updateDoorCrossings(moving,now){
    if(ridePending)return;
    if(activeRoom){
      const distance=Math.hypot(trainer.position.x-activeRoom.exit.position.x,trainer.position.z-activeRoom.exit.position.z);
      if(distance>1.8)roomExitArmed=true;
      if(moving&&roomExitArmed&&distance<1.15)queueDoorTransition(null,now);
      return;
    }
    if(blockedDoorId){const s=landmarkState.find(s=>s.place.id===blockedDoorId);if(!s||Math.hypot(trainer.position.x-s.entry.x,trainer.position.z-s.entry.z)>2.8)blockedDoorId=null;}
    if(!moving||selectedTravel==='charizard')return;
    for(const s of landmarkState){
      // A planned trip may pass another front porch; only its destination opens.
      if(pathIndex<path.length&&arrivalId!==s.place.id)continue;
      const dx=trainer.position.x-s.entry.x,dz=trainer.position.z-s.entry.z;
      // A broad front porch accepts an off-centre approach; walking past the
      // side or away from a door must never pull the visitor into the building.
      const approaching=dx*direction.x+dz*direction.z<-Math.hypot(dx,dz)*Math.hypot(direction.x,direction.z)*.55&&direction.z<-1e-6&&-direction.z>Math.abs(direction.x)*.28;
      if(s.place.id!==blockedDoorId&&dz>-.75&&Math.abs(dx)<2.1&&Math.hypot(dx,dz)<2.5+travelShape().axle&&(approaching||Math.hypot(dx,dz)<.9)){queueDoorTransition(s.place.id,now);break;}
    }
  }
  function queueDoorTransition(id,now){
    if(paused||roomLoading||doorTransitionPending||now<doorCooldownUntil)return;
    doorTransitionPending=true;const revision=navigationRevision;
    queueMicrotask(()=>{
      try{if(revision!==navigationRevision||paused||roomLoading)return;doorCooldownUntil=performance.now()+800;if(id)enterInterior(id);else exitInterior();}
      finally{doorTransitionPending=false;}
    });
  }
  function clearMovement(){cancelRideSwitch();rideControl.speed=0;rideControl.steer=0;flightLift=0;flightPending=null;flightLanding=false;reverseHeld=false;touchDrive.throttle=touchDrive.turn=0;navigationRevision++;path=[];pathIndex=0;arrivalId=null;arrivalAction=null;keys.clear();destinationMarker.visible=false;footprints.forEach(f=>{f.age=8;f.m.visible=false;});}
  function showExterior(show){outdoorObjects.forEach(object=>object.visible=show);mapStates.forEach(s=>s.label.hidden=!show);}
  async function enterInterior(id){
    if(roomLoading||activeRoom)return;const place=data.places.find(p=>p.id===id);if(!place)return;
    roomLoading=true;ui.setRoomLoading?.(place.title);clearMovement();const entryRevision=navigationRevision;ui.announce(`Entering ${place.title}.`);
    try{
      let room=roomCache.get(id);
      if(!room){const[{createInterior},{EXHIBITS}]=await Promise.all([import('./interiors.js'),import('./exhibits.js')]);room=await createInterior({place,exhibits:EXHIBITS[id]||[]});room.group.visible=false;scene.add(room.group);roomCache.set(id,room);}
      if(entryRevision!==navigationRevision||paused)return;
      outdoorReturn={position:trainer.position.clone(),yaw:cameraYaw,pitch:cameraPitch,zoom:targetZoom};
      activeRoom=room;roomPlaceId=id;roomExitArmed=false;doorCooldownUntil=performance.now()+800;showExterior(false);room.group.visible=true;
      trainer.position.copy(room.spawn);if(walkable(trainer.position.x,trainer.position.z-1.4))trainer.position.z-=1.4;trainer.rotation.y=Math.PI;firstLookYaw=0;firstLookPitch=-.10;updateTravelVisual();resetCompanionTrail();
      cameraYaw=room.camera.yaw??.15;cameraPitch=room.camera.pitch??.66;zoom=targetZoom=1;overview=false;updateOverviewButton();overviewButton.disabled=true;
      focus.set(trainer.position.x,trainer.position.y+1.2,trainer.position.z);focusTarget.copy(focus);actualDistance=(room.camera.distance||19)*(innerWidth<600?1.75:1);actualPitch=cameraPitch;
      scene.background.set(0xd6e0d8);scene.fog=null;sun.intensity=1.1;hemi.intensity=1.2;skyFill.intensity=.25;
      keys.clear();canvas.focus({preventScroll:true});canvas.setAttribute('aria-label',`Inside ${place.title}. Walk with WASD or arrows, select an exhibit, or return through the door.`);ui.setRoom?.(id);ui.announce(`Inside ${place.title}. Walk to a display to explore it, or return through the door.`);
      if(!reducedMotion)canvas.animate([{opacity:.25},{opacity:1}],{duration:420});
    }catch(error){console.warn('Room could not be opened:',error);if(entryRevision===navigationRevision&&!paused)ui.visit(id);}
    finally{roomLoading=false;ui.setRoomLoading?.(null);}
  }
  function exitInterior(){
    if(!activeRoom){if(roomLoading)clearMovement();return;}clearMovement();nearest=null;interactPrompt.hidden=true;blockedDoorId=roomPlaceId;doorCooldownUntil=performance.now()+800;activeRoom.group.visible=false;activeRoom=null;roomPlaceId=null;showExterior(true);
    trainer.position.copy(outdoorReturn.position);trainer.rotation.y=0;firstLookYaw=0;firstLookPitch=-.10;
    // Step clear of the doorway so the scanner can emerge immediately behind.
    let stepOut=0;for(let d=.1;d<=3.0;d+=.1){if(!walkable(trainer.position.x,trainer.position.z+d))break;stepOut=d;}trainer.position.z+=stepOut;
    trainer.position.y=groundForWalk(trainer.position.x,trainer.position.z);
    if(!footprintClear(trainer.position.x,trainer.position.z,trainer.rotation.y,TRAVEL[selectedTravel],walkable))selectedTravel='walk';
    flightCruise=FLIGHT.cruise;
    updateTravelVisual();resetCompanionTrail();
    cameraYaw=outdoorReturn.yaw;cameraPitch=outdoorReturn.pitch;zoom=targetZoom=outdoorReturn.zoom;overview=false;overviewButton.disabled=false;updateOverviewButton();
    focus.set(trainer.position.x,trainer.position.y+1.2,trainer.position.z);focusTarget.copy(focus);actualDistance=(innerWidth<600?28:24)/zoom;actualPitch=cameraPitch;
    scene.background.set(0xc5dfdd);scene.fog=outdoorFog;sun.intensity=2.65;hemi.intensity=1.85;skyFill.intensity=.6;
    canvas.setAttribute('aria-label','Explore Ke’s research village. Click to walk, or use WASD and arrow keys to move in screen directions.');ui.setRoom?.(null);ui.announce('Back in the village.');canvas.focus({preventScroll:true});
    if(!reducedMotion)canvas.animate([{opacity:.25},{opacity:1}],{duration:420});
  }
  function interact(){if(!nearest)return;if(nearest.kind==='exit')exitInterior();else if(nearest.kind==='exhibit')ui.openExhibit?.(nearest.exhibit);else enterInterior(nearest.place.id);}

  let quietMotion=reducedMotion;
  const quietButton=document.getElementById('quiet-mode');
  function updateQuiet(){quietButton.setAttribute('aria-pressed',String(quietMotion));quietButton.innerHTML=quietMotion?'▶ <span>Resume motion</span>':'Ⅱ <span>Pause motion</span>';}
  quietButton.addEventListener('click',()=>{quietMotion=!quietMotion;updateQuiet();});updateQuiet();
  const interactPrompt=document.getElementById('interact-prompt');interactPrompt.addEventListener('click',interact);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),pointers=new Map();let downPoint=null,dragged=false,pinchDistance=0;
  canvas.addEventListener('pointerdown',e=>{pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});downPoint={x:e.clientX,y:e.clientY};dragged=false;canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});if(pointers.size===2){const[a,b]=[...pointers.values()];pinchDistance=Math.hypot(a.x-b.x,a.y-b.y);}});
  canvas.addEventListener('pointermove',e=>{const old=pointers.get(e.pointerId);if(!old)return;
    pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pointers.size===2){const[a,b]=[...pointers.values()];const d=Math.hypot(a.x-b.x,a.y-b.y);if(pinchDistance)setZoom(targetZoom*d/pinchDistance);pinchDistance=d;dragged=true;return;}
    if(downPoint&&Math.hypot(e.clientX-downPoint.x,e.clientY-downPoint.y)>8)dragged=true;
    if(dragged){if(viewMode==='first'){firstLookYaw=THREE.MathUtils.clamp(firstLookYaw-(e.clientX-old.x)*.004,-Math.PI*.85,Math.PI*.85);firstLookPitch=THREE.MathUtils.clamp(firstLookPitch-(e.clientY-old.y)*.003,-.85,.7);}}
  });
  canvas.addEventListener('pointerup',e=>{const beganOnCanvas=pointers.has(e.pointerId);pointers.delete(e.pointerId);if(!beganOnCanvas)return;if(dragged||paused){if(!pointers.size)downPoint=null;return;}const rect=canvas.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(activeRoom?activeRoom.targets:targets,false)[0];if(hit){if(activeRoom){if(hit.object.userData.exit){moveTo(activeRoom.exit.approach,null,exitInterior);return;}const exhibit=activeRoom.exhibits.find(e=>e.id===hit.object.userData.exhibitId);if(exhibit)moveTo(exhibit.approach,null,()=>ui.openExhibit?.(exhibit));}else walkTo(hit.object.userData.placeId);return;}const ground=raycaster.intersectObjects(activeRoom?[activeRoom.floor]:[terrain,...bridgeFloors],false)[0];if(ground)moveTo(ground.point);downPoint=null;});
  canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);downPoint=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();setZoom(targetZoom-e.deltaY*.001);},{passive:false});
  canvas.addEventListener('keydown',e=>{if(paused)return;const k=e.key.toLowerCase();if(k==='v'&&!e.repeat){e.preventDefault();setView(viewMode==='first'?'third':'first');return;}if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','r',' ','c'].includes(k)){e.preventDefault();cancelRideSwitch();keys.add(k);flightLanding=false;flightPending=null;navigationRevision++;path=[];arrivalId=null;arrivalAction=null;
      if(overview){leaveOverview();camera.position.set(focus.x+Math.sin(cameraYaw)*Math.cos(actualPitch)*actualDistance,focus.y+Math.sin(actualPitch)*actualDistance,focus.z+Math.cos(cameraYaw)*Math.cos(actualPitch)*actualDistance);camera.lookAt(focus);camera.updateMatrixWorld();}
      overview=false;updateOverviewButton();destinationMarker.visible=false;}if((k==='e'||k==='enter')&&nearest){e.preventDefault();interact();}});
  window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();rideControl.speed=0;flightLift=0;reverseHeld=false;touchDrive.throttle=touchDrive.turn=0;});
  document.addEventListener('world:pause',()=>{paused=true;clearMovement();});document.addEventListener('world:resume',()=>{paused=false;});
  document.getElementById('reset-view').addEventListener('click',()=>{if(activeRoom)exitInterior();if(viewMode==='first')setView('third');cameraYaw=.44;cameraPitch=.64;setZoom(1);moveTo(new THREE.Vector3(-3.2,0,9.8));canvas.focus({preventScroll:true});window.scrollTo({top:0,behavior:reducedMotion?'instant':'smooth'});});
  const projection=new THREE.Vector3();
  function updateLabels(){const w=stage.clientWidth,h=stage.clientHeight;
    mapStates.forEach(s=>{if(activeRoom){s.label.hidden=true;return;}projection.copy(s.anchor).project(camera);const distance=trainer.position.distanceTo(s.entry);const visible=projection.z<1&&projection.x>-.95&&projection.x<.95&&projection.y>-.85&&projection.y<.8&&(overview||distance<13||arrivalId===s.place.id);s.label.hidden=!visible;if(visible){s.label.style.left=`${(projection.x*.5+.5)*w}px`;s.label.style.top=`${(-projection.y*.5+.5)*h}px`;}});
  }
  function overviewDistance(){
    // Fit the visited landscape and its labels, not the background terrain.
    const tanV=Math.tan(THREE.MathUtils.degToRad(camera.fov/2)),tanH=tanV*camera.aspect,pitch=.91;
    let distance=0;
    for(const place of [...Object.values(layout),...SCENIC_PLACES])for(const dx of [-7,7])for(const dz of [-6,6]){
      const x=place.x+dx,z=place.z+dz+5,y=(place.h||5)-1,across=Math.cos(cameraYaw)*x-Math.sin(cameraYaw)*z,along=Math.sin(cameraYaw)*x+Math.cos(cameraYaw)*z;
      const depth=along*Math.cos(pitch)+y*Math.sin(pitch),up=-along*Math.sin(pitch)+y*Math.cos(pitch);
      distance=Math.max(distance,Math.abs(across)/tanH+depth,Math.abs(up)/tanV+depth);
    }
    return distance*1.08;
  }
  function resize(){const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.fov=viewMode==='first'?FIRST_PERSON_FOV:w<600?49:42;camera.near=viewMode==='first'?.045:.15;camera.updateProjectionMatrix();}
  new ResizeObserver(resize).observe(stage);resize();
  let hidden=false,inView=true;document.addEventListener('visibilitychange',()=>{hidden=document.hidden;lastTime=0;keys.clear();rideControl.speed=0;flightLift=0;reverseHeld=false;touchDrive.throttle=touchDrive.turn=0;});
  new IntersectionObserver(([entry])=>{inView=entry.isIntersecting;lastTime=0;if(!inView){keys.clear();rideControl.speed=0;flightLift=0;reverseHeld=false;touchDrive.throttle=touchDrive.turn=0;interactPrompt.hidden=true;}},{rootMargin:'100px'}).observe(stage);
  const direction=new THREE.Vector3(),delta=new THREE.Vector3(),moveStart=new THREE.Vector3(),viewProjection=new THREE.Matrix4();
  let steering=0;
  function advance(vector,dt,remaining=Infinity,followingRoute=false,options={}){
    const shape=travelShape(),mounted=shape.axle>0;
    // Relative controls also work on foot: backing up preserves the view and
    // steering alone can turn safely without needing a nonzero world vector.
    const relative=!followingRoute&&(Number.isFinite(options.throttle)||Number.isFinite(options.turn));
    const forceReverse=mounted&&!followingRoute&&options.forceReverse===true;
    if(vector.lengthSq()<1e-10&&!relative&&!forceReverse){steering=0;return;}
    const oldYaw=trainer.rotation.y,goal=vector.lengthSq()>1e-10?Math.atan2(vector.x,vector.z):oldYaw;
    const throttle=relative?THREE.MathUtils.clamp(options.throttle||0,-1,1):0;
    // Explicit reverse preserves heading; screen directions instead turn the
    // vehicle toward the requested direction, even for a full U-turn.
    const reversing=forceReverse||(relative?throttle<0:mounted&&!followingRoute&&!options.screenDirection&&Math.abs(angleDelta(oldYaw,goal))>Math.PI/2);
    const steeringGoal=forceReverse?oldYaw:reversing?goal+Math.PI:goal;
    const turn=relative?THREE.MathUtils.clamp(options.turn||0,-1,1)*shape.turn*dt:angleDelta(oldYaw,steeringGoal);
    const requestedYaw=forceReverse?oldYaw:relative?oldYaw+turn:oldYaw+THREE.MathUtils.clamp(turn,-shape.turn*dt,shape.turn*dt);
    let nextYaw=oldYaw;
    steering=forceReverse?0:relative?THREE.MathUtils.clamp(options.turn||0,-1,1)*.55:THREE.MathUtils.clamp(turn,-.55,.55);
    if(mounted||relative){
      if(turnClear(trainer.position.x,trainer.position.z,oldYaw,requestedYaw,shape,walkable))nextYaw=requestedYaw;
      if(followingRoute){trainer.rotation.y=nextYaw;if(Math.abs(angleDelta(nextYaw,goal))>.025||!turnClear(trainer.position.x,trainer.position.z,nextYaw,goal,shape,walkable))return;nextYaw=goal;}
    }else nextYaw=oldYaw+turn*Math.min(1,dt*shape.turn);
    // Direction changes blend into forward arcs instead of waiting until
    // perfectly aligned, then jumping immediately to full speed.
    if(options.screenDirection&&options.motion){
      const alignment=mounted?Math.max(0,Math.cos(angleDelta(nextYaw,goal))):1;
      const desired=shape.speed*alignment*alignment;
      const rate=desired<options.motion.speed?shape.speed*6:shape.speed*4;
      options.motion.speed+=THREE.MathUtils.clamp(desired-options.motion.speed,-rate*dt,rate*dt);
      if(alignment===0)options.motion.speed=0;
    }
    const paceFor=yaw=>forceReverse?-.55:options.screenDirection&&options.motion?options.motion.speed/shape.speed:relative?throttle*(mounted&&throttle<0?.55:1):mounted?
      Math.max(reversing?.25:0,Math.cos(angleDelta(yaw,steeringGoal)))*(reversing?-.55:1):1;
    const candidateFor=yaw=>{
      const heading=mounted||relative?yaw:goal,pace=paceFor(yaw);
      const amount=Math.min(remaining,dt*shape.speed*Math.abs(pace))*Math.sign(pace);
      return {x:trainer.position.x+Math.sin(heading)*amount,z:trainer.position.z+Math.cos(heading)*amount};
    };
    let next=candidateFor(nextYaw),clear=motionClear(trainer.position,next,mounted||relative?nextYaw:goal,shape,walkable);
    // A safe rotation can still make the rear corner hit something during
    // translation. Prefer backing out at the previous heading to getting stuck
    // after that rotation; do not turn first and then discover no escape.
    if(!clear&&mounted&&reversing&&Math.abs(angleDelta(oldYaw,nextYaw))>1e-8){
      const straightBack=candidateFor(oldYaw);
      if(motionClear(trainer.position,straightBack,oldYaw,shape,walkable)){nextYaw=oldYaw;next=straightBack;clear=true;steering=0;}
    }
    trainer.rotation.y=nextYaw;
    // Perspective can turn a near-perpendicular ground arc into a tiny step
    // opposite the pressed arrow. Keep turning, but never take that step.
    if(options.screenProgress&&options.screenProgress(next)<-1e-12){
      if(options.motion)options.motion.speed=0;
      return;
    }
    if(!clear&&options.motion)options.motion.speed=0;
    if(clear){trainer.position.x=next.x;trainer.position.z=next.z;}
    else if(!mounted){
      const heading=relative?nextYaw:goal;
      const slideX={x:next.x,z:trainer.position.z};if(motionClear(trainer.position,slideX,heading,shape,walkable))trainer.position.x=slideX.x;
      const slideZ={x:trainer.position.x,z:next.z};if(motionClear(trainer.position,slideZ,heading,shape,walkable))trainer.position.z=slideZ.z;
    }
  }
  function advanceRideSwitch(dt){
    const pending=ridePending;
    if(!pending)return;
    pending.elapsed+=dt;
    if(pending.elapsed>15){cancelRideSwitch();travelStatus(null,'The path is tight here. Move onto the open path and try again.');return;}
    const waypoint=pending.route[pending.index];
    if(waypoint){
      delta.set(waypoint.x-trainer.position.x,0,waypoint.z-trainer.position.z);
      const distance=delta.length();
      if(distance<1e-5)pending.index++;
      else advance(delta.normalize(),dt*.65,distance,true);
      return;
    }
    const goal=pending.placement.yaw,change=angleDelta(trainer.rotation.y,goal);
    const nextYaw=trainer.rotation.y+THREE.MathUtils.clamp(change,-travelShape().turn*dt,travelShape().turn*dt);
    if(!turnClear(trainer.position.x,trainer.position.z,trainer.rotation.y,nextYaw,travelShape(),walkable)){
      cancelRideSwitch();travelStatus(null,'This spot is too tight. Move onto the path to change rides.');return;
    }
    trainer.rotation.y=nextYaw;
    if(Math.abs(angleDelta(nextYaw,goal))<1e-6){
      if(footprintClear(trainer.position.x,trainer.position.z,nextYaw,TRAVEL[pending.id],walkable))applyTravel(pending.id);
      else {cancelRideSwitch();travelStatus(null,'Move a little farther into the open before switching.');}
    }
  }
  function advanceRide(dt,{throttle=0,turn=0,brake=false}={}){
    const shape=travelShape(),oldYaw=trainer.rotation.y;
    if(reverseHeld||keys.has('r'))rideControl.steer=0;
    const control=stepRideControl(rideControl,{throttle,turn,brake},{...shape,id:selectedTravel},dt);
    steering=control.steer;
    const desiredYaw=oldYaw+control.yawDelta;
    let nextYaw=flying()||turnClear(trainer.position.x,trainer.position.z,oldYaw,desiredYaw,shape,walkable)?desiredYaw:oldYaw;
    const candidate=yaw=>({x:trainer.position.x+Math.sin(yaw)*control.speed*dt,z:trainer.position.z+Math.cos(yaw)*control.speed*dt});
    let next=candidate(nextYaw);
    if(flying()){
      const result=stepFlight(trainer.position,next,{dt,ground:groundForWalk,ceiling:flightCeiling,cruise:flightCruise,limit:WORLD_LIMIT});
      trainer.position.set(result.x,result.y,result.z);trainer.rotation.y=nextYaw;return;
    }
    let clear=motionClear(trainer.position,next,nextYaw,shape,walkable);
    if(!clear&&control.speed<0){const escape=candidate(oldYaw);if(motionClear(trainer.position,escape,oldYaw,shape,walkable)){next=escape;nextYaw=oldYaw;clear=true;steering=0;}}
    trainer.rotation.y=nextYaw;
    if(clear){trainer.position.x=next.x;trainer.position.z=next.z;}else rideControl.speed=0;
  }
  function advanceScreenFlight(vector,dt,screenProgress=null){
    const next={x:trainer.position.x,z:trainer.position.z};
    steering=0;
    if(vector.lengthSq()>1e-10){
      const goal=Math.atan2(vector.x,vector.z),turn=angleDelta(trainer.rotation.y,goal);
      trainer.rotation.y+=THREE.MathUtils.clamp(turn,-dt*travelShape().turn,dt*travelShape().turn);
      steering=THREE.MathUtils.clamp(turn,-.55,.55);
      const alignment=Math.max(0,Math.cos(angleDelta(trainer.rotation.y,goal)));
      const desired=travelShape().speed*alignment*alignment;
      const rate=travelShape().speed*(desired<rideControl.speed?6:4);
      rideControl.speed+=THREE.MathUtils.clamp(desired-rideControl.speed,-rate*dt,rate*dt);
      if(alignment===0)rideControl.speed=0;
      next.x+=Math.sin(trainer.rotation.y)*dt*rideControl.speed;
      next.z+=Math.cos(trainer.rotation.y)*dt*rideControl.speed;
    }else rideControl.speed=0;
    if(screenProgress&&screenProgress(next)<-1e-12){next.x=trainer.position.x;next.z=trainer.position.z;rideControl.speed=0;}
    const result=stepFlight(trainer.position,next,{dt,ground:groundForWalk,ceiling:flightCeiling,cruise:flightCruise,limit:WORLD_LIMIT});
    trainer.position.set(result.x,result.y,result.z);
  }
  function advanceFlightRoute(dt){
    const waypoint=path[pathIndex];
    if(!waypoint)return;
    const dx=waypoint.x-trainer.position.x,dz=waypoint.z-trainer.position.z,distance=Math.hypot(dx,dz);
    if(distance<.08){
      pathIndex++;
      if(pathIndex>=path.length){destinationMarker.visible=false;
        if(flightPending)flightLanding=true;
        else {const id=arrivalId,action=arrivalAction;arrivalId=null;arrivalAction=null;queueArrival(id,action);}}
      return;
    }
    const goal=Math.atan2(dx,dz),change=angleDelta(trainer.rotation.y,goal);
    trainer.rotation.y+=THREE.MathUtils.clamp(change,-dt*1.6,dt*1.6);steering=THREE.MathUtils.clamp(change,-.5,.5);
    const step=Math.min(distance,dt*travelShape().speed*Math.max(0,Math.cos(change)));
    const result=stepFlight(trainer.position,{x:trainer.position.x+Math.sin(trainer.rotation.y)*step,z:trainer.position.z+Math.cos(trainer.rotation.y)*step},{dt,ground:groundForWalk,ceiling:flightCeiling,cruise:flightCruise,limit:WORLD_LIMIT});
    trainer.position.set(result.x,result.y,result.z);
  }
  function tick(now){requestAnimationFrame(tick);if(hidden||!inView)return;const dt=Math.min((now-(lastTime||now))/1000,.05);lastTime=now;time+=dt;let moving=false,manualInput=false;
    if(!paused&&!roomLoading){
      moveStart.copy(trainer.position);
      const sx=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'));
      const sy=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown'));
      direction.set(0,0,0);
      const backing=(reverseHeld||keys.has('r'))&&travelShape().axle>0;
      const lift=flying()?THREE.MathUtils.clamp(Number(keys.has(' '))-Number(keys.has('c'))+flightLift,-1,1):0;
      if(lift)flightCruise=THREE.MathUtils.clamp(flightCruise+lift*dt*5,FLIGHT.minCruise,FLIGHT.maxCruise);
      manualInput=Boolean(sx||sy||backing||touchDrive.throttle||touchDrive.turn||lift||keys.has(' '));
      if(flying()&&flightLanding){
        const landingTurn=angleDelta(trainer.rotation.y,flightPending.yaw);
        trainer.rotation.y+=THREE.MathUtils.clamp(landingTurn,-dt*1.6,dt*1.6);
        const aligned=Math.abs(landingTurn)<.03;
        const result=stepFlight(trainer.position,trainer.position,{dt,ground:groundForWalk,ceiling:flightCeiling,landing:aligned,cruise:flightCruise,limit:WORLD_LIMIT});
        trainer.position.y=result.y;
        if(result.landed){const pending=flightPending;clearMovement();travelStatus(null,pending?.travel?`Ready to explore with ${rideName(pending.travel)}.`:'Landed.');selectedTravel=pending?.travel||(pending?.id?'charizard':'walk');updateTravelVisual();resetCompanionTrail();if(pending?.id)queueArrival(pending.id);else pending?.action?.();}
      }else if(ridePending){advanceRideSwitch(dt);}
      else if(viewMode==='first'&&!activeRoom&&selectedTravel!=='walk'&&(manualInput||pathIndex>=path.length)){
        advanceRide(dt,{throttle:backing?-1:THREE.MathUtils.clamp(sy+touchDrive.throttle,-1,1),turn:backing?0:THREE.MathUtils.clamp(-sx+touchDrive.turn,-1,1),brake:!flying()&&keys.has(' ')});
      }else if(manualInput&&viewMode==='first'){
        const throttle=backing?-1:THREE.MathUtils.clamp(sy+touchDrive.throttle,-1,1),turn=THREE.MathUtils.clamp(-sx+touchDrive.turn,-1,1);
        advance(direction,dt,Infinity,false,{throttle,turn,forceReverse:backing});
      }else if(backing&&!flying()&&!keys.has(' ')){rideControl.speed=0;advance(direction,dt,Infinity,false,{forceReverse:true});}
      else if(manualInput){
        viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);
        const x=trainer.position.x,z=trainer.position.z;
        // Include local terrain slope; indoors this is exactly a horizontal plane.
        const slopeX=activeRoom||flying()?0:(groundForWalk(x+.04,z)-groundForWalk(x-.04,z))/.08;
        const slopeZ=activeRoom||flying()?0:(groundForWalk(x,z+.04)-groundForWalk(x,z-.04))/.08;
        const inputX=THREE.MathUtils.clamp(sx-touchDrive.turn,-1,1),inputY=THREE.MathUtils.clamp(sy+touchDrive.throttle,-1,1);
        screenGroundDirection(direction,inputX,inputY,viewProjection.elements,trainer.position,camera.aspect,slopeX,slopeZ);
        const screenOrigin=trainer.position.clone().project(camera);
        const screenProgress=next=>{
          // Direction is measured on the current height plane. A walkable
          // bridge/platform step must not be mistaken for backwards movement.
          const projected=new THREE.Vector3(next.x,trainer.position.y,next.z).project(camera);
          return (projected.x-screenOrigin.x)*camera.aspect*inputX+(projected.y-screenOrigin.y)*inputY;
        };
        if(flying())advanceScreenFlight(direction,dt,screenProgress);
        else if(!keys.has(' '))advance(direction,dt,Infinity,false,{screenDirection:true,motion:rideControl,screenProgress});
        else {steering=0;rideControl.speed=0;}
      }
      else if(flying()&&pathIndex<path.length){advanceFlightRoute(dt);}
      else if(pathIndex<path.length){
        const waypoint=path[pathIndex];delta.set(waypoint.x-trainer.position.x,0,waypoint.z-trainer.position.z);
        const distance=delta.length();direction.copy(delta).normalize();
        if(distance<.07){pathIndex++;}
        else advance(direction,dt,distance,true);
        if(pathIndex>=path.length){destinationMarker.visible=false;const id=arrivalId,action=arrivalAction;arrivalId=null;arrivalAction=null;queueArrival(id,action);}
      }
      else {rideControl.speed=0;steering=0;if(flying())advanceScreenFlight(direction,dt);}
      if(!flying())trainer.position.y=groundForWalk(trainer.position.x,trainer.position.z);
      direction.subVectors(trainer.position,moveStart);direction.y=0;moving=direction.lengthSq()>1e-10;
    }
    if(travelModel&&!activeRoom&&selectedTravel!=='walk'){
      const shape=travelShape(),dx=Math.sin(trainer.rotation.y)*shape.axle,dz=Math.cos(trainer.rotation.y)*shape.axle;
      const front=groundForWalk(trainer.position.x+dx,trainer.position.z+dz),rear=groundForWalk(trainer.position.x-dx,trainer.position.z-dz);
      const air=flying();
      if(!paused&&!roomLoading&&(!quietMotion||moving))mountTime+=dt;
      if(air&&time-flightStatusTime>.25){flightStatusTime=time;const height=trainer.position.y-groundForWalk(trainer.position.x,trainer.position.z);document.dispatchEvent(new CustomEvent('world:flight-state',{detail:{height,phase:flightPending?'landing':height<2?'takeoff':'flying'}}));}
      travelModel.group.rotation.x=air?THREE.MathUtils.lerp(travelModel.group.rotation.x,Math.abs(rideControl.speed)*.012,dt*3):shape.axle?Math.atan2(rear-front,shape.axle*2):0;
      travelModel.group.rotation.z=air?THREE.MathUtils.lerp(travelModel.group.rotation.z,-steering*.20,dt*3):0;
      travelModel.group.position.y=air?(!quietMotion?Math.sin(mountTime*2.4)*.045:0):(front+rear)/2-trainer.position.y;
      travelModel.update(paused||roomLoading||quietMotion&&!moving?0:dt,{speed:moving?(direction.x*Math.sin(trainer.rotation.y)+direction.z*Math.cos(trainer.rotation.y))/Math.max(dt,.001):0,time:mountTime,steer:steering,airborne:air?flightDeployment(trainer.position.y,groundForWalk(trainer.position.x,trainer.position.z),flightCeiling(trainer.position.x,trainer.position.z)):0,bank:steering});
    }

    if(mixer){if(moving!==previousMoving&&idleAction&&walkAction){if(moving){walkAction.reset().fadeIn(.2).play();idleAction.fadeOut(.2);}else{idleAction.reset().fadeIn(.25).play();walkAction.fadeOut(.25);}}mixer.update(quietMotion&&!moving?0:dt);}
    if(trainerBody){const swing=moving?Math.sin(time*14):0;trainerBody.position.y=moving?Math.abs(swing)*.04:0;limbs.forEach((l,i)=>{l.rotation.x=swing*.5*(i===0||i===3?1:-1);});}
    if(!paused&&!roomLoading)updateDoorCrossings(moving,now);
    previousMoving=moving;
    if(!paused&&!roomLoading)updateCompanion(dt);
    if(moving&&(activeRoom||selectedTravel==='walk')){footTime+=dt;if(footTime>.16){footTime=0;const f=footprints[footIndex++%footprints.length];f.m.position.set(trainer.position.x+.1*(footIndex%2?1:-1),trainer.position.y+.025,trainer.position.z);f.m.rotation.z=-trainer.rotation.y;f.age=0;f.m.visible=true;}}
    for(const f of footprints){f.age+=dt;f.m.material.opacity=Math.max(0,.19-f.age*.08);if(f.age>2.4)f.m.visible=false;}
    nearest=null;let nearDistance=activeRoom?1.6:2.15;
    if(activeRoom){
      const exitDistance=trainer.position.distanceTo(activeRoom.exit.approach);
      if(exitDistance<(activeRoom.exit.radius||1.3)){nearest={kind:'exit'};nearDistance=exitDistance;}
      for(const exhibit of activeRoom.exhibits){const d=trainer.position.distanceTo(exhibit.approach);if(d<nearDistance){nearest={kind:'exhibit',exhibit};nearDistance=d;}}
    }else for(const s of landmarkState){const d=trainer.position.distanceTo(s.entry);if(d<nearDistance){nearDistance=d;nearest={kind:'place',...s};}}
    interactPrompt.hidden=!nearest||nearest.kind!=='exhibit'||moving||paused||overview||roomLoading;
    if(nearest)document.getElementById('interact-text').textContent=nearest.kind==='exit'?'Leave building':nearest.kind==='exhibit'?`View ${nearest.exhibit.title}`:`Enter ${nearest.place.title}`;
    if(!quietMotion){windUniform.value=time;flagCloths.forEach((f,i)=>f.rotation.y=Math.sin(time*1.4+i)*.1);waterGlints.forEach(g=>g.scale.x=.7+Math.sin(time+g.userData.seed)*.3);}
    // A fixed-angle camera follows the actor continuously. The target belongs
    // to the navigation body, never to animated heads, wheels or wingbeats.
    if(overview){focusTarget.set(0,1,-5);updateCenteredFocus(focus,focusTarget,{dt,sharpness:4,heightSharpness:4});}
    else if(viewMode==='third'&&!paused&&!roomLoading){
      focusTarget.set(trainer.position.x,trainer.position.y+(flying()?1.8:1.2),trainer.position.z);
      updateCenteredFocus(focus,focusTarget,{dt});
    }
    zoom=THREE.MathUtils.lerp(zoom,targetZoom,Math.min(1,dt*5));
    const distanceGoal=activeRoom?((activeRoom.camera.distance||19)*(innerWidth<600?1.75:1))/zoom:overview?overviewDistance():(innerWidth<600?28:24)/zoom;
    actualDistance=THREE.MathUtils.lerp(actualDistance,distanceGoal,reducedMotion?1:Math.min(1,dt*3));
    actualPitch=THREE.MathUtils.lerp(actualPitch,overview?.91:cameraPitch,reducedMotion?1:Math.min(1,dt*3));
    const distance=actualDistance,pitch=actualPitch;
    distantBuildings.forEach(item=>item.object.visible=!activeRoom);
    if(scene.fog)scene.fog.density=overview?.0015:.011;
    activeRoom?.update?.(quietMotion?0:dt,quietMotion?windUniform.value:time);
    if(viewMode==='first'){
      // Use the actual mount transform so the eye follows the saddle or seat on
      // slopes; keep the horizon level and omit head-bob for a comfortable ride.
      const mount=!activeRoom&&selectedTravel!=='walk'?travelModel:null;
      trainer.updateMatrixWorld(true);
      firstPersonPose({trainer,mount,lookYaw:firstLookYaw,lookPitch:firstLookPitch},eyePosition,lookPosition);
      camera.position.copy(eyePosition);camera.lookAt(lookPosition);
    }else{camera.position.set(focus.x+Math.sin(cameraYaw)*Math.cos(pitch)*distance,focus.y+Math.sin(pitch)*distance,focus.z+Math.cos(cameraYaw)*Math.cos(pitch)*distance);camera.lookAt(focus);}
    camera.updateMatrixWorld();updateLabels();
    sun.position.set(focus.x-18,34,focus.z+20);sun.target.position.set(focus.x,0,focus.z);sun.target.updateMatrixWorld();
    renderer.info.reset();composer.render();
  }
  window.KE_WORLD_SCENE={ready:true,walkTo,walkToScenic,scenicPlaces:()=>SCENIC_PLACES.map(({id,title})=>({id,title})),enterInterior,exitInterior,setCompanion,getCompanions,getRoom:()=>roomPlaceId,reset:()=>{if(activeRoom)exitInterior();moveTo(new THREE.Vector3(-3.2,0,9.8));},renderer,camera,scene,trainer};

  document.dispatchEvent(new CustomEvent('world:ready'));
  document.dispatchEvent(new CustomEvent('world:view-changed',{detail:{mode:viewMode}}));
  document.getElementById('loading').classList.add('loaded');document.getElementById('render-fallback').hidden=true;
  document.getElementById('world').setAttribute('aria-label','Explore Ke’s research village. Click to walk, or use WASD and arrow keys to move in screen directions.');
  requestAnimationFrame(tick);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();window.KE_WORLD_SCENE.ready=false;fallback(new Error('Graphics context lost'));});
}
function seeded(seed){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}

// Convert a screen-space direction into a tangent on the ground at the player.
// The inverse projection Jacobian handles perspective and off-centre positions;
// yaw-only movement does not. Screen Y points up, and aspect corrects pixel units.
function screenGroundDirection(out,sx,sy,m,p,aspect,slopeX=0,slopeZ=0){
  const cx=m[0]*p.x+m[4]*p.y+m[8]*p.z+m[12],cy=m[1]*p.x+m[5]*p.y+m[9]*p.z+m[13],cw=m[3]*p.x+m[7]*p.y+m[11]*p.z+m[15];
  const a=((m[0]+m[4]*slopeX)*cw-cx*(m[3]+m[7]*slopeX))*aspect;
  const b=((m[8]+m[4]*slopeZ)*cw-cx*(m[11]+m[7]*slopeZ))*aspect;
  const c=(m[1]+m[5]*slopeX)*cw-cy*(m[3]+m[7]*slopeX);
  const d=(m[9]+m[5]*slopeZ)*cw-cy*(m[11]+m[7]*slopeZ),det=a*d-b*c;
  if(slopeX||slopeZ){
    const fa=(m[0]*cw-cx*m[3])*aspect,fb=(m[8]*cw-cx*m[11])*aspect;
    const fc=m[1]*cw-cy*m[3],fd=m[9]*cw-cy*m[11],flatDet=fa*fd-fb*fc;
    // Small stair/platform seams must not invert screen-relative controls.
    if(det*flatDet<=0||Math.abs(det)<Math.abs(flatDet)*.2)return screenGroundDirection(out,sx,sy,m,p,aspect,0,0);
  }
  if(Math.abs(det)<1e-8)return out.set(0,0,0);
  const x=(d*sx-b*sy)/det,z=(a*sy-c*sx)/det,length=Math.hypot(x,z);
  return length>1e-12?out.set(x/length,0,z/length):out.set(0,0,0);
}
