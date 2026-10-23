/** Original, lightweight village-scale travel models. Front +Z, tyres/hooves y=0.
 * Hand-authored geometry; no downloaded model, texture or automotive logo.
 * Silhouette references (checked 2026-10-23): tesla.com/models,
 * tesla.com/cybertruck, porsche.com/usa/models/911/carrera-models/911-carrera/.
 * These are playful approximations, not official CAD or model-year specifications.
 * The factory owns its geometry/materials. Do not dispose a shared instance.
 */
import * as THREE from './lib/three.module.js';
import { RoundedBoxGeometry } from './lib/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from './lib/addons/utils/BufferGeometryUtils.js';

const clamp = THREE.MathUtils.clamp;
const standard = (color, roughness=.55, metalness=0) => new THREE.MeshStandardMaterial({color,roughness,metalness});
const paint = color => new THREE.MeshPhysicalMaterial({color,roughness:.27,metalness:.22,clearcoat:1,clearcoatRoughness:.2});
function factory(name) {
  const group=new THREE.Group();group.name=`travel-${name}`;
  const shell=new THREE.Group();group.add(shell);
  const mats={paint:paint(0x246cb2),glass:new THREE.MeshPhysicalMaterial({color:0x254a5b,roughness:.19,metalness:.28,clearcoat:1}),rubber:standard(0x202a2f,.88),trim:standard(0x23313b,.48),rim:standard(0xb9cad0,.32,.62),seat:standard(0x584b39,.74),white:standard(0xe8eeec,.28),lamp:new THREE.MeshStandardMaterial({color:0xe3f6f1,emissive:0xb2dbd7,emissiveIntensity:.4,roughness:.18}),red:new THREE.MeshStandardMaterial({color:0x9b2926,emissive:0x66120e,emissiveIntensity:.35,roughness:.3}),gold:standard(0xcda45f,.4,.3)};
  function mesh(geo,key,parent=shell,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mats[key]);m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  function box(x,y,z,w,h,d,key='trim',r=.025,parent=shell){return mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.2,h*.2,d*.2)),key,parent,x,y,z);}
  function ball(x,y,z,rx,ry,rz,key='paint',parent=shell){const g=new THREE.SphereGeometry(1,20,12);g.scale(rx,ry,rz);return mesh(g,key,parent,x,y,z);}
  function tube(points,r,key='trim',parent=shell,closed=false){const c=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed);return mesh(new THREE.TubeGeometry(c,Math.max(8,points.length*5),r,6,closed),key,parent);}
  function rod(a,b,r,key='trim',parent=shell){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),v=q.clone().sub(p);const g=new THREE.CylinderGeometry(r,r,v.length(),10);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));g.translate(...p.add(q).multiplyScalar(.5).toArray());return mesh(g,key,parent);}
  function ring(x,y,z,r,t,key='rim',parent=shell){const g=new THREE.TorusGeometry(r,t,8,36);g.rotateY(Math.PI/2);return mesh(g,key,parent,x,y,z);}
  function poly(points,key='glass',parent=shell){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));const idx=[];for(let i=1;i<points.length-1;i++)idx.push(0,i,i+1);g.setIndex(idx);g.computeVertexNormals();const m=mesh(g,key,parent);m.material.side=THREE.DoubleSide;return m;}
  function finish(options){
    // Batch each articulation independently, preserving its local pivot.
    const containers=[];group.traverse(o=>{if(o.isGroup)containers.push(o);});
    for(const container of containers){
      const buckets=new Map(),originals=[];
      for(const child of container.children){if(!child.isMesh)continue;child.updateMatrix();const mat=child.material;const clone=child.geometry.clone().applyMatrix4(child.matrix);clone.deleteAttribute('uv');const geo=clone.index?clone.toNonIndexed():clone;if(geo!==clone)clone.dispose();if(!buckets.has(mat))buckets.set(mat,[]);buckets.get(mat).push(geo);originals.push(child);}
      for(const child of originals){container.remove(child);child.geometry.dispose();}
      for(const [mat,geos] of buckets){const g=mergeGeometries(geos,false);g.computeBoundingSphere();const m=new THREE.Mesh(g,mat);m.castShadow=m.receiveShadow=true;container.add(m);geos.forEach(g=>g.dispose());}
    }
    group.userData.front='+Z';
    return {group,seat:new THREE.Vector3(...options.seat),riderScale:options.riderScale??.75,riderPose:options.riderPose??'seated',length:options.length,width:options.width,update:options.update??(()=>{}),dispose(){const geos=new Set(),materials=new Set(Object.values(mats));group.traverse(o=>{if(o.geometry)geos.add(o.geometry);if(o.material)for(const m of [].concat(o.material))materials.add(m);});geos.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}};
  }
  return {group,shell,mats,mesh,box,ball,tube,rod,ring,poly,finish};
}

