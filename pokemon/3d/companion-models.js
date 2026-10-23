/* Original pocket-sized companions. Front +Z; feet on y=0.
 * Every factory owns fresh geometry/material resources, including its batches,
 * so an isolated portrait can be disposed without affecting the village. */
import * as THREE from './lib/three.module.js';
import { RoundedBoxGeometry } from './lib/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from './lib/addons/utils/BufferGeometryUtils.js';

function workshop(name, materials) {
  const group = new THREE.Group();
  group.name = `${name}-companion`;
  const buckets = new Map();
  const add = (geometry, key) => {
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(geometry);
    return geometry;
  };
  const box = (x,y,z,w,h,d,key,r=.02,rotation=0) => {
    const g = new RoundedBoxGeometry(w,h,d,2,Math.min(r,w*.25,h*.25,d*.25));
    if (rotation) g.rotateX(rotation);
    g.translate(x,y,z);
    return add(g,key);
  };
  const sphere = (x,y,z,r,key,sx=1,sy=1,sz=1) => {
    const g = new THREE.SphereGeometry(r,18,12);
    g.scale(sx,sy,sz);g.translate(x,y,z);return add(g,key);
  };
  const cylinder = (x,y,z,r,h,key,axis='y',segments=28) => {
    const g = new THREE.CylinderGeometry(r,r,h,segments);
    if (axis==='z') g.rotateX(Math.PI/2);
    if (axis==='x') g.rotateZ(Math.PI/2);
    g.translate(x,y,z);return add(g,key);
  };
  const ring = (x,y,z,r,t,key,axis='z') => {
    const g = new THREE.TorusGeometry(r,t,8,36);
    if(axis==='x')g.rotateY(Math.PI/2);
    if(axis==='y')g.rotateX(Math.PI/2);
    g.translate(x,y,z);return add(g,key);
  };
  const tube = (points,r,key,closed=false) => {
    const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),closed);
    return add(new THREE.TubeGeometry(curve,Math.max(8,points.length*5),r,7,closed),key);
  };
  const rod = (a,b,r,key) => {
    const start=new THREE.Vector3(...a), end=new THREE.Vector3(...b), direction=end.clone().sub(start);
    const g = new THREE.CylinderGeometry(r,r,direction.length(),8);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()));
    g.translate(...start.add(end).multiplyScalar(.5).toArray());return add(g,key);
  };
  function finish() {
    for(const [key,parts] of buckets){
      const normalized=parts.map(g=>g.index?g.toNonIndexed():g);
      const geometry=mergeGeometries(normalized,false);
      geometry.computeBoundingSphere();
      const mesh=new THREE.Mesh(geometry,materials[key]);
      mesh.name=`${name}-${key}`;
      mesh.castShadow=mesh.receiveShadow=!materials[key].transparent;
      group.add(mesh);
      for(const g of new Set([...parts,...normalized]))g.dispose();
    }
    // Normalise tiny floating-point bottoms, not the relative model proportions.
    const bounds=new THREE.Box3().setFromObject(group);
    for(const mesh of group.children)mesh.geometry.translate(0,-bounds.min.y,0);
    group.userData.companion=name;
    group.userData.front='+Z';
    group.userData.height=bounds.max.y-bounds.min.y;
    return group;
  }
  return {group,add,box,sphere,cylinder,ring,tube,rod,finish};
}
const painted = (color,roughness=.5) => new THREE.MeshStandardMaterial({color,roughness});
const metal = (color,roughness=.36) => new THREE.MeshStandardMaterial({color,roughness,metalness:.62});
const enamel = color => new THREE.MeshPhysicalMaterial({color,roughness:.28,clearcoat:.85,clearcoatRoughness:.13});
const luminous = color => new THREE.MeshBasicMaterial({color,toneMapped:false});

