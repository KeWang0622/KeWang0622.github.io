import * as THREE from './lib/three.module.js';
import { RoundedBoxGeometry } from './lib/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from './lib/addons/utils/BufferGeometryUtils.js';

export const WORLD_LIMIT=64;
export { BRIDGE_XS } from './world-surfaces.js';
export const POND={x:35,z:23,rx:6.2,rz:4.2,waterY:-.15};
export function pondRadius(x,z){const dx=(x-POND.x)/POND.rx,dz=(z-POND.z)/POND.rz,a=Math.atan2(dz,dx);return Math.hypot(dx,dz)/(1+.08*Math.sin(a*3)+.04*Math.cos(a*5));}
export const SCENIC_PLACES=[
  {id:'lookout',title:'Riverside Lookout',x:54,z:-9,w:8,d:5,height:.12,entry:[51.8,-11.6],color:'#668d9b',note:'A quiet view across the river.'},
  {id:'grove',title:'Pine Grove',x:-49,z:41,w:10,d:9,height:.12,entry:[-48,37.4],color:'#71926c',note:'Picnic tables and a sheltered clearing beneath the pines.'},
  {id:'pond',title:'Waterlily Pond',x:35,z:23,w:18,d:15,height:.12,entry:[35,30.5],color:'#4b8e91',note:'A waterside path among lilies, reeds and smooth river stones.'},
  {id:'terrace',title:'Hilltop Terrace',x:17,z:-53,w:9,d:7,height:2.48,entry:[17,-49.4],color:'#ad8960',note:'A lookout at the end of the northern walking trail.'}
];
export function extensionRoadPoints(riverZ){return[
  [[28,8],[42,9],[48,5],[47,riverZ(47)+3.7],[47,riverZ(47)],[47,riverZ(47)-3.7],[51.8,-11.6],[54,-11.6]],
  [[22,-14.45],[32,-18],[43,-17],[51.8,-11.6]],
  [[-44,14],[-51,22],[-54,31],[-48,37.4]],
  [[-22,27.9],[-31,34],[-41,37],[-48,37.4]],
  [[2,-30.5],[0,-39],[5,-47],[12,-50],[17,-49.4]],
  [[17,-49.4],[27,-46],[36,-35],[34,-25],[22,-14.45]],
  [[28,8],[28,14],[26,23],[28,28],[35,30.5],[42,28],[44,23],[42,17],[44,14]],
  [[-33,6.5],[-42,1],[-50,-1.7],[-54,8],[-51,22]]
];}