// A smooth loft through longitudinal body sections. The lower body rises around
// actual wheel openings instead of placing black discs onto a rectangular box.
function carSkin(f,sections,wheels,flat=false){
  const p=[],idx=[],ring=12;
  // More stations keep wheel-arch edges curved even when viewed close up.
  sections=sections.flatMap((a,i)=>i===sections.length-1?[a]:Array.from({length:4},(_,k)=>a.map((v,j)=>THREE.MathUtils.lerp(v,sections[i+1][j],k/4))));
  sections.forEach(([z,w,y],i)=>{
    let lower=.28;for(const wz of wheels){const d=Math.abs(z-wz);if(d<.365)lower=Math.max(lower,.32+Math.sqrt(.365**2-d*d));}
    const points=[[-w,lower],[-w,y-.10],[-w*.91,y-.015],[-w*.62,y+.026],[-w*.27,y+.039],[0,y+.043],[w*.27,y+.039],[w*.62,y+.026],[w*.91,y-.015],[w,y-.10],[w,lower],[0,.265]];
    for(const [x,yy]of points)p.push(x,yy,z);
    if(i)for(let j=0;j<ring;j++){const a=(i-1)*ring+j,b=(i-1)*ring+(j+1)%ring,c=i*ring+j,d=i*ring+(j+1)%ring;idx.push(a,c,b,b,c,d);}
  });
  // Close nose and tail with triangles; all exterior seams remain intentional.
  for(const end of [0,sections.length-1])for(let j=1;j<ring-1;j++){const a=end*ring;idx.push(...(end===0?[a,a+j,a+j+1]:[a,a+j+1,a+j]));}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();f.mesh(flat?g.toNonIndexed():g,'paint');
}
function wheel(f,x,z,r=.31,front=false,style='sport'){
  const pivot=new THREE.Group();pivot.position.set(x,r,z);f.group.add(pivot);
  const spin=new THREE.Group();pivot.add(spin);
  const tyre=f.mesh(new THREE.CylinderGeometry(r,r,.19,32,1),'rubber',spin);tyre.rotation.z=Math.PI/2;
  const sign=Math.sign(x)||1,outer=sign*.101;
  f.ring(outer,0,0,r*.75,.017,'trim',spin);
  const hub=f.mesh(new THREE.CylinderGeometry(r*.66,r*.66,.027,24),'rim',spin,outer,0,0);hub.rotation.z=Math.PI/2;
  f.ring(outer+sign*.017,0,0,r*.64,.015,'rim',spin);
  // Dark recessed hub and tapered aero spokes stand out at the village zoom.
  const center=f.mesh(new THREE.CylinderGeometry(r*.17,r*.17,.038,16),'trim',spin,outer+sign*.025,0,0);center.rotation.z=Math.PI/2;
  const count=style==='truck'?7:5;
  for(let i=0;i<count;i++){const a=i*Math.PI*2/count;const spoke=f.box(outer+sign*.022,Math.cos(a)*r*.37,Math.sin(a)*r*.37,.024,r*.62,r*.13,'trim',.006,spin);spoke.rotation.x=a;}
  if(style==='truck')for(let i=0;i<22;i++){const a=i*Math.PI*2/22;const tread=f.box(0,Math.cos(a)*r,Math.sin(a)*r,.195,.022,.045,'rubber',.004,spin);tread.rotation.x=a;}
  return{pivot,spin,r,front};
}
function wheelUpdate(wheels,body){let roll=0;return(dt,{speed=0,time=0,steer=0}={})=>{roll+=speed*dt;for(const w of wheels){w.spin.rotation.x=roll/w.r;if(w.front)w.pivot.rotation.y=clamp(steer,-.32,.32);}body.rotation.z=clamp(-steer*Math.min(Math.abs(speed),5)*.014,-.035,.035);};}
function glassCabin(f,{front=.70,back=-.95,topFront=.23,topBack=-.57,base=.77,top=1.23,width=.59,roof=.47}){
  // Glass faces and separate roof give the sloping fastback a crisp silhouette.
  f.poly([[-width,base,front],[width,base,front],[roof,top,topFront],[-roof,top,topFront]]);
  f.poly([[-width,base,back],[-roof,top,topBack],[roof,top,topBack],[width,base,back]]);
  for(const s of [-1,1]){
    f.poly([[s*width,base,front],[s*roof,top,topFront],[s*roof,top,topBack],[s*width,base,back]]);
    f.tube([[s*width,base,front],[s*roof,top+.012,topFront],[s*roof,top+.012,topBack],[s*width,base,back]],.024,'paint');
    f.rod([s*width,base,front],[s*width,base,back],.015,'trim');
    f.rod([s*width,base,-.28],[s*roof,top,-.28],.025,'trim');
  }
  f.poly([[-roof,top+.012,topFront],[roof,top+.012,topFront],[roof,top+.012,topBack],[-roof,top+.012,topBack]],'glass');
  f.tube([[-roof,top+.015,topFront],[0,top+.032,topFront+.01],[roof,top+.015,topFront]],.022,'paint');
  f.tube([[-roof,top+.015,topBack],[0,top+.032,topBack-.01],[roof,top+.015,topBack]],.022,'paint');
}
function carDetails(f,{front=1.78,rear=-1.78,width=.70,doorZ=-.02,car='sedan'}={}){
  for(const s of[-1,1]){
    f.box(s*(width+.015),.74,doorZ,.021,.024,.18,'rim',.008);
    f.box(s*(width+.015),.71,doorZ-.65,.021,.023,.15,'rim',.008);
    f.tube([[s*(width+.01),.70,.43],[s*(width+.01),.40,.43],[s*(width+.01),.35,-.53]],.007,'trim');
    f.rod([s*width*.91,.80,.45],[s*(width+.10),.85,.45],.025,'trim');
    f.box(s*(width+.10),.86,.45,.18,.085,.18,'paint',.03);
    f.box(s*(width+.10),.865,.397,.14,.057,.015,'glass',.005);
  }
  f.box(0,.32,front-.015,width*1.6,.11,.10,'trim',.024);
  f.box(0,.34,rear+.015,width*1.68,.15,.10,'trim',.02);
  f.box(0,.465,rear-.017,.31,.11,.018,'white',.01);
  f.box(0,.47,rear-.029,.20,.014,.004,'trim',.002);
  for(const s of[-1,1])f.box(s*width*.49,.61,rear-.01,.27,.045,.035,'red',.02);
  if(car==='sedan')for(const s of[-1,1]){
    f.poly([[s*.29,.722,front-.20],[s*.60,.680,front-.26],[s*.59,.678,front-.21],[s*.30,.719,front-.15]],'lamp');
  }
}
function modelS(){const f=factory('model-s');f.mats.paint.color.setHex(0x185ca4);
  const sections=[[-1.82,.49,.61],[-1.72,.65,.72],[-1.52,.73,.78],[-1.32,.76,.80],[-1.10,.76,.81],[-.94,.75,.82],[-.72,.73,.80],[-.40,.72,.79],[0,.72,.78],[.45,.73,.78],[.76,.75,.77],[.96,.76,.78],[1.15,.76,.77],[1.36,.73,.74],[1.58,.66,.67],[1.79,.50,.57]];
  carSkin(f,sections,[-1.12,1.12]);glassCabin(f,{front:.80,back:-1.18,topFront:.27,topBack:-.55,base:.795,top:1.25,width:.64,roof:.49});
  // Long smooth hood, subtly sculpted nose and full-width rear signature.
  f.tube([[-.41,.82,.82],[-.37,.78,1.22],[-.31,.68,1.61]],.009,'paint');f.tube([[.41,.82,.82],[.37,.78,1.22],[.31,.68,1.61]],.009,'paint');
  carDetails(f,{front:1.78,rear:-1.80,width:.735});f.box(0,.60,-1.827,.96,.026,.025,'red',.006);
  for(const s of[-1,1])f.box(s*.74,.31,0,.052,.09,1.48,'trim',.02);
  const wheels=[];for(const x of[-.74,.74])for(const z of[-1.12,1.12])wheels.push(wheel(f,x,z,.31,z>0));
  return f.finish({seat:[-.30,.49,-.06],riderScale:.45,riderPose:'driver',length:3.64,width:1.78,update:wheelUpdate(wheels,f.shell)});
}
function porsche(){const f=factory('porsche');f.mats.paint.color.setHex(0xe7dfc6);
  const sections=[[-1.65,.48,.62],[-1.51,.67,.77],[-1.32,.77,.79],[-1.10,.76,.80],[-.90,.74,.78],[-.66,.70,.73],[-.30,.69,.72],[.15,.70,.71],[.55,.73,.73],[.84,.75,.78],[1.07,.74,.78],[1.29,.69,.72],[1.48,.59,.60],[1.65,.45,.52]];
  carSkin(f,sections,[-1.02,1.02]);glassCabin(f,{front:.55,back:-1.06,topFront:.13,topBack:-.56,base:.75,top:1.18,width:.57,roof:.45});
  // Round lamps above a very low nose, flowing rear haunches, rear light strip.
  for(const s of[-1,1]){const head=f.ball(s*.50,.78,1.30,.145,.052,.185,'trim');head.rotation.x=.55;const lens=f.ball(s*.50,.805,1.32,.126,.035,.161,'lamp');lens.rotation.x=.55;for(const x of[-.043,.043])for(const z of[-.050,.050])f.ball(s*.50+x,.843,1.32+z,.022,.010,.022,'white');f.box(s*.51,.41,1.54,.31,.095,.055,'trim',.02);f.box(s*.45,.33,-1.60,.18,.065,.09,'trim',.024);}
  carDetails(f,{front:1.62,rear:-1.64,width:.70,car:'coupe'});f.box(0,.61,-1.665,.93,.028,.023,'red',.008);
  for(let i=0;i<9;i++)f.box(-.32+i*.08,.782,-1.22,.027,.012,.26,'trim',.004);
  const wheels=[];for(const x of[-.74,.74])for(const z of[-1.02,1.02])wheels.push(wheel(f,x,z,.305,z>0));
  return f.finish({seat:[-.29,.46,-.05],riderScale:.43,riderPose:'driver',length:3.34,width:1.77,update:wheelUpdate(wheels,f.shell)});
}
function cybertruck(){const f=factory('cybertruck');f.mats.paint.dispose();f.mats.paint=new THREE.MeshStandardMaterial({color:0xadb9bb,roughness:.42,metalness:.48,flatShading:true});
  const b=.82;
  // A folded metal shell, with its roof peak forward of the rear cargo bed.
  f.poly([[-b,.44,1.91],[b,.44,1.91],[b,.84,1.79],[-b,.84,1.79]],'paint');
  f.poly([[-b,.84,1.79],[b,.84,1.79],[b*.84,1.46,.12],[-b*.84,1.46,.12]],'paint');
  f.poly([[-b*.84,1.46,.12],[b*.84,1.46,.12],[b,.94,-1.92],[-b,.94,-1.92]],'paint');
  f.poly([[-b,.94,-1.92],[b,.94,-1.92],[b,.43,-1.92],[-b,.43,-1.92]],'paint');
  for(const s of[-1,1]){
    f.poly([[s*b,.43,-1.92],[s*b,.94,-1.92],[s*b*.84,1.46,.12],[s*b,.84,1.79],[s*b,.43,1.91]],'paint');
    f.poly([[s*(b*.99),.93,.95],[s*(b*.837),1.42,.12],[s*(b*.94),1.11,-.91],[s*(b*.99),.93,-.91]],'glass');
    f.rod([s*b*.99,.94,-.27],[s*b*.885,1.32,-.27],.023,'trim');
    f.box(s*(b+.008),.86,.29,.018,.025,.16,'trim',.004);f.box(s*(b+.008),.86,-.72,.018,.025,.15,'trim',.004);
    f.rod([s*b,.89,-.27],[s*b,.43,-.27],.006,'trim');
    f.box(s*(b+.085),1.01,.87,.18,.08,.20,'trim',.01);
    f.box(s*b,.37,0,.08,.12,1.70,'trim',.006);
    // Distinct squared dark fender arches rather than a smooth sedan fender.
    for(const z of[-1.20,1.20])f.tube([[s*(b+.009),.42,z-.43],[s*(b+.009),.75,z-.27],[s*(b+.009),.79,z+.27],[s*(b+.009),.42,z+.43]],.065,'trim');
  }
  f.poly([[-b*.965,.97,1.48],[b*.965,.97,1.48],[b*.822,1.465,.15],[-b*.822,1.465,.15]],'glass');
  f.poly([[-.68,1.02,-1.01],[.68,1.02,-1.01],[.72,.98,-1.80],[-.72,.98,-1.80]],'trim');
  for(let i=0;i<11;i++)f.rod([-.71,1.01-i*.004,-1.02-i*.071],[.71,1.01-i*.004,-1.02-i*.071],.009,'rim');
  f.box(0,.79,1.833,1.58,.031,.024,'lamp',.003);f.box(0,.91,-1.944,1.57,.031,.024,'red',.003);f.box(0,.37,1.92,1.64,.18,.09,'trim',.006);f.box(0,.37,-1.94,1.64,.17,.09,'trim',.006);
  const wheels=[];for(const x of[-.82,.82])for(const z of[-1.20,1.20])wheels.push(wheel(f,x,z,.36,z>0,'truck'));
  return f.finish({seat:[-.32,.60,.10],riderScale:.45,riderPose:'driver',length:3.98,width:2.0,update:wheelUpdate(wheels,f.shell)});
}
function bicycle(){const f=factory('bicycle');f.mats.paint.color.setHex(0x4f9c91);f.mats.seat.color.setHex(0x945e3d);
  const radius=.36,rear=-.72,front=.73;const wheels=[];
  for(const z of[rear,front]){const pivot=new THREE.Group();pivot.position.set(0,radius,z);f.group.add(pivot);const spin=new THREE.Group();pivot.add(spin);f.ring(0,0,0,radius-.026,.030,'rubber',spin);f.ring(0,0,0,radius-.052,.013,'rim',spin);for(let i=0;i<16;i++){const a=i*Math.PI/8;f.rod([0,0,0],[0,Math.cos(a)*(radius-.052),Math.sin(a)*(radius-.052)],.005,'rim',spin);}f.rod([-.065,0,0],[.065,0,0],.032,'trim',spin);wheels.push({pivot,spin,r:radius,front:z>0});}
  const axle=[0,.36,-.72],crank=[0,.34,-.10],saddle=[0,.91,-.26],head=[0,.89,.52];
  for(const [a,b]of[[axle,crank],[axle,saddle],[saddle,crank],[saddle,head],[crank,head]])f.rod(a,b,.029,'paint');
  for(const s of[-1,1]){f.rod([s*.042,.91,.50],[s*.042,.36,.73],.024,'paint');f.rod([s*.044,.83,-.24],[s*.044,.36,-.72],.018,'paint');}
  f.rod([0,.84,-.25],[0,1.035,-.28],.022,'rim');f.ball(0,1.043,-.29,.125,.042,.20,'seat');f.rod([0,.87,.51],[0,1.07,.46],.022,'rim');f.tube([[-.28,1.07,.43],[-.18,1.10,.47],[0,1.11,.47],[.18,1.10,.47],[.28,1.07,.43]],.022,'rim');for(const s of[-1,1])f.rod([s*.18,1.10,.47],[s*.29,1.07,.43],.031,'seat');
  f.tube([[.20,1.10,.46],[.23,.94,.57],[.07,.79,.55]],.007,'trim');
  const crankGroup=new THREE.Group();crankGroup.position.set(0,.34,-.10);f.group.add(crankGroup);f.ring(.055,0,0,.115,.012,'rim',crankGroup);f.rod([-.07,0,0],[.07,0,0],.025,'rim',crankGroup);for(const s of[-1,1]){f.rod([s*.08,0,0],[s*.08,0,s*.14],.016,'rim',crankGroup);f.box(s*.12,0,s*.14,.12,.03,.075,'trim',.008,crankGroup);}
  f.tube([[.06,.45,-.10],[.06,.42,-.72],[.06,.31,-.72],[.06,.23,-.10]],.006,'trim',undefined,true);
  f.box(0,.78,-.80,.25,.035,.28,'seat',.025);f.rod([-.10,.77,-.80],[-.07,.36,-.72],.012,'rim');f.rod([.10,.77,-.80],[.07,.36,-.72],.012,'rim');
  f.ball(0,.88,.65,.045,.05,.045,'lamp');f.ball(0,.69,-.90,.035,.025,.017,'red');
  const update=wheelUpdate(wheels,f.shell);let phase=0;
  return f.finish({seat:[0,1.03,-.28],riderScale:.76,riderPose:'cycling',length:2.22,width:.60,update(dt,state={}){update(dt,state);phase+=(state.speed||0)*dt*2.3;crankGroup.rotation.x=phase;}});
}
function horse(){const f=factory('horse');f.mats.paint.dispose();f.mats.paint=standard(0x9a6743,.9);f.mats.seat=standard(0x443b32,.8);f.mats.white.color.setHex(0xe4d8b8);
  // Warm chestnut coat, sculpted chest/haunches, upright neck and long muzzle.
  f.ball(0,1.14,-.03,.34,.43,.70);f.ball(0,1.16,.43,.32,.41,.32);f.ball(0,1.10,-.53,.35,.40,.34);
  const neck=f.ball(0,1.55,.57,.235,.60,.25);neck.rotation.x=.40;
  const head=f.ball(0,1.98,.87,.20,.285,.30);head.rotation.x=.45;const muzzle=f.ball(0,1.82,1.10,.17,.155,.25,'seat');muzzle.rotation.x=.34;
  for(const s of[-1,1]){const ear=f.ball(s*.115,2.30,.78,.065,.18,.066);ear.rotation.z=s*-.16;f.ball(s*.193,2.045,.91,.027,.031,.025,'trim');f.ball(s*.203,2.055,.922,.008,.009,.006,'white');f.ball(s*.125,1.84,1.27,.028,.019,.012,'trim');}
  f.ball(0,2.063,1.058,.039,.18,.018,'white');
  // A short mane follows the real top line instead of a vertical block.
  f.tube([[0,2.22,.73],[0,2.07,.47],[0,1.73,.28],[0,1.40,.22]],.085,'seat');
  const tail=new THREE.Group();tail.position.set(0,1.28,-.72);f.group.add(tail);f.tube([[0,0,0],[0,-.18,-.14],[.04,-.55,-.18],[.10,-.75,-.10]],.095,'seat',tail);
  f.ball(0,1.51,-.10,.37,.065,.40,'white');f.ball(0,1.57,-.12,.28,.07,.28,'seat');f.ball(0,1.62,.14,.28,.09,.075,'seat');f.ball(0,1.62,-.38,.30,.10,.075,'seat');
  for(const s of[-1,1]){f.tube([[s*.25,1.56,-.12],[s*.36,1.12,-.12],[s*.33,.97,-.08]],.016,'seat');const stirrup=new THREE.TorusGeometry(.085,.012,6,18);stirrup.rotateY(Math.PI/2);f.mesh(stirrup,'rim',undefined,s*.34,.98,-.08);f.tube([[s*.15,1.86,1.12],[s*.22,1.75,.74],[s*.25,1.58,.33],[s*.18,1.57,.11]],.012,'seat');f.tube([[s*.17,2.11,.82],[s*.20,1.97,1.09],[s*.17,1.83,1.21]],.014,'seat');}
  const legs=[];
  for(const s of[-1,1])for(const z of[-.48,.47]){
    const upper=new THREE.Group();upper.position.set(s*.235,1.06,z);f.group.add(upper);
    f.ball(0,-.16,0,.105,.26,.12,'paint',upper);f.ball(0,-.40,.01,.075,.085,.075,'paint',upper);
    const lower=new THREE.Group();lower.position.set(0,-.42,.01);upper.add(lower);
    f.rod([0,0,0],[0,-.40,.045],.048,'paint',lower);f.ball(0,-.43,.055,.078,.09,.10,'white',lower);f.box(0,-.56,.075,.155,.13,.22,'seat',.035,lower);
    legs.push({upper,lower,phase:(s<0?Math.PI:0)+(z<0?Math.PI:0),front:z>0});
  }
  let phase=0;
  return f.finish({seat:[0,1.60,-.12],riderScale:.76,riderPose:'riding',length:2.32,width:.76,update(dt,{speed=0,time=0}={}){const moving=Math.min(Math.abs(speed)/1.5,1);phase+=Math.abs(speed)*dt*2.35;for(const l of legs){l.upper.rotation.x=Math.sin(phase+l.phase)*.40*moving;l.lower.rotation.x=Math.max(0,-Math.sin(phase+l.phase))*.48*moving;}f.shell.position.y=Math.sin(phase*2)*.028*moving;tail.rotation.z=Math.sin(time*1.8)*.09;}});
}