/** A compact beige computer with a real keyboard, CRT recess and vented case. */
export function createMacCompanion() {
  const mats={
    shell:painted(0xe1d3af,.63),face:painted(0xf2e5c7,.49),key:painted(0xfaf1d9,.39),
    shadow:painted(0x746d57,.7),ink:painted(0x263f40,.53),
    screen:new THREE.MeshPhysicalMaterial({color:0x245c59,emissive:0x16342c,emissiveIntensity:.16,roughness:.18,clearcoat:1}),
    mint:luminous(0xb8e9bb),shine:luminous(0xf7f9d7),brass:metal(0xb49e70),orange:painted(0xd68a59)
  };
  const {add,box,sphere,cylinder,tube,finish}=workshop('mac',mats);

  // Slightly tapered rear shell and a separate moulded front casting.
  const body=new RoundedBoxGeometry(.565,.565,.387,3,.052);
  const pos=body.attributes.position;
  for(let i=0;i<pos.count;i++){
    const rear=THREE.MathUtils.clamp((-pos.getZ(i)+.1935)/.387,0,1);
    pos.setX(i,pos.getX(i)*(1-.115*rear));
    pos.setY(i,pos.getY(i)-.018*rear);
  }
  body.computeVertexNormals();body.translate(0,.483,-.037);add(body,'shell');
  box(0,.48,.153,.568,.558,.052,'face',.037);
  box(0,.207,.018,.51,.052,.33,'shadow',.012);
  box(0,.233,.142,.522,.037,.07,'shell',.01);

  // Deep CRT bezel: the screen is inset behind a dark rubber gasket.
  box(0,.549,.184,.466,.359,.026,'shell',.035);
  box(0,.55,.200,.412,.301,.018,'shadow',.033);
  box(0,.551,.211,.384,.271,.014,'ink',.026);
  box(0,.551,.220,.366,.251,.012,'screen',.027);
  // Two quiet phosphor eyes and a smile; glass reflection is deliberately subtle.
  for(const x of [-.084,.084]){
    box(x,.572,.230,.043,.055,.006,'mint',.012);
    box(x-.010,.588,.234,.012,.015,.003,'shine',.003);
  }
  tube([[-.055,.511,.232],[-.030,.490,.233],[0,.485,.233],[.030,.490,.233],[.055,.511,.232]],.006,'mint');
  tube([[-.155,.632,.232],[-.155,.648,.232],[-.143,.658,.232],[-.108,.658,.232]],.0035,'shine');

  // Floppy drive, eject button, subtle badge, and an etched speaker grille.
  box(.104,.317,.187,.208,.028,.014,'shadow',.006);
  box(.102,.320,.198,.174,.008,.004,'ink',.002);
  box(.189,.282,.196,.024,.014,.008,'shell',.003);
  box(-.190,.286,.193,.027,.030,.009,'orange',.004);
  box(-.148,.287,.193,.041,.006,.005,'brass',.001);
  for(let i=0;i<6;i++)box(-.146+i*.019,.338,.191,.007,.055,.005,'shadow',.002);
  // Air slots are organised hardware details rather than a surface noise texture.
  for(const side of [-1,1])for(let i=0;i<7;i++)box(side*.260,.413+i*.027,-.086,.005,.009,.145,'shadow',.002);
  box(0,.751,-.047,.19,.012,.101,'shadow',.016);
  box(0,.754,-.047,.142,.013,.064,'ink',.011);
  box(0,.479,-.231,.352,.348,.018,'shell',.018);
  for(let i=0;i<8;i++)box(0,.479+i*.023,-.242,.225,.006,.005,'shadow',.002);
  box(-.085,.338,-.244,.104,.038,.009,'ink',.005);
  box(.083,.338,-.244,.082,.035,.009,'shadow',.004);
  for(const x of [-.159,.159])cylinder(x,.347,-.246,.010,.005,'brass','z',12);

  // Keyboard is an actual small array, held on a shallow sloping tray.
  box(0,.133,.300,.584,.082,.260,'shell',.022,.13);
  box(0,.177,.300,.548,.020,.232,'shadow',.011,.13);
  for(let row=0;row<3;row++){
    const z=.232+row*.052,y=.198-row*.0065;
    for(let col=0;col<9;col++)box(-.224+col*.056,y,z,.044,.027,.040,'key',.006,.13);
  }
  box(-.023,.177,.394,.259,.025,.036,'key',.006,.13);
  for(const x of [-.223,-.167,.167,.223])box(x,.177,.394,.043,.025,.036,'key',.006,.13);
  // One short coiled-looking lead keeps the keyboard attached to its computer.
  tube([[.268,.16,.306],[.318,.175,.258],[.321,.210,.15],[.294,.239,.092],[.272,.266,.077]],.012,'shadow');
  for(const x of [-.177,.177]){
    box(x,.084,.008,.107,.145,.13,'face',.025);
    box(x,.033,.062,.17,.066,.228,'shell',.027);
    box(x,.013,.060,.17,.025,.229,'ink',.010);
  }
  return finish();
}