// Small destinations are landscape furniture, not additional invented biography.
// Geometry is batched by material; the existing CC0 vegetation is instanced outside.
export function buildOutdoorExtension({scene,groundHeight,waterMaterial}){
  const group=new THREE.Group();group.name='village-trail-extension';
  const batches=new Map(),materials=new Map(),blockers=[];
  const C={wood:0xa58258,lightWood:0xc2a375,darkWood:0x70553d,stone:0xb9b79f,lightStone:0xd4cbb1,iron:0x475d56,canvas:0xe6d8b6,teal:0x5c8b86,brass:0xb99a61};
  function add(g,color){if(!batches.has(color))batches.set(color,[]);batches.get(color).push(g);}
  function box(x,y,z,w,h,d,color,rotation=0){const g=new RoundedBoxGeometry(w,h,d,1,Math.min(.035,w/5,h/5,d/5));g.rotateY(rotation);g.translate(x,y,z);add(g,color);}
  function cyl(x,y,z,r,h,color,n=12){const g=new THREE.CylinderGeometry(r,r,h,n);g.translate(x,y,z);add(g,color);}
  function rod(a,b,r,color){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b),g=new THREE.CylinderGeometry(r,r,p.distanceTo(q),8),m=new THREE.Matrix4();m.compose(p.clone().add(q).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize()),new THREE.Vector3(1,1,1));g.applyMatrix4(m);add(g,color);}
  function blocker(x,z,w,d){blockers.push({x,z,w:w/2,d:d/2});}
  function bench(x,z,angle=0){
    const y=groundHeight(x,z),ca=Math.cos(angle),sa=Math.sin(angle),at=(xx,zz)=>[x+xx*ca+zz*sa,z-xx*sa+zz*ca];
    for(const sx of [-.85,.85]){const [xx,zz]=at(sx,0);box(xx,y+.3,zz,.1,.6,.65,C.iron,angle);}
    for(let i=0;i<4;i++){const [xx,zz]=at(0,-.22+i*.15);box(xx,y+.63,zz,2.4,.1,.13,i%2?C.wood:C.lightWood,angle);}
    for(let i=0;i<3;i++){const [xx,zz]=at(0,-.4);box(xx,y+.93+i*.17,zz,2.4,.14,.08,C.wood,angle);}
    for(const sx of [-.87,.87]){const [xx,zz]=at(sx,-.4);box(xx,y+.88,zz,.07,.95,.08,C.iron,angle);}
    blocker(x,z,Math.abs(ca)*2.5+Math.abs(sa),Math.abs(sa)*2.5+Math.abs(ca));
  }
  function table(x,z){
    const y=groundHeight(x,z);
    for(let i=0;i<7;i++)box(x-1.1+i*.36,y+.93,z,.33,.11,1.28,i%2?C.wood:C.lightWood);
    for(const sx of [-.85,.85])for(const side of [-1,1])rod([x+sx,y+.12,z+side*.55],[x+sx,y+.88,z-side*.34],.07,C.darkWood);
    for(const side of [-1,1]){box(x,y+.54,z+side*.99,2.7,.12,.42,C.wood);box(x,y+.26,z+side*.99,2.2,.08,.1,C.darkWood);for(const sx of [-.85,.85])box(x+sx,y+.27,z+side*.99,.1,.5,.12,C.darkWood);}
    blocker(x,z,2.85,2.5);
    // Two cups and an open notebook make it feel like a place to pause.
    cyl(x-.58,y+1.06,z+.14,.095,.16,C.teal);cyl(x+.64,y+1.06,z-.17,.095,.16,C.canvas);box(x,y+1.003,z,.5,.025,.38,C.canvas,.14);box(x,y+1.02,z,.015,.006,.36,C.brass,.14);
  }
  function stoneCircle(x,z,r){
    const y=groundHeight(x,z);
    const g=new THREE.CylinderGeometry(r,r,.08,40);g.translate(x,y+.025,z);add(g,C.lightStone);
    for(let i=0;i<28;i++){const a=i/28*Math.PI*2;box(x+Math.sin(a)*r,y+.05,z+Math.cos(a)*r,.38,.12,.18,i%3?C.stone:C.lightStone,a);}
  }
  function post(x,z,height=1.35){const y=groundHeight(x,z);cyl(x,y+height/2,z,.075,height,C.darkWood);box(x,y+height,z,.18,.09,.18,C.brass);blocker(x,z,.20,.20);return y;}

  // Riverside viewing deck: a broad timber platform, rails on the water edge,
  // slatted bench, tripod viewfinder, and a clear, accessible land-side approach.
  const lx=54,lz=-9,ly=groundHeight(lx,lz);
  for(let i=0;i<22;i++)box(lx-3.8+i*.36,ly+.075,lz,.335,.13,4.5,i%4?C.wood:C.lightWood);
  for(const x of [50.2,52.1,54,55.9,57.8]){const y=post(x,-6.9,1.18);if(x<57.8)rod([x,y+.98,-6.9],[x+1.9,y+.98,-6.9],.045,C.darkWood);}
  blocker(54,-6.9,8,.16);
  bench(55.3,-9.25,0);
  const vx=51.2,vz=-8.3,vy=groundHeight(vx,vz);
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;rod([vx,vy+1.4,vz],[vx+Math.sin(a)*.55,vy+.1,vz+Math.cos(a)*.55],.035,C.iron);}
  box(vx,vy+1.53,vz,.42,.32,.52,C.teal);const lens=new THREE.CylinderGeometry(.14,.14,.18,18);lens.rotateX(Math.PI/2);lens.translate(vx,vy+1.55,vz+.34);add(lens,C.iron);blocker(vx,vz,1.2,1.2);
  // A short edge stair is visual only; the approach joins the ground smoothly.
  for(let i=0;i<3;i++)box(51.7,ly+.022+i*.02,-11.55+i*.16,2.3,.04,.32,C.wood);

  // Pine clearing: a substantial open shelter rather than an isolated tent icon.
  const gx=-49,gz=41,gy=groundHeight(gx,gz);stoneCircle(gx,gz,4.55);
  for(const x of [-3.3,3.3])for(const z of [-2.7,2.7]){box(gx+x,gy+1.63,gz+z,.17,3.25,.17,C.darkWood);blocker(gx+x,gz+z,.3,.3);}
  for(const z of [-2.7,2.7])box(gx,gy+3.2,gz+z,7.1,.17,.21,C.darkWood);
  // Two pitched canvas roof panels leave both sides open to the forest.
  for(const side of [-1,1]){const roof=new THREE.BoxGeometry(7.3,.07,3.13);roof.rotateX(side*.25);roof.translate(gx,gy+3.55,gz+side*1.47);add(roof,C.canvas);}
  for(let i=0;i<6;i++){const z=gz-2.5+i;rod([gx-3.3,gy+3.21,z],[gx+3.3,gy+3.21,z],.028,C.teal);}
  table(gx,gz+.2);bench(gx+5.1,gz+.4,Math.PI/2);bench(gx-5.1,gz+.4,-Math.PI/2);

  // Northern terrace: stone belvedere, paired seats, climbing-frame pergola,
  // and a brass panorama rail; the trail completes a loop back to the studio.
  const tx=17,tz=-53,ty=groundHeight(tx,tz);stoneCircle(tx,tz,4.1);
  for(const side of [-1,1]){bench(tx+side*2.4,tz,side*Math.PI/2);for(const z of [-2,2]){box(tx+side*3.3,ty+1.55,tz+z,.16,3.1,.16,C.stone);blocker(tx+side*3.3,tz+z,.3,.3);}}
  for(let x=-3.6;x<=3.6;x+=.6)box(tx+x,ty+3.18,tz,.11,.14,5.15,C.darkWood);
  for(const side of [-1,1])box(tx+side*3.3,ty+3.04,tz,.20,.20,5.2,C.wood);
  for(let i=0;i<7;i++){const x=tx-3+i;post(x,tz-3.6,.95);if(i<6)rod([x,ty+.86,tz-3.6],[x+1,ty+.86,tz-3.6],.028,C.brass);}
  blocker(tx,tz-3.6,6.3,.16);
  box(tx,ty+.96,tz-2.8,1.65,.08,.46,C.teal);for(const side of [-1,1])rod([tx+side*.56,ty,tz-2.8],[tx+side*.56,ty+.96,tz-2.8],.055,C.iron);blocker(tx,tz-2.8,1.8,.65);

  // A shaped, excavated pond belongs to the landscape: the same analytic edge
  // controls terrain height, water outline and navigation clearance.
  const outline=new THREE.Shape();
  for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,r=1+.08*Math.sin(a*3)+.04*Math.cos(a*5),x=Math.cos(a)*POND.rx*r,z=Math.sin(a)*POND.rz*r;if(i===0)outline.moveTo(x,-z);else outline.lineTo(x,-z);}
  const pondGeo=new THREE.ShapeGeometry(outline,96);pondGeo.rotateX(-Math.PI/2);pondGeo.translate(POND.x,POND.waterY,POND.z);
  const pondWater=new THREE.Mesh(pondGeo,waterMaterial||new THREE.MeshPhysicalMaterial({color:0x468e96,roughness:.2,metalness:.10,clearcoat:.7}));pondWater.receiveShadow=true;group.add(pondWater);
  // Irregular low stones sit at the waterline; reeds leave the southern view open.
  for(let i=0;i<36;i++){const a=i/36*Math.PI*2,r=(1+.08*Math.sin(a*3)+.04*Math.cos(a*5))*1.09,x=POND.x+Math.cos(a)*POND.rx*r,z=POND.z+Math.sin(a)*POND.rz*r,y=groundHeight(x,z);const g=new THREE.IcosahedronGeometry(.31+(i%3)*.065,1);g.scale(1.28,.62,.9);g.rotateY(a);g.translate(x,y+.08,z);add(g,i%3?0x989f85:0xb6b79c);}
  for(const [dx,dz]of [[-5,-1.7],[-3.6,-3.5],[.5,-4.4],[4.6,-2.8],[6.1,.9],[-6.1,1.2]]){
    const x=POND.x+dx,z=POND.z+dz,y=groundHeight(x,z);
    for(let i=0;i<7;i++){const a=i*2.4,h=.55+(i%3)*.19,bx=x+Math.cos(a)*.24,bz=z+Math.sin(a)*.24;rod([bx,y-.06,bz],[bx+Math.cos(a)*.13,y+h,bz+Math.sin(a)*.12],.019,i%2?0x648653:0x82945a);if(i%2===0)cyl(bx+Math.cos(a)*.13,y+h+.08,bz+Math.sin(a)*.12,.045,.20,0x8c704a,7);}
  }
  for(const [dx,dz,r]of [[-2.8,.4,.5],[-2.1,.8,.34],[-3.1,1.2,.29],[2.6,-.8,.43],[3.2,-.3,.31],[.6,1.6,.38]]){
    const leaf=new THREE.CircleGeometry(r,24,.13,Math.PI*2-.28);leaf.rotateX(-Math.PI/2);leaf.rotateY(dx);leaf.translate(POND.x+dx,POND.waterY+.065,POND.z+dz);add(leaf,dx<0?0x6c995e:0x89aa62);
    if(r>.4){for(let i=0;i<7;i++){const a=i*Math.PI*2/7,g=new THREE.SphereGeometry(.10,8,6);g.scale(.6,.6,1.7);g.rotateY(a);g.translate(POND.x+dx+Math.sin(a)*.09,POND.waterY+.12,POND.z+dz+Math.cos(a)*.09);add(g,0xe4b5b1);}cyl(POND.x+dx,POND.waterY+.15,POND.z+dz,.065,.045,0xd8b65d,10);}
  }
  bench(35,32.3,Math.PI);bench(43.6,25.8,-Math.PI/2);

  const trees={CommonTree_2:[],CommonTree_4:[],Pine_3:[]},plants={Fern_1:[],Flower_3_Group:[],Rock_Medium_2:[],Grass_Common_Short:[]};
  let seed=4387;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  function tree(type,x,z,s=.7){trees[type].push({x,z,y:0,r:rand()*6.28,s});}
  for(const [x,z]of [[-56,39],[-54,45],[-49,48],[-44,46],[-42,41],[-44,33],[-58,29],[-57,22],[-47,25],[-38,34]])tree('Pine_3',x,z,.65+rand()*.22);
  for(const [x,z]of [[48,-16],[57,-15],[61,-11],[58,2],[54,8],[43,3],[40,-14],[46,-23]])tree('CommonTree_4',x,z,.62+rand()*.18);
  for(const [x,z]of [[10,-54],[12,-59],[21,-59],[25,-54],[29,-50],[1,-46],[-5,-38],[38,-40],[39,-31]])tree('Pine_3',x,z,.58+rand()*.22);
  for(const [x,z]of [[23,24],[28,33],[40,34],[47,27],[42,12],[-56,12],[-57,4],[-45,-2],[-36,35],[41,17],[53,17]])tree('CommonTree_2',x,z,.65+rand()*.2);
  // Grouped drifts at trail edges, kept away from the path itself by the caller.
  for(const [cx,cz]of [[-53,36],[-43,38],[-51,46],[49,-13],[58,-12],[45,-17],[11,-50],[24,-51],[32,-43],[-53,18],[28,20],[41,21],[32,28],[40,29]])for(let i=0;i<14;i++){
    const x=cx+(rand()-.5)*3,z=cz+(rand()-.5)*2,key=i%7===0?'Rock_Medium_2':i%3===0?'Fern_1':i%2?'Flower_3_Group':'Grass_Common_Short';
    plants[key].push({x,z,y:0,r:rand()*6.28,s:key==='Rock_Medium_2'?.24+rand()*.23:.30+rand()*.2});
  }
  for(const [color,parts]of batches){const normalized=parts.map(g=>g.index?g.toNonIndexed():g),g=mergeGeometries(normalized,false),m=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color,roughness:.83}));m.castShadow=m.receiveShadow=true;group.add(m);for(const item of new Set([...parts,...normalized]))item.dispose();}
  scene.add(group);return{group,blockers,trees,plants};
}