/** A seated portrait-inspired Ke. Public photo assets/img/kw_ws.jpg is the
 * reference: short dark hair, rectangular glasses, blue cable-knit, no hat.
 * This mesh is authored for mounting; it does not deform the walking asset. */
export function createMountedRider(id){
  const f=factory(`rider-${id}`),bike=id==='bicycle',horseMode=id==='horse';
  const car=!bike&&!horseMode;
  for(const key of['paint','white','trim','seat','rubber','rim','gold'])f.mats[key].dispose();
  f.mats.paint=standard(0x317596,.88);f.mats.white=standard(0xe9e4d7,.78);f.mats.trim=standard(0x202c31,.8);f.mats.seat=standard(0xd5a583,.86);f.mats.rubber=standard(0x202622,.82);f.mats.rim=standard(0x415c62,.45,.3);f.mats.gold=standard(0x6294ac,.8);f.mats.skinShade=standard(0xb88265,.9);
  const base=horseMode?new THREE.Vector3(0,1.60,-.12):bike?new THREE.Vector3(0,1.03,-.28):new THREE.Vector3(-.29,id==='cybertruck'?.61:.49,-.04);
  // Separate torso pivot permits a small forward cycling lean without tilting
  // the saddle or the pedal targets. Clothing has shoulders, cuffs and a hem.
  const upper=new THREE.Group();upper.position.copy(base);upper.rotation.x=bike?.18:car?-.06:.02;f.group.add(upper);
  const s=car?.60:.85;
  const body=new THREE.Group();body.scale.setScalar(s);upper.add(body);
  const torso=f.mesh(new RoundedBoxGeometry(.47,.54,.30,3,.10),'paint',body,0,.30,0);
  const pos=torso.geometry.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i);pos.setX(i,pos.getX(i)*(1-.14*clamp((-y+.27)/.54,0,1)));}torso.geometry.computeVertexNormals();
  f.box(0,.065,0,.415,.065,.30,'paint',.025,body);f.ball(0,.585,0,.093,.10,.082,'seat',body);
  const collar=new THREE.TorusGeometry(.107,.020,7,28);collar.rotateX(Math.PI/2);const collarMesh=f.mesh(collar,'white',body,0,.565,0);collarMesh.scale.z=.80;
  // A few raised knit cables remain readable at the game camera distance.
  for(const x of[-.13,0,.13]){const pts=[];for(let i=0;i<=15;i++)pts.push([x+Math.sin(i*Math.PI/3)*.012,.12+i*.026,.155]);f.tube(pts,.006,'gold',body);}
  for(const x of[-.17,-.10,-.035,.035,.10,.17])f.rod([x,.04,.156],[x,.09,.156],.004,'gold',body);
  f.ball(0,.785,.008,.172,.224,.155,'seat',body);f.ball(0,.699,.085,.127,.107,.095,'seat',body);
  for(const side of[-1,1])f.ball(side*.170,.79,0,.034,.056,.031,'seat',body);
  // The cap follows the head; asymmetric swept tufts soften the silhouette.
  const hair=new THREE.SphereGeometry(1,24,14,0,Math.PI*2,0,Math.PI*.51);hair.scale(.183,.231,.168);f.mesh(hair,'rubber',body,0,.80,-.004);
  const quiff=f.ball(-.025,.988,.045,.129,.038,.103,'rubber',body);quiff.rotation.z=-.23;
  const fringe=f.ball(.072,.955,.105,.085,.033,.064,'rubber',body);fringe.rotation.z=.22;
  f.ball(0,.773,.164,.030,.044,.038,'seat',body);
  for(const side of[-1,1]){
    f.ball(side*.071,.811,.154,.014,.014,.008,'trim',body);
    const x=side*.081;f.tube([[x-.063,.843,.165],[x+.063,.843,.165],[x+.068,.833,.171],[x+.064,.786,.172],[x-.062,.786,.172],[x-.068,.798,.168],[x-.063,.843,.165]],.007,'rim',body);
    f.rod([side*.147,.823,.163],[side*.176,.821,.021],.006,'rim',body);
    f.tube([[side*.030,.865,.147],[side*.074,.874,.148],[side*.111,.864,.139]],.008,'rubber',body);
  }
  f.rod([-.016,.823,.170],[.016,.823,.170],.006,'rim',body);
  f.tube([[-.040,.705,.165],[0,.697,.172],[.040,.706,.164]],.006,'skinShade',body);
  // The pelvis stays on the saddle; articulated limbs are rounded tapered
  // forms, with independently positioned elbows / knees, not straight rods.
  f.ball(base.x,base.y+.025,base.z,.18,.10,.16,'trim');
  function limbSegment(width,depth,key){const g=new THREE.Group();f.group.add(g);f.mesh(new RoundedBoxGeometry(width,1,depth,3,Math.min(width,depth)*.34),key,g);return g;}
  function place(g,a,b){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b);g.position.copy(va).add(vb).multiplyScalar(.5);g.scale.y=va.distanceTo(vb);g.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vb.sub(va).normalize());}
  const legs=[];
  for(const side of[-1,1]){
    const upperLeg=limbSegment(car?.10:.14,car?.11:.16,'trim'),lowerLeg=limbSegment(car?.08:.105,car?.09:.13,'trim');
    const shoe=new THREE.Group();f.group.add(shoe);f.box(0,0,.045,car?.10:.15,.082,car?.18:.24,'white',.032,shoe);f.box(0,-.035,.046,car?.103:.153,.018,car?.185:.245,'trim',.005,shoe);for(let i=0;i<3;i++)f.box(0,.043,.045+i*.025,car?.06:.09,.006,.006,'gold',.002,shoe);
    const hip=[base.x+side*(car?.10:.13),base.y+.02,base.z];
    const shoulder=[base.x+side*.225*s,base.y+.48*s,base.z+(bike?.085:0)];
    const hand=bike?[side*.245,1.10,.455]:horseMode?[side*.16,1.64,.28]:[base.x+side*.14,base.y+.28,base.z+.28];
    const elbow=bike?[side*.25,1.24,.12]:horseMode?[side*.245,1.78,.07]:[base.x+side*.19,base.y+.22,base.z+.08];
    const sleeveA=limbSegment(car?.10:.135,car?.10:.14,'paint'),sleeveB=limbSegment(car?.08:.11,car?.08:.12,'paint');place(sleeveA,shoulder,elbow);place(sleeveB,elbow,hand);f.ball(...hand,car?.04:.052,car?.04:.048,car?.05:.06,'seat');
    if(side<0)f.box(hand[0]-.005,hand[1]+.018,hand[2]-.025,.078,.024,.062,'trim',.009);
    legs.push({side,hip,upperLeg,lowerLeg,shoe});
  }
  let phase=0;
  function animateLegs(){
    for(const l of legs){let knee,ankle;
      if(bike){const a=phase+(l.side<0?Math.PI:0);ankle=[l.side*.17,.41-Math.sin(a)*.14,-.145+Math.cos(a)*.14];knee=[l.side*.21,.73+Math.cos(a)*.08,.16+Math.sin(a)*.08];}
      else if(horseMode){knee=[l.side*.35,1.29,.15];ankle=[l.side*.36,1.02,-.10];}
      else{knee=[base.x+l.side*.11,base.y-.07,base.z+.27];ankle=[base.x+l.side*.11,base.y-.27,base.z+.34];}
      place(l.upperLeg,l.hip,knee);place(l.lowerLeg,knee,ankle);l.shoe.position.set(...ankle);
    }
  }
  animateLegs();
  // Static body details are batched, joints retain their authored pivots.
  const model=f.finish({seat:base.toArray(),length:.8,width:.8,update(dt,{speed=0,time=0}={}){phase+=(horseMode?Math.abs(speed)*2.35:speed*2.3)*dt;animateLegs();f.group.position.y=horseMode?Math.sin(phase*2)*.028*Math.min(Math.abs(speed)/1.5,1):0;}});
  model.group.name=`mounted-ke-${id}`;model.group.userData.portraitReference='assets/img/kw_ws.jpg';return model;
}

/** Fresh model instance. Caller adds group and positions a posed rider at seat. */
export function createTravelModel(id){
  const makers={bicycle,'model-s':modelS,cybertruck,porsche,horse};
  if(!makers[id])throw new Error(`Unknown travel model: ${id}`);
  const travel=makers[id](),rider=createMountedRider(id),updateTravel=travel.update,disposeTravel=travel.dispose;
  travel.group.add(rider.group);travel.hasRider=true;travel.rider=rider;
  travel.update=(dt,state={})=>{updateTravel(dt,state);rider.update(dt,state);};
  // Rider geometry is inside travel.group and disposed by the factory traversal.
  travel.dispose=()=>{travel.group.remove(rider.group);rider.dispose();disposeTravel();};
  return travel;
}