/** A little optical bench: a faceted glass prism held in a brass instrument cradle. */
export function createPrismCompanion() {
  const mats={
    cream:painted(0xece1c5,.52),ivory:painted(0xf7eed8,.41),ink:painted(0x2e494c,.5),
    teal:enamel(0x3e8386),brass:metal(0xbc9b59,.30),darkbrass:metal(0x837958,.46),
    glass:new THREE.MeshPhysicalMaterial({color:0xa9e2dd,roughness:.12,metalness:.12,clearcoat:1,transparent:true,opacity:.57,depthWrite:false,side:THREE.DoubleSide}),
    violet:new THREE.MeshPhysicalMaterial({color:0x9caddd,roughness:.14,metalness:.12,clearcoat:1,transparent:true,opacity:.37,depthWrite:false,side:THREE.DoubleSide}),
    white:luminous(0xf9f2d8),coral:enamel(0xdd8c7d),gold:enamel(0xe1be69),blue:enamel(0x7cabca),
    eye:new THREE.MeshPhysicalMaterial({color:0x1d3439,roughness:.12,clearcoat:1})
  };
  const {add,box,sphere,cylinder,ring,tube,rod,finish}=workshop('prism',mats);
  // A rounded instrument housing with a double brass lip and three adjustment feet.
  box(0,.230,0,.612,.194,.354,'cream',.045);
  box(0,.150,0,.574,.048,.326,'teal',.016);
  box(0,.329,0,.566,.031,.328,'brass',.010);
  box(0,.355,0,.520,.029,.288,'ivory',.009);
  box(0,.378,-.012,.450,.018,.253,'darkbrass',.005);
  for(const x of [-.205,.205]){
    box(x,.086,.014,.10,.12,.12,'brass',.016);
    box(x,.029,.038,.157,.058,.194,'ivory',.024);
    box(x,.012,.037,.16,.023,.198,'ink',.009);
  }
  // Cute expression belongs to the instrument base; the glass remains optical.
  for(const x of [-.123,.123]){
    sphere(x,.247,.181,.032,'eye',.78,1.02,.43);
    sphere(x-.007,.256,.194,.009,'white',1,1,.42);
  }
  tube([[-.039,.218,.183],[-.022,.205,.187],[0,.201,.188],[.022,.205,.187],[.039,.218,.183]],.005,'ink');
  for(const x of [-.246,.246])cylinder(x,.234,.180,.012,.007,'brass','z',12);

  // Triangular glass prism with true flat faces, bevelled edges and no texture dependency.
  const shape=new THREE.Shape();shape.moveTo(-.235,.410);shape.lineTo(.235,.410);shape.lineTo(0,.811);shape.closePath();
  const prism=new THREE.ExtrudeGeometry(shape,{depth:.216,bevelEnabled:true,bevelThickness:.006,bevelSize:.005,bevelSegments:1,steps:1});
  prism.translate(0,0,-.108);add(prism,'glass');
  // One cool rear facet and a narrow white reflected edge give depth without a heavy HDRI.
  const facet=new THREE.BufferGeometry();facet.setAttribute('position',new THREE.Float32BufferAttribute([
    -.235,.410,-.112, .235,.410,-.112, 0,.811,-.112
  ],3));facet.computeVertexNormals();facet.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,.5,1],2));add(facet,'violet');
  rod([-.216,.421,.117],[-.005,.787,.117],.0032,'white');
  rod([.216,.421,.116],[.015,.768,.116],.002,'blue');
  // The cradle only supports the lower corners: the prism's silhouette stays clear.
  for(const side of [-1,1]){
    box(side*.246,.414,0,.046,.073,.260,'brass',.009);
    box(side*.279,.391,0,.040,.050,.206,'ivory',.011);
    cylinder(side*.304,.416,0,.048,.034,'brass','x');
    cylinder(side*.325,.416,0,.037,.013,'teal','x');
    for(let i=0;i<10;i++){
      const a=i/10*Math.PI*2;
      box(side*.319,.416+Math.cos(a)*.042,Math.sin(a)*.042,.015,.009,.009,'darkbrass',.002);
    }
  }
  // Three restrained optical colour marks run across a small calibration plate.
  box(0,.330,.175,.172,.018,.021,'darkbrass',.004);
  for(const [x,key] of [[-.044,'coral'],[0,'gold'],[.044,'blue']])box(x,.331,.188,.030,.009,.008,key,.002);
  // A beam enters from the left and becomes a tiny fan, like a desk-top optics demo.
  rod([-.376,.562,-.014],[-.138,.562,-.014],.007,'white');
  const rays=[{key:'coral',end:[.410,.619,-.014]},{key:'gold',end:[.425,.560,-.014]},{key:'blue',end:[.408,.501,-.014]}];
  for(const ray of rays)rod([.145,.560,-.014],ray.end,.006,ray.key);
  // A subtle back dial makes the object rewarding to walk around.
  cylinder(0,.242,-.183,.061,.024,'darkbrass','z');
  cylinder(0,.242,-.201,.047,.019,'teal','z');
  ring(0,.242,-.214,.036,.0035,'brass');
  return finish();
}

