/* Secondary landmarks. Main arrival, studio and laboratory use authored Blender assets. */
import { mergeGeometries } from './lib/BufferGeometryUtils.js';

export function buildSecondaryLandmarks(context) {
  const {THREE,scene,groundHeight,box:roundedBox,cyl,sphere,roof,add,mat,shadow,lineBetween,C,blockers,targets,flagCloths}=context;
  // Fine mouldings do not need the dense bevel mesh used by larger forms.
  function box(parent,x,y,z,w,h,d,color,extra={}){
    return Math.min(w,h,d)<=.12?add(new THREE.BoxGeometry(w,h,d),color,parent,x,y,z,extra):roundedBox(parent,x,y,z,w,h,d,color,extra);
  }
  function windowPane(g,x,y,z,w=.43,h=.6){box(g,x,y,z,w+.12,h+.12,.07,0xe9e2ce);box(g,x,y,z+.045,w,h,.035,C.glass,{roughness:.25});box(g,x,y,z+.08,.035,h,.04,0xd3ddce);}
  function door(g,x,y,z,color=0x627f7b,w=.65,h=1.15){box(g,x,y,z,w,h,.1,color);sphere(g,x+w*.28,y,z+.08,.033,0xe4c890);}
  function flowerpot(g,x,z,color=0xd4807a){cyl(g,x,.38,z,.19,.14,.37,0xc69977,12);sphere(g,x,.65,z,.26,C.darkLeaf,1,.6,1);for(let i=0;i<4;i++)sphere(g,x+Math.cos(i*2)*.16,.75,z+Math.sin(i*2)*.16,.083,color);}
  function flag(g,x,y,z,color){cyl(g,x,y/2,z,.027,.027,y,0x7b8d84,8);const cloth=box(g,x+.22,y-.2,z,.44,.27,.025,color);flagCloths.push(cloth);sphere(g,x,y+.04,z,.06,C.gold);}
  // A dark reveal, glass set behind the frame, and a projecting sill make small
  // windows read as openings from the moving camera instead of painted squares.
  function insetWindow(g,x,y,z,w,h,trim=0xf4e7cd){
    box(g,x,y,z,w+.16,h+.16,.10,0x52676c);
    box(g,x,y,z+.045,w,h,.035,0x719aab,{roughness:.3});
    for(const side of [-1,1])box(g,x+side*(w/2+.035),y,z+.09,.07,h+.17,.13,trim);
    for(const side of [-1,1])box(g,x,y+side*(h/2+.035),z+.09,w+.21,.07,.13,trim);
    box(g,x,y-h/2-.085,z+.145,w+.28,.075,.25,trim);
    box(g,x,y,z+.08,.035,h,.055,trim);
    box(g,x,y+.06,z+.08,w,.035,.055,trim);
    // A quiet reflection in the upper panes, not an emissive light source.
    box(g,x-w*.23,y+h*.28,z+.066,w*.29,.025,.008,0xc0d3cf);
  }
  function archOpening(g,x,y,z,w,h){
    const r=w/2,s=new THREE.Shape();s.moveTo(-r,0);s.lineTo(r,0);s.lineTo(r,h-r);s.absarc(0,h-r,r,0,Math.PI,false);s.closePath();
    add(new THREE.ShapeGeometry(s),0x3f615f,g,x,y,z);
    for(const side of [-1,1])box(g,x+side*(r+.025),y+(h-r)/2,z+.04,.055,h-r,.09,0xf9edcf);
    add(new THREE.TorusGeometry(r+.025,.035,5,16,Math.PI),0xf9edcf,g,x,y+h-r,z+.04);
    for(let i=0;i<4;i++)box(g,x,y+.09+i*.09,z+.025,w-.07,.027,.05,0x8ca89a);
  }
  function lantern(g,x,y,z){
    box(g,x,y,z,.11,.22,.065,0x6c7164);
    box(g,x,y-.035,z+.12,.14,.21,.13,0xeecb86,{emissive:0xe6b55d,emissiveIntensity:.08});
    for(const side of [-1,1])box(g,x+side*.077,y-.035,z+.12,.018,.24,.15,0x6c7164);
    roof(g,x,y+.105,z+.12,.23,.10,.23,0x6c7164);
    box(g,x,y-.16,z+.12,.19,.035,.18,0x6c7164);
  }
  function rectangularHipRoof(g,x,y,z,w,h,d,color){
    const shape=new THREE.BufferGeometry();
    shape.setAttribute('position',new THREE.Float32BufferAttribute([-w/2,-h/2,-d/2,w/2,-h/2,-d/2,w/2,-h/2,d/2,-w/2,-h/2,d/2,0,h/2,0],3));
    shape.setIndex([0,4,1,1,4,2,2,4,3,3,4,0,0,1,2,0,2,3]);
    const geometry=shape.toNonIndexed();shape.dispose();geometry.computeVertexNormals();
    return add(geometry,color,g,x,y,z);
  }
  // Fold static architectural parts into material batches. Door hit volumes and
  // animated flags retain their identities for the existing world interactions.
  function finishArchitecture(g,name){
    g.name=name;g.updateMatrixWorld(true);
    const local=new THREE.Matrix4().copy(g.matrixWorld).invert(),batches=new Map();
    g.traverse(o=>{
      if(!o.isMesh||o.userData.placeId||flagCloths.includes(o)||Array.isArray(o.material)||o.material.transparent)return;
      const key=o.material.uuid+':'+o.castShadow+':'+o.receiveShadow;
      if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);
    });
    let before=0,after=0;
    for(const objects of batches.values()){
      before+=objects.length;after++;
      if(objects.length===1)continue;
      const parts=objects.map(o=>{
        const geometry=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();
        geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(local,o.matrixWorld));
        return geometry;
      });
      const geometry=mergeGeometries(parts,false);parts.forEach(part=>part.dispose());
      if(!geometry){after+=objects.length-1;continue;}
      geometry.computeBoundingSphere();
      const merged=new THREE.Mesh(geometry,objects[0].material);
      merged.name=name+' · static detail';merged.castShadow=objects[0].castShadow;merged.receiveShadow=objects[0].receiveShadow;
      objects.forEach(o=>{o.removeFromParent();o.geometry.dispose();});g.add(merged);
    }
    g.userData.architecture={parts:before,batches:after};
  }
  function buildingBase(place,w=3.4,d=3.2){
    const g=new THREE.Group();g.position.set(place.x,groundHeight(place.x,place.z),place.z);scene.add(g);shadow(scene,place.x,place.z,w*.75,d*.66);
    box(g,0,.06,0,w+.35,.12,d+.35,0xddd9be);box(g,0,.14,0,w+.05,.12,d+.05,0xeee5cb);
    blockers.push({x:place.x,z:place.z,w:w/2+.28,d:d/2+.28});
    const hit=box(g,0,1.6,0,w,3.2,d,0xffffff,{transparent:true,opacity:0,depthWrite:false});hit.castShadow=false;hit.receiveShadow=false;hit.userData.placeId=place.id;targets.push(hit);
    return g;
  }
  function tsinghua(p){
    const g=buildingBase(p,3.65,2.25);
    for(const s of [-1,1]){
      box(g,s*1.2,1.09,0,.68,1.85,.65,C.cream);box(g,s*1.2,.31,0,.85,.22,.85,0xddd5b7);
      box(g,s*1.2,2.0,0,.87,.2,.84,C.cream);roof(g,s*1.2,2.29,0,1.2,.48,1.2,0x588b81);
      box(g,s*1.69,.75,0,.36,1.05,.44,0xeee5cd);box(g,s*1.69,1.33,0,.48,.12,.59,0x8aa69b);
    }
    box(g,0,2.1,0,1.8,.32,.66,C.cream);roof(g,0,2.46,0,2.12,.48,1.12,0x648b7c);
    const arch=add(new THREE.TorusGeometry(.72,.16,8,24,Math.PI),C.cream,g,0,1.36,.02);arch.rotation.z=0;
    box(g,0,2.14,.36,.72,.22,.025,0x9e8a71);
    for(const s of [-1,1]){flowerpot(g,s*1.68,1.15,0xa991bc);sphere(g,s*1.8,.42,-.75,.42,0x85a475,1,.8,1);}
    return 2.9;
  }
  function berkeley(p){
    const g=buildingBase(p,2.45,2.45);
    box(g,0,2.1,0,1.6,3.8,1.65,0xeee5cb);box(g,0,.45,0,2.1,.35,2.1,0xd8d4b9);
    box(g,0,.66,0,1.92,.08,1.96,0xf8efdb);box(g,0,.24,0,2.23,.10,2.23,0xc5c4a9);
    for(let y=.83;y<3.7;y+=.58)box(g,0,y,0,1.63,.025,1.68,0xd5d2bd);
    for(const x of [-.73,.73])for(const z of [-.77,.77])box(g,x,2.1,z,.12,3.3,.12,0xf8f0dc);
    box(g,0,3.94,0,1.82,.07,1.86,0xc7c9ae);
    box(g,0,4.04,0,1.98,.13,2.0,0xf8efdb);box(g,0,4.17,0,1.85,.07,1.87,0xd5d7bd);
    box(g,0,4.56,0,1.55,.86,1.55,0xefe8d1);
    // Four complete faces keep the landmark legible while orbiting the tower.
    for(let face=0;face<4;face++){
      const wall=new THREE.Group();wall.rotation.y=face*Math.PI/2;g.add(wall);
      for(const x of [-.48,0,.48])archOpening(wall,x,4.28,.796,.25,.63);
      for(const y of [1.95,2.67])insetWindow(wall,0,y,.844,.24,.39);
      const clock=add(new THREE.CircleGeometry(.32,32),0xfff9e6,wall,0,3.52,.861);clock.castShadow=false;
      const rim=add(new THREE.TorusGeometry(.35,.035,6,32),0xa5ae9b,wall,0,3.52,.89);rim.castShadow=false;
      for(let hour=0;hour<12;hour++){
        const a=hour*Math.PI/6;
        const tick=box(wall,Math.sin(a)*.268,3.52+Math.cos(a)*.268,.907,.017,hour%3===0?.064:.033,.012,0x827d64);tick.rotation.z=-a;
      }
      box(wall,0,3.62,.919,.022,.22,.025,C.ink);
      const hand=box(wall,.08,3.52,.923,.18,.023,.025,C.ink);hand.rotation.z=-.35;
      sphere(wall,0,3.52,.944,.032,0x9e8861,1,1,.35);
      for(const x of [-.72,-.36,0,.36,.72])box(wall,x,3.91,.92,.10,.12,.12,0xe6ddbf);
    }
    box(g,0,5.04,0,1.77,.08,1.77,0xc7c9ae);box(g,0,5.14,0,1.98,.14,1.98,0xf3ead0);
    roof(g,0,5.68,0,2.05,1.0,2.05,0x5a8b83);
    for(const x of [-1,1])for(const z of [-1,1])lineBetween(g,[x*.99,5.2,z*.99],[0,6.2,0],.017,0x8aa591);
    cyl(g,0,6.27,0,.035,.035,.38,0xb69a65,8);sphere(g,0,6.48,0,.07,0xe4c482);
    door(g,0,.84,.88,0x72877c,.64,1.12);
    for(const side of [-1,1])box(g,side*.37,.84,.91,.09,1.24,.16,0xf4e8ca);
    box(g,0,1.48,.91,.84,.11,.18,0xf4e8ca);box(g,0,.27,1.01,.88,.09,.32,0xc5c4a9);
    box(g,0,1.68,.86,.38,.10,.035,0xb59d69);lantern(g,.54,1.32,.88);
    flowerpot(g,-1.04,1.05,C.gold);flowerpot(g,1.04,1.05,C.gold);
    finishArchitecture(g,'Berkeley tower');
    return 6.65;
  }
  function imaging(p){
    const g=buildingBase(p,3.7,3.1);
    cyl(g,0,1.05,0,1.56,1.58,1.7,0xf0dca9,32);cyl(g,0,1.96,0,1.69,1.69,.18,0xf8efd7,32);
    const dome=add(new THREE.SphereGeometry(1.56,32,18,0,Math.PI*2,0,Math.PI/2),0x568fa6,g,0,2.03,0);
    const stripe=add(new THREE.SphereGeometry(1.574,16,18,1.13,.2,0,Math.PI/2),0x567b8e,g,0,2.03,0);
    for(const s of [-1,1])windowPane(g,s*.9,1.2,1.28,.42,.54);
    door(g,0,.84,1.57,0x728e8f,.68,1.2);
    const lens=new THREE.Group();lens.position.set(.25,2.95,.64);lens.rotation.x=.9;lens.rotation.z=-.5;g.add(lens);
    cyl(lens,0,.05,0,.21,.29,1.18,0xece7cf,20);cyl(lens,0,.65,0,.28,.28,.14,0x435e69,20);cyl(lens,0,.735,0,.21,.21,.02,0x7bbed0,20);
    flowerpot(g,-1.6,1.2,0xe1ae70);flowerpot(g,1.6,1.2,0xe1ae70);flag(g,1.65,1.15,-1.5,0xe6b763);
    return 3.9;
  }
  function pika(p){
    const g=buildingBase(p,3.7,2.9);
    box(g,0,1.25,0,3.25,2.02,2.48,0xf1dcd2);rectangularHipRoof(g,0,2.76,0,3.85,1.0,3.1,0xba6c91);
    box(g,0,.37,0,3.34,.21,2.57,0xcdb4a3);box(g,0,.5,0,3.38,.055,2.61,0xe5cdbb);
    box(g,0,2.21,0,3.5,.08,2.81,0xd9baa8);box(g,0,2.29,0,3.67,.09,2.98,0xf4e5d6);
    for(const x of [-.94,.94]){
      insetWindow(g,x,1.32,1.27,.68,.76);
      box(g,x,.76,1.38,.77,.18,.26,0xbca18e);
      box(g,x,.87,1.38,.65,.055,.20,0x637f61);
      for(const dx of [-.23,0,.23])sphere(g,x+dx,.95,1.39,.10,0xdba0b7,1,.65,.75);
    }
    // Side glazing and corner trim hold up to the closer, orbitable view.
    for(const side of [-1,1]){
      const wall=new THREE.Group();wall.position.x=side*1.63;wall.rotation.y=side*Math.PI/2;g.add(wall);
      insetWindow(wall,.18,1.35,.015,.75,.79);
      for(const z of [-1.17,1.17])box(g,side*1.59,1.33,z,.09,1.68,.10,0xf6e7d5);
      cyl(g,side*1.73,1.29,-1.24,.035,.035,1.81,0xab9093,8);
      lineBetween(g,[side*1.73,2.17,-1.24],[side*1.8,2.25,-1.34],.035,0xab9093);
      box(g,side*1.72,2.28,0,.11,.09,2.90,0xaa8294);
    }
    for(const x of [-1,1])for(const z of [-1,1])lineBetween(g,[x*1.88,2.29,z*1.50],[0,3.27,0],.017,0xd18ca9);
    door(g,0,.86,1.29,0x9e849c,.69,1.25);
    for(const s of [-1,1])box(g,s*.40,.88,1.34,.085,1.37,.14,0xf6e7d5);
    box(g,0,1.58,1.34,.89,.09,.14,0xf6e7d5);box(g,0,.26,1.45,.91,.075,.32,0xd6c3ae);
    box(g,0,1.14,1.355,.46,.38,.018,0xc8c0cc,{roughness:.35});box(g,0,.54,1.355,.47,.27,.018,0xb49cab);
    const awning=box(g,0,1.76,1.73,1.2,.12,1.0,0xe3b5bf);awning.rotation.x=.12;
    box(g,0,1.64,2.20,1.23,.14,.055,0xd49bad);
    for(let i=0;i<6;i++)box(g,-.49+i*.196,1.64,2.233,.085,.13,.012,0xf6e2d8);
    for(const s of [-1,1]){
      cyl(g,s*.53,.92,2.06,.035,.035,1.6,0xaa8e86,8);cyl(g,s*.53,.22,2.06,.065,.08,.14,0xc7ad98,8);
      lineBetween(g,[s*.53,1.35,2.06],[s*.32,1.7,2.06],.022,0xaa8e86);
    }
    // A framed play emblem and a small film-strip plaque identify the studio.
    box(g,0,2.43,1.51,1.04,.61,.10,0xa78389);box(g,0,2.43,1.575,.91,.48,.04,0xfff6df);
    const play=new THREE.Shape();play.moveTo(-.10,-.16);play.lineTo(.18,0);play.lineTo(-.10,.16);play.closePath();
    add(new THREE.ExtrudeGeometry(play,{depth:.025,bevelEnabled:false}),0xb97e94,g,0,2.45,1.61);
    for(const s of [-1,1])sphere(g,s*.42,2.43,1.605,.022,0xc49d70,1,1,.4);
    box(g,-.53,1.18,1.29,.18,.28,.045,0x7f7b80);
    for(let i=0;i<3;i++)box(g,-.53,1.26-i*.08,1.319,.10,.035,.012,0xf5debb);
    lantern(g,.52,1.34,1.29);
    cyl(g,-1.05,3.21,-.4,.24,.24,1.18,0xf0d9ce,12);
    for(const y of [3.52,3.64,3.76])cyl(g,-1.05,y,-.4,.265,.265,.055,0xb29798,12);
    cyl(g,-1.05,3.83,-.4,.32,.28,.12,0xe8d8ca,12);
    flowerpot(g,-1.62,1.52,0xe1a1b4);flowerpot(g,1.62,1.52,0xe1a1b4);
    finishArchitecture(g,'Pika studio');
    return 3.9;
  }
  function adobe(p){
    const g=buildingBase(p,4.2,3.4);
    box(g,0,1.23,0,3.85,2.0,2.85,0xf3e5d2);box(g,0,2.36,0,4.2,.26,3.25,0xcb6956);
    box(g,-1.3,2.95,-.55,1.1,.9,1.4,0xe18d76);box(g,-1.3,3.48,-.55,1.25,.15,1.55,0xc56f60);
    for(const x of [-1.3,-.55,.2,.95])windowPane(g,x,1.4,1.45,.56,.84);
    box(g,1.44,.95,1.49,.56,1.4,.09,0x668e97);
    const awning=box(g,0,2.08,1.72,4.1,.1,.6,0xf5c6ac);awning.rotation.x=.18;
    const panel=box(g,-1.3,2.97,.19,.64,.53,.03,0xfff4dd);
    // A custom A-shaped doorway mark, not a reproduced corporate logo.
    lineBetween(g,[-1.53,2.75,.22],[-1.3,3.19,.22],.036,0xc76c5b);lineBetween(g,[-1.3,3.19,.22],[-1.07,2.75,.22],.036,0xc76c5b);
    box(g,-1.3,2.89,.22,.27,.04,.03,0xc76c5b);
    for(let i=0;i<3;i++){const solar=box(g,.5,2.56,-.72+i*.58,1.35,.06,.45,0x638993,{roughness:.3});solar.rotation.x=.12;}
    flowerpot(g,-1.91,1.75,0xdd9a6c);flowerpot(g,1.99,1.75,0xdd9a6c);flag(g,1.86,3.3,-1.36,0xdf8a6f);
    return 3.8;
  }
  function mrfoundry(p){
    const g=buildingBase(p,3.6,3.0);
    box(g,0,1.1,0,3.18,1.75,2.5,0xe8edda);roof(g,0,2.46,0,3.82,1.0,3.16,0x508d87);box(g,0,2.0,0,3.6,.14,2.95,0xd4dfc8);
    windowPane(g,-1.03,1.16,1.28,.61,.65);windowPane(g,1.03,1.16,1.28,.61,.65);
    door(g,0,.84,1.31,0x5d8584,.67,1.2);
    const scan=add(new THREE.TorusGeometry(.39,.11,10,28),0xf8f3df,g,0,2.38,1.53);scan.castShadow=true;
    add(new THREE.TorusGeometry(.26,.05,8,24),0x79b4cc,g,0,2.38,1.59);
    box(g,0,2.19,1.81,.29,.07,.55,0xa7c6d1);
    cyl(g,-1.18,2.83,-.5,.22,.28,.75,0x7e9991,12);cyl(g,-1.18,3.23,-.5,.32,.32,.1,0xdce6d0,12);
    flowerpot(g,-1.57,1.52,0x88b3c0);flowerpot(g,1.57,1.52,0x88b3c0);
    return 3.5;
  }
  function internships(p){
    const g=buildingBase(p,3.2,2.5);
    // A canvas tent and noticeboard: an open invitation, rather than a locked quest.
    const triangle=new THREE.Shape();triangle.moveTo(-1.45,0);triangle.lineTo(0,2.05);triangle.lineTo(1.45,0);triangle.closePath();
    const tent=add(new THREE.ExtrudeGeometry(triangle,{depth:2.45,bevelEnabled:false}),0xd7b66b,g,0,.25,-1.22);tent.castShadow=true;
    const opening=new THREE.Shape();opening.moveTo(-.64,0);opening.lineTo(0,1.58);opening.lineTo(.64,0);opening.closePath();
    add(new THREE.ShapeGeometry(opening),0x718c72,g,0,.27,1.24);
    lineBetween(g,[-1.48,.25,1.26],[0,2.3,1.26],.04,0xf1dfaa);lineBetween(g,[0,2.3,1.26],[1.48,.25,1.26],.04,0xf1dfaa);
    cyl(g,0,2.42,0,.035,.035,.38,0x8c8364,8);flag(g,1.6,2.1,-.8,0x7ea77c);
    box(g,-2.15,1.12,.72,.9,.75,.12,0xb18e68);box(g,-2.15,1.14,.8,.74,.6,.025,0xf8efd6);box(g,-2.15,.55,.72,.09,1.1,.09,0x947c59);
    for(let i=0;i<3;i++)box(g,-2.15,1.27-i*.13,.825,.47-i*.06,.025,.015,0x89a182);
    const roll=cyl(g,1.33,.4,1.5,.17,.17,.58,0xb7c5a3,12);roll.rotation.z=Math.PI/2;
    return 2.8;
  }

 return {tsinghua,berkeley,imaging,internships,pika};
}
