/* An original little rangefinder companion. Feet at y=0, front along +Z,
 * approximately 0.8 units tall. Static parts are merged into material batches. */
import * as THREE from './lib/three.module.js';
import { RoundedBoxGeometry } from './lib/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from './lib/addons/utils/BufferGeometryUtils.js';

export function createCameraCompanion() {
  const group=new THREE.Group();group.name='camera-companion';
  const C={ivory:0xf1dfba,top:0xf6edd6,leather:0x83654f,ink:0x263f46,metal:0x9caeaa,brass:0xb69d69,glass:0x477e94,red:0xbc6554,white:0xfff8e6};
  const mats={
    ivory:new THREE.MeshStandardMaterial({color:C.ivory,roughness:.63}),
    top:new THREE.MeshStandardMaterial({color:C.top,roughness:.42}),
    leather:new THREE.MeshStandardMaterial({color:C.leather,roughness:.92}),
    ink:new THREE.MeshStandardMaterial({color:C.ink,roughness:.54}),
    metal:new THREE.MeshStandardMaterial({color:C.metal,metalness:.65,roughness:.38}),
    brass:new THREE.MeshStandardMaterial({color:C.brass,metalness:.50,roughness:.42}),
    glass:new THREE.MeshPhysicalMaterial({color:C.glass,metalness:.18,roughness:.15,clearcoat:1,clearcoatRoughness:.08}),
    red:new THREE.MeshStandardMaterial({color:C.red,roughness:.45}),
    eye:new THREE.MeshPhysicalMaterial({color:0x21363e,roughness:.1,clearcoat:1}),
    white:new THREE.MeshBasicMaterial({color:C.white,toneMapped:false})
  };
  const buckets=new Map();
  function add(g,key){if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(g);}
  function box(x,y,z,w,h,d,key,r=.025){const g=new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.25,h*.25,d*.25));g.translate(x,y,z);add(g,key);}
  function cyl(x,y,z,r,h,key,front=false,n=28){const g=new THREE.CylinderGeometry(r,r,h,n);if(front)g.rotateX(Math.PI/2);g.translate(x,y,z);add(g,key);}
  function ring(x,y,z,r,t,key,rotationY=0){const g=new THREE.TorusGeometry(r,t,8,40);g.rotateY(rotationY);g.translate(x,y,z);add(g,key);}
  function sphere(x,y,z,r,key,sx=1,sy=1,sz=1){const g=new THREE.SphereGeometry(r,16,10);g.scale(sx,sy,sz);g.translate(x,y,z);add(g,key);}
  function tube(points,r,key){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));add(new THREE.TubeGeometry(curve,Math.max(8,points.length*4),r,6,false),key);}

  // Rounded shell, separate top/bottom castings, and a softly embossed grip.
  box(0,.437,0,.89,.47,.355,'ivory',.065);
  box(0,.674,-.004,.91,.118,.37,'top',.033);
  box(0,.223,-.002,.85,.068,.34,'metal',.018);
  box(.335,.432,.152,.16,.32,.08,'leather',.035);
  box(-.347,.413,.169,.11,.25,.038,'leather',.024);
  for(let i=0;i<5;i++)box(.336,.316+i*.053,.195,.111,.004,.003,'brass',.001);
  box(0,.430,-.181,.68,.31,.018,'leather',.025);
  box(0,.577,-.195,.37,.024,.013,'brass',.005);

  // Lens mount, machined barrel, focus ring and deeply nested glass.
  cyl(-.015,.43,.203,.242,.055,'metal',true);
  cyl(-.015,.43,.266,.223,.110,'ink',true);
  ring(-.015,.43,.288,.220,.012,'brass');
  cyl(-.015,.43,.333,.206,.055,'ink',true);
  ring(-.015,.43,.363,.197,.012,'metal');
  cyl(-.015,.43,.365,.174,.016,'glass',true);
  ring(-.015,.43,.379,.153,.009,'ink');
  cyl(-.015,.43,.381,.139,.007,'glass',true);
  // Twenty-four short flutes are a focus ring, not a noise texture.
  for(let i=0;i<24;i++){const a=i/24*Math.PI*2,x=-.015+Math.sin(a)*.218,y=.43+Math.cos(a)*.218;const g=new THREE.BoxGeometry(.012,.015,.064);g.rotateZ(-a);g.translate(x,y,.265);add(g,'metal');}
  // Gentle, explicitly authored reflections remain visible without an HDRI.
  const highlight=new THREE.CircleGeometry(.053,24);highlight.scale(1,.35,1);highlight.rotateZ(-.55);highlight.translate(-.068,.492,.389);add(highlight,'white');
  const glint=new THREE.CircleGeometry(.014,16);glint.translate(.045,.369,.39);add(glint,'white');

  // Eyes live on the top plate so the lens still reads as a camera lens.
  for(const x of [-.281,.281]){sphere(x,.636,.198,.039,'eye',.85,1.10,.48);sphere(x-.008,.649,.217,.010,'white',1,1,.45);}
  tube([[-.079,.230,.184],[-.043,.208,.19],[0,.204,.19],[.043,.212,.19],[.062,.230,.184]],.007,'ink');
  // A little viewfinder and a hot shoe; controls have contrasting real layers.
  box(-.28,.693,.029,.17,.065,.13,'ink',.016);box(-.28,.694,.101,.112,.031,.012,'glass',.005);
  box(0,.747,-.026,.19,.025,.15,'metal',.008);for(const x of [-.073,.073])box(x,.765,-.026,.021,.026,.15,'brass',.004);
  cyl(.285,.748,-.026,.072,.040,'metal');cyl(.285,.777,-.026,.049,.023,'red');
  cyl(-.294,.754,-.085,.066,.040,'ink');cyl(-.294,.779,-.085,.054,.012,'metal');
  for(let i=0;i<8;i++){const a=i/8*Math.PI*2;box(-.294+Math.cos(a)*.059,.755,-.085+Math.sin(a)*.059,.009,.025,.009,'brass',.002);}
  // Strap anchors and short leather loops: compact enough not to catch on doors.
  for(const side of [-1,1]){box(side*.454,.58,-.036,.043,.082,.071,'metal',.012);ring(side*.481,.565,-.036,.045,.009,'brass',Math.PI/2);tube([[side*.484,.548,-.036],[side*.526,.45,-.036],[side*.523,.34,.01],[side*.486,.35,.045]],.012,'leather');}
  // Small feet with broad, stable soles; the two buddies share the same scale.
  for(const x of [-.235,.235]){box(x,.144,.025,.115,.14,.13,'ivory',.025);box(x,.06,.075,.19,.11,.25,'top',.034);box(x,.015,.073,.193,.028,.25,'ink',.01);}

  for(const[key,parts]of buckets){const normalized=parts.map(g=>g.index?g.toNonIndexed():g);const geometry=mergeGeometries(normalized,false);const m=new THREE.Mesh(geometry,mats[key]);m.name=`camera-${key}`;m.castShadow=m.receiveShadow=true;group.add(m);for(const g of new Set([...parts,...normalized]))g.dispose();}
  group.userData.companion='camera';group.userData.height=.789;group.userData.front='+Z';
  return group;
}
