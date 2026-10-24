/** Original hand-modelled Charizard fan art for Ke's noncommercial portfolio.
 * No extracted game model or texture. Pokémon / Charizard belong to their
 * respective owners. Flight rig uses +Z forward, a fixed saddle and a broad,
 * articulated wingspan. World altitude and banking belong to the caller.
 * Every instance owns its geometry/materials and can be disposed independently.
 */
import * as THREE from './lib/three.module.js';
import { mergeGeometries } from './lib/addons/utils/BufferGeometryUtils.js';

const V=(p)=>new THREE.Vector3(...p);
const material=(color,roughness=.7,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});

export function createCharizardModel(){
  const group=new THREE.Group();group.name='travel-charizard';
  const body=new THREE.Group();body.name='charizard-body';group.add(body);
  const materials={
    orange:material(0xe99338,.68),light:material(0xf3a34e,.72),dark:material(0xb95b28,.77),
    cream:material(0xf4dfad,.84),claw:material(0xf4eed9,.48),wing:material(0x317e83,.75,{side:THREE.DoubleSide}),
    wingVein:material(0x599596,.74),white:material(0xfaf3d9,.45),eye:material(0x357d85,.3),pupil:material(0x172f31,.42),
    leather:material(0x604839,.87),strap:material(0x8d6543,.86),brass:material(0xcfa765,.38,{metalness:.5}),
    flame:material(0xf47d2c,.7,{emissive:0xff6d13,emissiveIntensity:.6,side:THREE.DoubleSide}),
    fireCore:material(0xffd66b,.5,{emissive:0xffbc28,emissiveIntensity:.8,side:THREE.DoubleSide})
  };
  function mesh(g,key,parent=body){const m=new THREE.Mesh(g,materials[key]);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
  function oval(p,s,key,parent=body){const g=new THREE.SphereGeometry(1,28,18);g.scale(...s);const m=mesh(g,key,parent);m.position.set(...p);return m;}
  // A smoothly tapered curve, with parallel transported frames. Rounded joins
  // and non-uniform radii give limbs/horns a sculpted, continuous silhouette.
  function curve(points,radii,key,parent=body,steps=28,sides=10){
    const c=new THREE.CatmullRomCurve3(points.map(V)),frames=c.computeFrenetFrames(steps,false),p=[],idx=[];
    for(let i=0;i<=steps;i++){const t=i/steps,q=c.getPointAt(t),f=t*(radii.length-1),j=Math.min(radii.length-2,Math.floor(f)),r=THREE.MathUtils.lerp(radii[j],radii[j+1],f-j);
      for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2,v=q.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);p.push(...v.toArray());}
      if(i)for(let k=0;k<sides;k++){const a=(i-1)*(sides+1)+k,b=a+sides+1;idx.push(a,a+1,b,a+1,b+1,b);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();return mesh(g,key,parent);
  }
  // Pear-shaped torso, narrowing continuously into the neck. The cream patch
  // follows the actual surface instead of looking like an oval stuck onto it.
  const sections=[[.47,.23,.24,-.11],[.63,.39,.36,-.10],[.98,.50,.43,-.13],[1.33,.47,.40,-.14],[1.64,.35,.32,-.08],[1.90,.25,.24,.04],[2.14,.22,.22,.24],[2.35,.25,.23,.44]];
  function torso(patch=false){const p=[],idx=[],n=32,rows=34,curveS=new THREE.CatmullRomCurve3(sections.map(s=>new THREE.Vector3(s[0],s[1],s[2]))),zCurve=new THREE.CatmullRomCurve3(sections.map(s=>new THREE.Vector3(s[0],s[3],0)));
    for(let i=0;i<=rows;i++){const t=patch?.035+i/rows*.84:i/rows,q=curveS.getPoint(t),z=zCurve.getPoint(t).y;
      for(let j=0;j<=n;j++){const a=patch?(-.78+j/n*1.56):j/n*Math.PI*2;const edge=patch?Math.sin(Math.PI*i/rows)**.28:1;const theta=patch?a*edge:a;p.push(Math.sin(theta)*(q.y+(patch?.006:0)),q.x,Math.cos(theta)*(q.z+(patch?.008:0))+z);}
      if(i)for(let j=0;j<n;j++){const a=(i-1)*(n+1)+j,b=a+n+1;idx.push(a,a+1,b,a+1,b+1,b);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();mesh(g,patch?'cream':'orange');}
  torso();torso(true);
  // Broad cheekbones, protruding muzzle and swept horns make the silhouette
  // recognisable from the following camera, without relying on a texture.
  oval([0,2.40,.61],[.29,.29,.35],'orange');
  oval([0,2.29,.90],[.255,.15,.34],'light');
  oval([0,2.205,.86],[.235,.075,.31],'cream');
  for(const s of[-1,1]){
    curve([[s*.20,2.57,.46],[s*.28,2.79,.31],[s*.29,2.99,.14]],[.115,.070,.001],'orange',body,24,12);
    // Eye surfaces follow the sloping cheek; long brows give a gentle alert look.
    const eye=oval([s*.224,2.48,.80],[.090,.105,.028],'white');eye.rotation.y=s*.38;
    const iris=oval([s*.231,2.477,.830],[.043,.073,.015],'eye');iris.rotation.y=s*.38;
    const pupil=oval([s*.231,2.479,.845],[.017,.055,.009],'pupil');pupil.rotation.y=s*.38;
    oval([s*.222,2.507,.854],[.012,.018,.006],'white');
    curve([[s*.14,2.565,.79],[s*.23,2.59,.76],[s*.29,2.54,.69]],[.035,.043,.014],'orange');
    oval([s*.122,2.334,1.197],[.024,.015,.009],'dark');
    curve([[s*.237,2.233,.94],[s*.18,2.222,1.122],[s*.015,2.22,1.20]],[.007,.008,.005],'dark',body,20,7);
    curve([[s*.19,2.23,1.05],[s*.18,2.185,1.06]],[.021,.001],'claw',body,8,9);
  }
  // Short powerful arms, curled hands and three carefully tapered claws.
  for(const s of[-1,1]){
    curve([[s*.32,1.75,.01],[s*.54,1.55,.12],[s*.60,1.45,.41]],[.16,.115,.09],'orange');
    oval([s*.59,1.44,.46],[.13,.115,.13],'orange');
    for(let k=0;k<3;k++)curve([[s*(.51+k*.075),1.43,.50],[s*(.51+k*.075),1.40,.63],[s*(.51+k*.075),1.36,.66]],[.042,.025,.001],'claw',body,12,8);
  }
  const legs=[];
  for(const s of[-1,1]){
    const leg=new THREE.Group();leg.name=s<0?'charizard-left-leg':'charizard-right-leg';leg.position.set(s*.36,.89,-.10);group.add(leg);
    oval([s*.06,-.05,0],[.235,.37,.26],'orange',leg);
    curve([[s*.07,-.17,.015],[s*.09,-.43,-.025],[s*.10,-.66,.07]],[.19,.13,.125],'orange',leg);
    oval([s*.105,-.77,.19],[.18,.12,.27],'orange',leg);
    for(let k=-1;k<=1;k++)curve([[s*.105+k*.105,-.79,.34],[s*.105+k*.108,-.79,.47],[s*.105+k*.11,-.84,.50]],[.060,.044,.001],'claw',leg,15,10);
    legs.push({g:leg,s});
  }
  // Broad bat-like wings: orange leading edge, teal membrane and scalloped
  // trailing edge. The wrist flexes after the shoulder, so each stroke travels
  // outward through the wing instead of rotating a rigid flat triangle.
  const wings=[];
  function membrane(a,b,c,parent){const p=[],idx=[],n=13;for(let i=0;i<=n;i++)for(let j=0;j<=n;j++){const u=i/n,v=j/n,A=V(a),B=V(b),C=V(c),q=A.clone().multiplyScalar(1-u).add(B.multiplyScalar(u*(1-v))).add(C.multiplyScalar(u*v));q.lerp(A,Math.sin(Math.PI*v)*u*u*.14);q.y-=Math.sin(Math.PI*u)*Math.sin(Math.PI*v)*.075;p.push(...q.toArray());if(i&&j){const t=i*(n+1)+j;idx.push(t,t-1,t-n-1,t-1,t-n-2,t-n-1);}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();mesh(g,'wing',parent);}
  for(const s of[-1,1]){
    const wing=new THREE.Group();wing.name=s<0?'charizard-left-wing':'charizard-right-wing';wing.position.set(s*.36,1.86,-.22);body.add(wing);
    const shoulder=[0,0,0],elbow=[s*.86,.23,-.13];
    curve([shoulder,[s*.37,.19,.02],elbow],[.12,.092,.068],'orange',wing,26,12);
    membrane(shoulder,elbow,[s*.16,.05,-.64],wing);
    curve([[s*.16,.05,-.64],[s*.07,-.025,-.28],shoulder],[.018,.028,.052],'orange',wing,18,9);
    const hand=new THREE.Group();hand.name='charizard-wing-wrist';hand.position.set(...elbow);wing.add(hand);wings.push({g:wing,hand,s});
    const wrist=[0,0,0],tip=[s*1.65,.09,-.27];
    const fingers=[[s*1.34,-.08,-1.11],[s*.64,-.14,-1.45],[s*-.12,-.13,-1.19],[s*-.69,-.17,-.48]];
    curve([wrist,[s*.73,.19,-.03],tip],[.075,.050,.006],'orange',hand,32,12);
    membrane(wrist,tip,fingers[0],hand);
    for(let i=0;i<fingers.length-1;i++)membrane(wrist,fingers[i],fingers[i+1],hand);
    for(const p of fingers.slice(0,-1))curve([wrist,[p[0]*.66,.025,p[2]*.54],p],[.044,.028,.005],'orange',hand,24,10);
    curve([wrist,[s*-.32,-.05,-.27],fingers.at(-1)],[.058,.033,.013],'orange',hand,22,10);
    const edge=[tip,...fingers],rim=[];for(let i=0;i<edge.length-1;i++)for(let k=0;k<9;k++){const t=k/8;rim.push(V(edge[i]).lerp(V(edge[i+1]),t).lerp(V(wrist),Math.sin(t*Math.PI)*.14).toArray());}
    curve(rim,[.016,.016,.013,.012,.008],'dark',hand,72,8);
    for(const p of fingers.slice(0,3))curve([[p[0]*.19,-.012,p[2]*.19],[p[0]*.51,-.045,p[2]*.50],[p[0]*.77,-.07,p[2]*.77]],[.009,.007,.003],'wingVein',hand,18,6);
    curve([wrist,[s*.035,.16,.05],[s*.015,.26,.15]],[.062,.036,.001],'claw',hand,14,10);
  }
  // The tail trails behind the flight direction. Only its joint responds to
  // wing beats and banking, leaving the saddle stable for the seated rider.
  const tail=new THREE.Group();tail.name='charizard-tail';tail.position.set(0,.70,-.40);body.add(tail);
  curve([[0,0,0],[.12,-.22,-.38],[.27,-.21,-.77],[.27,.03,-1.10],[.21,.35,-1.24]],[.23,.18,.12,.075,.035],'orange',tail,44,14);
  const fire=new THREE.Group();fire.position.set(.21,.38,-1.24);tail.add(fire);
  // Three asymmetric flame tongues instead of a sphere or a single cone.
  curve([[0,-.07,0],[.01,.08,0],[-.03,.27,0],[.05,.47,-.025]],[.11,.14,.075,.001],'flame',fire,22,10);
  curve([[-.07,.02,0],[-.15,.18,.015],[-.10,.32,.025]],[.07,.07,.001],'flame',fire,16,10);
  curve([[.05,0,-.015],[.13,.11,-.025],[.10,.26,-.04]],[.075,.075,.001],'flame',fire,16,10);
  curve([[0,-.06,.05],[0,.09,.09],[-.03,.24,.08]],[.075,.083,.001],'fireCore',fire,18,10);
  // Small practical saddle, waist strap, pommel and two reins for Ke's hands.
  oval([0,1.87,-.28],[.25,.10,.28],'leather');
  curve([[-.21,1.9,-.46],[0,1.98,-.50],[.21,1.9,-.46]],[.04,.05,.04],'leather');
  curve([[-.16,1.97,-.07],[0,2.03,-.02],[.16,1.97,-.07]],[.04,.045,.04],'leather');
  for(const s of[-1,1]){
    curve([[s*.16,1.98,.04],[s*.28,1.97,.25],[s*.24,2.10,.61]],[.013,.013,.013],'strap');
    curve([[s*.25,1.84,-.31],[s*.43,1.45,-.26],[s*.43,1.30,-.22]],[.017,.017,.017],'strap');
    const stirrup=new THREE.TorusGeometry(.075,.014,7,20);stirrup.scale(.8,1,1);stirrup.translate(s*.43,1.29,-.20);mesh(stirrup,'brass');
  }
  // Keep only a handful of draw calls per articulated part.
  const containers=[];group.traverse(o=>{if(o.isGroup)containers.push(o);});
  for(const container of containers){const buckets=new Map();for(const child of [...container.children]){if(!child.isMesh)continue;child.updateMatrix();let g=child.geometry.clone().applyMatrix4(child.matrix);g.deleteAttribute('uv');if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}if(!buckets.has(child.material))buckets.set(child.material,[]);buckets.get(child.material).push(g);container.remove(child);child.geometry.dispose();}for(const[m,geos]of buckets){const g=mergeGeometries(geos,false);const obj=new THREE.Mesh(g,m);obj.castShadow=obj.receiveShadow=true;container.add(obj);geos.forEach(g=>g.dispose());}}
  group.userData.front='+Z';group.userData.art='Original Charizard fan art, hand-authored geometry';
  group.userData.flight={wingspan:5.8,wingbeatHz:1.25,bodyWidth:1.45};
  return {group,seat:new THREE.Vector3(0,1.93,-.31),riderPose:'dragon-riding',length:3.15,width:5.8,
    flight:group.userData.flight,
    update(dt,{speed=0,time=0,airborne=1,bank=0}={}){
      const air=THREE.MathUtils.clamp(airborne,0,1),flying=air*air*(3-2*air),moving=Math.min(Math.abs(speed)/6.5,1);
      // A slower, wider hover stroke becomes a compact travelling stroke. The
      // fixed time frequency also keeps reduced-motion callers deterministic.
      const phase=time*Math.PI*2*1.25,stroke=Math.sin(phase),recovery=Math.max(0,-Math.cos(phase));
      for(const w of wings){
        // Fold up and back during the final metre of descent. Interpolate the
        // actual joints rather than shrinking the mesh: membrane and bones
        // retain their thickness and the same recognisable wing structure.
        w.g.rotation.z=w.s*THREE.MathUtils.lerp(1.0,.13+stroke*(.59-moving*.11),flying);
        w.g.rotation.y=w.s*THREE.MathUtils.lerp(.95,.045+recovery*.13,flying);
        w.g.rotation.x=-.035*stroke*flying;
        w.hand.rotation.z=w.s*THREE.MathUtils.lerp(-.34,Math.sin(phase-.56)*.16-.035,flying);
        w.hand.rotation.y=w.s*THREE.MathUtils.lerp(.50,recovery*.14+moving*.035,flying);
      }
      for(const l of legs){
        l.g.rotation.x=(1.05+moving*.10+Math.sin(phase-.85)*.025)*flying;
        l.g.rotation.z=l.s*(.09+Math.sin(phase-1)*.015)*flying;
        l.g.position.y=.89+.09*flying;
      }
      tail.rotation.x=(-.13+moving*.10+Math.sin(phase-1.0)*.035)*flying;
      tail.rotation.y=Math.sin(time*1.5)*.055-THREE.MathUtils.clamp(bank,-.5,.5)*.35;
      fire.scale.set(1+Math.sin(time*8)*.06,1+Math.sin(time*10)*.09,1+Math.sin(time*9)*.05);
      fire.rotation.x=.16*moving*flying;fire.rotation.z=Math.sin(time*5)*.06;
    },
    dispose(){const geos=new Set();group.traverse(o=>{if(o.geometry)geos.add(o.geometry);});geos.forEach(g=>g.dispose());Object.values(materials).forEach(m=>m.dispose());}
  };
}