/** Portable cassette player wearing cushioned headphones, with spools and transport keys. */
export function createMusicCompanion() {
  const mats={
    teal:enamel(0x397f7b),cream:painted(0xefe4c7,.51),ivory:painted(0xfff2d4,.39),
    ink:painted(0x263b40,.72),copper:metal(0xb7835c,.39),metal:metal(0xa6b4a6,.34),
    glass:new THREE.MeshPhysicalMaterial({color:0x557f7e,roughness:.13,clearcoat:1,metalness:.1}),
    eye:new THREE.MeshPhysicalMaterial({color:0x183337,roughness:.10,clearcoat:1}),
    red:painted(0xc16552,.42),white:luminous(0xfff6dd)
  };
  const {add,box,sphere,cylinder,ring,tube,rod,finish}=workshop('music',mats);
  // Enamel enclosure with separate alloy edge castings and a little rear belt clip.
  box(0,.351,0,.482,.455,.274,'teal',.053);
  box(0,.354,.134,.452,.409,.029,'copper',.034);
  box(0,.354,.151,.425,.381,.021,'cream',.029);
  box(0,.349,-.145,.328,.334,.018,'ink',.028);
  box(0,.372,-.169,.154,.247,.043,'copper',.020);
  box(0,.356,-.192,.117,.192,.016,'teal',.012);
  // Cassette window, two layered reels, a tape bridge and genuine tiny reel spokes.
  box(0,.400,.168,.349,.209,.018,'ink',.022);
  box(0,.400,.180,.324,.184,.010,'glass',.020);
  box(0,.450,.189,.273,.025,.008,'ivory',.004);
  for(const x of [-.089,.089]){
    cylinder(x,.394,.194,.067,.012,'copper','z');
    cylinder(x,.394,.204,.051,.010,'ivory','z');
    cylinder(x,.394,.212,.027,.010,'eye','z');
    for(let i=0;i<6;i++){
      const a=i/6*Math.PI*2;const g=new THREE.BoxGeometry(.009,.017,.004);
      g.rotateZ(-a);g.translate(x+Math.sin(a)*.038,.394+Math.cos(a)*.038,.212);add(g,'ink');
    }
    sphere(x-.009,.406,.220,.009,'white',1,1,.4);
  }
  box(0,.336,.193,.224,.007,.005,'ink',.002);
  for(const x of [-.112,.112])cylinder(x,.338,.198,.013,.006,'copper','z',14);
  // A cheerful face combines the reel pupils with a smile on the lower speaker panel.
  tube([[-.050,.284,.171],[-.029,.266,.175],[0,.260,.176],[.029,.266,.175],[.050,.284,.171]],.0055,'ink');
  for(const side of [-1,1])for(let row=0;row<4;row++)for(let col=0;col<3;col++){
    cylinder(side*(.113+col*.024),.239+row*.020,.168,.0052,.004,'ink','z',8);
  }
  box(0,.206,.170,.055,.013,.006,'copper',.003);
  // A crisp row of transport controls with tiny symbols, not illegible labels.
  for(const [x,width,key] of [[-.159,.054,'cream'],[-.091,.054,'cream'],[-.018,.066,'ivory'],[.060,.054,'cream'],[.134,.061,'cream']]){
    box(x,.580,.008,width,.045,.134,'copper',.008);
    box(x,.607,.013,width-.007,.020,.115,key,.007);
  }
  cylinder(.134,.621,.011,.013,.006,'red','y',16);
  box(-.091,.621,.010,.017,.004,.022,'ink',.001);
  for(const x of [.055,.067])box(x,.621,.010,.004,.004,.023,'ink',.001);
  const play=new THREE.BufferGeometry();play.setAttribute('position',new THREE.Float32BufferAttribute([-.032,.621,-.007,-.032,.621,.025,-.006,.621,.009],3));
  play.computeVertexNormals();play.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,.5,0,1],2));add(play,'ink');

  // Headphone bow is an authored flattened band, padded underneath, with articulated cups.
  const arch=[[-.294,.449,-.006],[-.304,.603,-.017],[-.247,.748,-.017],[-.128,.810,-.017],[0,.824,-.017],[.128,.810,-.017],[.247,.748,-.017],[.304,.603,-.017],[.294,.449,-.006]];
  const bandCurve=new THREE.CatmullRomCurve3(arch.map(p=>new THREE.Vector3(...p)));
  const band=new THREE.TubeGeometry(bandCurve,50,.030,8,false);band.scale(1,.72,1.7);band.translate(0,.224,0);add(band,'teal');
  const inner=arch.slice(1,-1).map(([x,y,z])=>[x,y-.022,z]);tube(inner,.020,'ink');
  for(const side of [-1,1]){
    // Flattened oval soft ear pads, shells and copper attachment pivots.
    sphere(side*.279,.474,0,.107,'ink',.36,1.18,.83);
    sphere(side*.313,.476,-.004,.103,'copper',.24,1.15,.83);
    sphere(side*.332,.477,-.004,.087,'teal',.26,1.12,.82);
    cylinder(side*.343,.493,-.004,.027,.010,'copper','x',20);
    box(side*.289,.602,-.012,.032,.122,.049,'copper',.010);
    box(side*.290,.625,-.012,.018,.080,.030,'cream',.005);
  }
  // Cable hugs the body, finishing at a proper plug instead of floating in space.
  tube([[-.279,.391,-.008],[-.295,.310,.012],[-.295,.216,.040],[-.249,.183,.075],[-.224,.221,.092]],.009,'ink');
  box(-.231,.238,.087,.028,.066,.029,'copper',.006);
  for(const x of [-.143,.143]){
    box(x,.104,.009,.096,.108,.104,'cream',.019);
    box(x,.036,.052,.147,.072,.204,'ivory',.025);
    box(x,.012,.054,.15,.023,.207,'ink',.009);
  }
  return finish();
}
