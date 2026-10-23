/* Crafted, static village details. Kept outside the navigation routes and merged
 * by material: near-view character without a scatter of filler or draw calls. */
import * as THREE from './lib/three.module.js';
import { RoundedBoxGeometry } from './lib/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from './lib/addons/utils/BufferGeometryUtils.js';

export function buildVillageDetails({scene,groundHeight,riverZ}) {
  const group=new THREE.Group();group.name='crafted-village-details';
  const buckets=new Map(),materials=new Map(),blockers=[];
  const C={wood:0x9e7851,woodLight:0xb68d5e,woodDark:0x70533d,iron:0x425854,brass:0xb49b67,rubber:0x354643,teal:0x4b8785,stone:0xbdb59b,stoneLight:0xd1c6aa,reed:0x738857,leaf:0x879664,seed:0x8b704e};
  function material(color,{metalness=0,roughness=.82,side=THREE.FrontSide}={}){const k=[color,metalness,roughness,side].join(':');if(!materials.has(k))materials.set(k,new THREE.MeshStandardMaterial({color,metalness,roughness,side}));return materials.get(k);}
  function add(g,color,parent=new THREE.Matrix4(),extra={}){g.applyMatrix4(parent);const m=material(color,extra);if(!buckets.has(m))buckets.set(m,[]);buckets.get(m).push(g);}
  function transform(x,y,z,rotation=0,lean=0){const o=new THREE.Object3D();o.position.set(x,y,z);o.rotation.set(0,rotation,lean);o.updateMatrix();return o.matrix;}
  function box(x,y,z,w,h,d,color,m=new THREE.Matrix4(),radius=.025){const g=new RoundedBoxGeometry(w,h,d,1,Math.min(radius,w*.24,h*.24,d*.24));g.translate(x,y,z);add(g,color,m);}
  function cylinder(x,y,z,rt,rb,h,color,m=new THREE.Matrix4(),n=12){const g=new THREE.CylinderGeometry(rt,rb,h,n);g.translate(x,y,z);add(g,color,m);}
  function rod(a,b,r,color,m=new THREE.Matrix4(),n=8){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),d=q.clone().sub(p),g=new THREE.CylinderGeometry(r,r,d.length(),n);const o=new THREE.Object3D();o.position.copy(p).add(q).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());o.updateMatrix();g.applyMatrix4(o.matrix);add(g,color,m);}
  function torus(x,y,z,r,t,color,m=new THREE.Matrix4(),rotationX=0){const g=new THREE.TorusGeometry(r,t,8,36);g.rotateX(rotationX);g.translate(x,y,z);add(g,color,m,{metalness:color===C.brass?.55:0,roughness:.55});}
  function pad(x,z,w,d){const base=groundHeight(x,z),m=transform(x,base+.035,z);for(let row=0;row<3;row++)for(let col=0;col<5;col++)box((col-2)*w/5,.02,(row-1)*d/3,w/5-.025,.06,d/3-.025,(row+col)%3?C.stone:C.stoneLight,m,.02);return base+.07;}
  function bench(x,z,angle=0){
    const y=pad(x,z,2.8,1.45),m=transform(x,y,z,angle);
    // Tapered cast-metal legs and five broad wooden seat slats.
    for(const sx of [-.89,.89]){
      rod([sx,.08,-.29],[sx,.70,-.22],.052,C.iron,m);rod([sx,.08,.38],[sx,.65,.26],.052,C.iron,m);
      rod([sx,.46,-.28],[sx,.46,.40],.045,C.iron,m);rod([sx,.08,-.34],[sx,.08,-.16],.045,C.iron,m);rod([sx,.08,.29],[sx,.08,.49],.045,C.iron,m);
      rod([sx,.45,-.26],[sx,1.28,-.45],.046,C.iron,m);rod([sx,.52,.34],[sx,.92,.31],.037,C.iron,m);rod([sx,.92,.31],[sx,.97,-.34],.038,C.iron,m);
    }
    rod([-.89,.32,0],[.89,.32,0],.04,C.iron,m);
    for(let i=0;i<5;i++)box(0,.56,-.23+i*.13,2.35,.095,.112,i%2?C.woodLight:C.wood,m,.018);
    for(let i=0;i<3;i++){const yy=.88+i*.16,zz=-.36-i*.038;box(0,yy,zz,2.35,.137,.095,i===1?C.woodLight:C.wood,m,.02);for(const xx of [-.89,.89]){const g=new THREE.CylinderGeometry(.022,.022,.010,8);g.rotateX(Math.PI/2);g.translate(xx,yy,zz+.053);add(g,C.brass,m,{metalness:.45,roughness:.5});}}
    // Two slim grain seams per seat: tactile timber, visible only nearby.
    for(const zz of [-.08,.18])box(0,.609,zz,2.17,.002,.006,C.woodDark,m,0);
    const ca=Math.abs(Math.cos(angle)),sa=Math.abs(Math.sin(angle));blockers.push({x,z,w:(2.45*ca+1.05*sa)/2,d:(2.45*sa+1.05*ca)/2});
  }
  bench(-10.65,13.9,-.13);bench(3.4,13.9,.13);

  // A small bicycle outside the workshop court. Tubular geometry keeps the form
  // light; the basket, spokes, fenders and saddle give it a human scale.
  function bicycle(x,z,angle){
    const y=pad(x,z,2.65,1.3),m=transform(x,y,z,angle,-.065),metal={metalness:.5,roughness:.5};
    for(const xx of [-.76,.76]){
      torus(xx,.53,0,.46,.054,C.rubber,m);torus(xx,.53,0,.405,.017,C.brass,m);
      for(let i=0;i<10;i++){const a=i/10*Math.PI*2;rod([xx,.53,.015],[xx+Math.sin(a)*.40,.53+Math.cos(a)*.40,.015],.009,0x9da69a,m,6);}
      const axle=new THREE.CylinderGeometry(.047,.047,.20,12);axle.rotateX(Math.PI/2);axle.translate(xx,.53,0);add(axle,C.iron,m,metal);
      // A visible half fender follows the top of each wheel.
      const fender=new THREE.TorusGeometry(.53,.025,6,20,Math.PI);fender.translate(xx,.53,0);add(fender,C.teal,m);
    }
    const back=[-.76,.53,0],crank=[-.12,.43,0],seat=[-.29,1.18,0],head=[.48,1.18,0],front=[.76,.53,0];
    for(const[a,b]of [[back,crank],[back,seat],[seat,crank],[seat,head],[head,crank],[head,front]])rod(a,b,.034,C.teal,m);
    rod([-.29,1.12,0],[-.31,1.34,0],.027,C.iron,m);box(-.33,1.36,0,.35,.07,.23,C.woodDark,m,.035);
    rod([.48,1.15,0],[.50,1.44,0],.026,C.iron,m);rod([.50,1.44,-.25],[.50,1.44,.25],.026,C.iron,m);for(const side of [-1,1])rod([.50,1.44,side*.25],[.68,1.44,side*.25],.034,C.woodDark,m);
    torus(-.12,.43,.08,.13,.021,C.iron,m);rod([-.12,.43,.11],[.08,.29,.11],.018,C.iron,m);box(.08,.29,.17,.14,.035,.17,C.woodDark,m,.01);
    rod([-.12,.43,-.11],[-.30,.56,-.11],.018,C.iron,m);box(-.3,.56,-.17,.14,.035,.17,C.woodDark,m,.01);
    // Open slatted wooden basket; no opaque cube hides the handlebars.
    for(const side of [-1,1]){box(.91,1.27,side*.24,.48,.035,.035,C.wood,m);box(.91,1.06,side*.24,.48,.035,.035,C.wood,m);for(let j=0;j<4;j++)box(.72+j*.125,1.165,side*.24,.028,.21,.028,C.woodLight,m);}
    for(const xx of [.67,1.15])for(let j=0;j<4;j++)box(xx,1.165,-.21+j*.14,.028,.21,.028,C.woodLight,m);box(.91,1.035,0,.51,.025,.51,C.wood,m);
    // Simple low rack, behind the bicycle rather than across the path.
    const rack=transform(x,y,z+.5,angle);rod([-.90,0,0],[-.9,.65,0],.035,C.iron,rack);rod([-.9,.65,0],[.9,.65,0],.035,C.iron,rack);rod([.9,.65,0],[.9,0,0],.035,C.iron,rack);
    blockers.push({x,z:z+.1,w:1.4,d:.65});
  }
  bicycle(3.6,7.65,.18);

  // Flush brass orientation mark in the arrival court; it never blocks walking.
  const cx=-4.2,cz=9.45,cy=groundHeight(cx,cz)+.104;
  const medallion=transform(cx,cy,cz);
  const disc=new THREE.CylinderGeometry(.68,.68,.018,48);add(disc,0x95866b,medallion,{metalness:.35,roughness:.68});
  torus(0,.018,0,.60,.018,C.brass,medallion,Math.PI/2);torus(0,.020,0,.13,.012,C.brass,medallion,Math.PI/2);
  for(let i=0;i<8;i++){
    const a=i*Math.PI/4,r=i%2?.43:.52,s=i%2?.07:.11;
    const shape=new THREE.Shape();shape.moveTo(0,-r);shape.lineTo(s,-.15);shape.lineTo(0,-.20);shape.lineTo(-s,-.15);shape.closePath();
    const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);g.rotateY(a);g.translate(0,.031,0);add(g,i%2?0x526963:C.brass,medallion,{metalness:.4,roughness:.5,side:THREE.DoubleSide});
  }
  // Court drainage: dark recess, bronze rim and a row of real narrow slits.
  function drain(x,z,angle){const y=groundHeight(x,z)+.102,m=transform(x,y,z,angle);box(0,0,0,2.15,.022,.24,C.iron,m,.008);for(const side of [-1,1])box(0,.017,side*.115,2.2,.028,.025,C.brass,m,.006);for(let i=0;i<20;i++)box(-1.0+i*.105,.015,0,.035,.025,.20,0x8e907d,m,.005);}
  drain(-8.8,10.9,-.03);drain(1.25,10.2,Math.PI/2);

  // Reeds occur as a few readable bank-side clumps, not evenly scattered noise.
  function reedClump(x,z,count=7){const y=groundHeight(x,z),m=transform(x,y,z);for(let i=0;i<count;i++){
    const a=i*2.399,rr=.12+(i%3)*.08,bx=Math.sin(a)*rr,bz=Math.cos(a)*rr,h=.48+(i%4)*.16;
    rod([bx,0,bz],[bx+.07,h,bz],.012,C.reed,m,5);
    if(i%3===0)cylinder(bx+.07,h+.055,bz,.027,.027,.22,C.seed,m,8);
    for(const side of [-1,1]){const leaf=new THREE.Shape();leaf.moveTo(0,0);leaf.quadraticCurveTo(side*.22,.14,side*.23,h*.70);leaf.quadraticCurveTo(side*.12,.45,0,0);const g=new THREE.ShapeGeometry(leaf,4);g.rotateY(a);g.translate(bx,.18,bz);add(g,i%2?C.reed:C.leaf,m,{side:THREE.DoubleSide});}
  }}
  for(const[x,side]of[[-13,-1],[-12.2,1],[-5,-1],[4.5,-1],[5.4,1],[13.0,-1],[13.8,1]]){const z=riverZ(x)+side*1.95;reedClump(x,z);}

  let drawCalls=0;
  for(const[mat,parts]of buckets){const normalized=parts.map(g=>g.index?g.toNonIndexed():g);const merged=mergeGeometries(normalized,false);const object=new THREE.Mesh(merged,mat);object.castShadow=object.receiveShadow=true;group.add(object);for(const g of new Set([...parts,...normalized]))g.dispose();drawCalls++;}
  scene.add(group);group.userData.detailDrawCalls=drawCalls;
  return {group,blockers};
}
