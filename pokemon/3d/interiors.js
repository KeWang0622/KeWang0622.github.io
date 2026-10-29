import * as THREE from './lib/three.module.js';
import { RoundedBoxGeometry } from './lib/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from './lib/addons/utils/BufferGeometryUtils.js';

/* Walkable, roofless rooms. All coordinates are room-local; collision dimensions
 * are half-extents, matching the village navigation system. The parent owns
 * actors, input, exhibit dialogs, and scene transitions. */
const THEMES = {
  mrfoundry: {name:'MRFoundry Workshop', accent:0x397f82, wall:0xeadfcb, floor:0xa87e53, rug:0x568889, subtitle:'QUESTION → KNOWLEDGE → TOOLS → EVIDENCE'},
  adobe: {name:'Adobe Research', accent:0xb55247, wall:0xeee5d7, floor:0xbda17c, rug:0x66858c, subtitle:'REINFORCEMENT LEARNING · MULTIMODAL AI'},
  pika: {name:'Pika Studio', accent:0x9c6680, wall:0xeee0d8, floor:0xaa8264, rug:0xa7748a, subtitle:'IDEAS INTO EXPERIENCES'},
  berkeley: {name:'Berkeley Reading Room', accent:0x355879, wall:0xe9deca, floor:0x96704f, rug:0x405e77, subtitle:'CURIOSITY · EVIDENCE · DISCOVERY'},
  tsinghua: {name:'Tsinghua Garden Studio', accent:0x667951, wall:0xe8dfc9, floor:0xc0b89c, rug:0x7e8c65, subtitle:'MEDICINE × ENGINEERING × IMAGING'},
  imaging: {name:'Imaging Observatory', accent:0x517b91, wall:0xe5e2d5, floor:0xa78660, rug:0x536f87, subtitle:'FROM SIGNALS TO IMAGES'},
  internships: {name:'Summer 2027 Base Camp', accent:0x607854, wall:0xe5c999, floor:0xa0835c, rug:0x977357, subtitle:'RESEARCH IS AN ADVENTURE WE SHARE'}
};
const INK=0x293f42, WOOD=0x765540, BRASS=0xba955b, CREAM=0xf6efd9;

export async function createInterior({place,exhibits=[]}={}) {
  if(!place?.id || !THEMES[place.id]) throw new Error('Unknown interior place.');
  const theme=THEMES[place.id], group=new THREE.Group();group.name=`interior-${place.id}`;
  const materials=new Map(),geometries=new Map(),textures=new Set(),blockers=[],targets=[],animations=[];
  const textureLoader=new THREE.TextureLoader();
  function mat(color,extra={}){const key=String(color)+JSON.stringify(extra);if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness:color===BRASS?.38:.78,metalness:color===BRASS?.42:0,...extra}));return materials.get(key);}
  function mesh(geometry,material,parent=group,x=0,y=0,z=0){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function box(x,y,z,w,h,d,color,parent=group,extra={}){const radius=Math.min(w,h,d)*.1,key=`b:${w},${h},${d}`;if(!geometries.has(key))geometries.set(key,new RoundedBoxGeometry(w,h,d,1,radius));return mesh(geometries.get(key),mat(color,extra),parent,x,y,z);}
  function cylinder(x,y,z,rt,rb,h,color,parent=group,n=20){const key=`c:${rt},${rb},${h},${n}`;if(!geometries.has(key))geometries.set(key,new THREE.CylinderGeometry(rt,rb,h,n));return mesh(geometries.get(key),mat(color),parent,x,y,z);}
  function sphere(x,y,z,r,color,parent=group,sx=1,sy=1,sz=1){const key=`s:${r}`;if(!geometries.has(key))geometries.set(key,new THREE.SphereGeometry(r,16,10));const m=mesh(geometries.get(key),mat(color),parent,x,y,z);m.scale.set(sx,sy,sz);return m;}
  function line(a,b,r,color,parent=group){const p=new THREE.Vector3(...a),q=new THREE.Vector3(...b);const m=cylinder(0,0,0,r,r,p.distanceTo(q),color,parent,8);m.position.copy(p).add(q).multiplyScalar(.5);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),q.sub(p).normalize());return m;}
  function block(x,z,w,d){blockers.push({x,z,w:w/2,d:d/2});}
  function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.add(t);return t;}
  function textBoard(text,w,h,{color='#294145',background='#f6efd9',font=64,align='center'}={}){return canvasTexture(1024,Math.max(128,Math.round(1024*h/w)),(ctx,cw,ch)=>{ctx.fillStyle=background;ctx.fillRect(0,0,cw,ch);ctx.fillStyle=color;ctx.font=`600 ${font}px ui-sans-serif, system-ui, sans-serif`;ctx.textBaseline='middle';ctx.textAlign=align;ctx.fillText(text,align==='center'?cw/2:48,ch/2,cw-80);});}
  async function exhibitTexture(url){
    const source=await textureLoader.loadAsync(url);
    if(/\.svg(?:[?#]|$)/i.test(url)){
      // SVGs without explicit pixel dimensions are valid HTML images but cannot
      // be uploaded reliably by every WebGL implementation. Rasterize only for
      // the GPU texture; the source artwork and its aspect ratio stay intact.
      await source.image.decode();
      const ratio=source.image.naturalWidth/source.image.naturalHeight;
      const t=canvasTexture(1536,Math.round(1536/ratio),(ctx,w,h)=>ctx.drawImage(source.image,0,0,w,h));
      source.dispose();return t;
    }
    source.colorSpace=THREE.SRGBColorSpace;source.anisotropy=4;textures.add(source);return source;
  }
  function plane(w,h,texture,parent=group,x=0,y=0,z=0){const m=mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:texture,roughness:.85,side:THREE.DoubleSide}),parent,x,y,z);m.castShadow=false;return m;}
  function panel(text,x,y,z,w,h,{rotation=0,color,background,font}={}){const p=plane(w,h,textBoard(text,w,h,{color,background,font}),group,x,y,z);p.rotation.y=rotation;return p;}
  function plaque(text,x,y,z,w=2.7){box(x,y,z,w,.29,.07,BRASS);panel(text,x,y,z+.041,w-.08,.23,{font:60});}
  function glow(x,y,z,color=0xffd59b,intensity=2,distance=5){const light=new THREE.PointLight(color,intensity,distance,2);light.position.set(x,y,z);group.add(light);return light;}
  function lamp(x,z,{height=2.4,table=false}={}){const y=table?1.05:0; cylinder(x,y+.04,z,.28,.33,.08,INK);cylinder(x,y+height*.48,z,.035,.045,height*.92,BRASS);cylinder(x,y+height-.17,z,.27,.44,.46,CREAM);cylinder(x,y+height-.40,z,.39,.39,.025,BRASS);sphere(x,y+height-.35,z,.10,0xffd997);glow(x,y+height-.4,z,0xffd39a,1.2,3.4);if(!table)block(x,z,.66,.66);}
  function plant(x,z,scale=1,type='leaf'){const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);group.add(g);block(x,z,.6*scale,.6*scale);cylinder(0,.24,0,.30,.23,.47,0xb67e60,g);cylinder(0,.48,0,.30,.30,.045,0xe0ba8e,g);cylinder(0,.49,0,.255,.255,.02,0x5c5443,g);for(let i=0;i<7;i++){const a=i*2.4,l=.65+(i%3)*.17,dx=Math.sin(a)*.38,dz=Math.cos(a)*.38;line([0,.49,0],[dx,.5+l,dz],.025,0x526f43,g);const leaf=sphere(dx,.5+l,dz,.21,i%2?0x5b7e53:0x7c9560,g,.65,1.9,.30);leaf.rotation.set(Math.sin(a)*.5,a,Math.cos(a)*.5);}if(type==='bamboo'){for(let i=0;i<4;i++){const bx=(i-1.5)*.16;line([bx,.5,0],[bx,2.1+i*.15,0],.035,0x7b9460,g);for(let y=.8;y<2.1+i*.15;y+=.33)cylinder(bx,y,0,.045,.045,.025,0x425b39,g);}}return g;}
  function book(x,y,z,w,h,d,color,parent=group,rotation=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;parent.add(g);box(0,0,0,w,h,d,color,g);box(0,0,d/2+.005,w*.7,h*.82,.012,CREAM,g);box(-w*.42,0,d/2+.015,w*.07,h*.96,.02,color,g);return g;}
  function bookcase(x,z,w=2.4,h=2.8){const g=new THREE.Group();g.position.set(x,0,z);group.add(g);box(0,h/2,-.12,w,h,.26,WOOD,g);for(const sx of [-1,1])box(sx*(w/2-.07),h/2,.15,.14,h,.64,WOOD,g);for(let r=0;r<4;r++){const yy=.15+r*(h-.2)/3;box(0,yy,.14,w,.12,.67,0x9d7958,g);if(r<3){let xx=-w/2+.2;for(let k=0;xx<w/2-.18;k++){const bw=.12+(k%3)*.035,bh=.39+(k%4)*.055;book(xx+bw/2,yy+.08+bh/2,.16,bw,bh,.29,[0x547c78,0xa46e5d,0xc0a46e,0x586982,0x927c89][(k+r)%5],g);xx+=bw+.035;}}}block(x,z,w,.86);return g;}
  function desk(x,z,w=3.4,d=1.25,color=WOOD){const g=new THREE.Group();g.position.set(x,0,z);group.add(g);box(0,1.0,0,w,.14,d,color,g);box(0,.86,-d*.1,w-.15,.20,d*.6,color,g);for(const xx of [-w/2+.15,w/2-.15])for(const zz of [-d/2+.13,d/2-.13])box(xx,.47,zz,.1,.95,.1,INK,g);block(x,z,w,d);return g;}
  function stool(x,z,color=theme.accent){cylinder(x,.53,z,.34,.35,.16,color);for(const a of [0,2.1,4.2])line([x+Math.sin(a)*.18,.48,z+Math.cos(a)*.18],[x+Math.sin(a)*.28,.03,z+Math.cos(a)*.28],.045,WOOD);block(x,z,.72,.72);}
  function notebook(x,y,z,parent=group,color=theme.accent){box(x,y,z,.46,.065,.64,color,parent);box(x,y+.037,z,.39,.014,.58,CREAM,parent);for(let i=0;i<5;i++)box(x,y+.046,z-.16+i*.06,.24,.003,.009,0xb6b1a0,parent);}
  function mug(x,y,z,parent=group){cylinder(x,y+.12,z,.11,.10,.23,CREAM,parent);cylinder(x,y+.24,z,.085,.085,.006,0x6b5341,parent);const ring=mesh(new THREE.TorusGeometry(.09,.025,8,16),mat(CREAM),parent,x+.12,y+.12,z);ring.rotation.y=Math.PI/2;}
  function rug(x,z,w,d,color=theme.rug){
    const key=`woven-rug:${color}`;
    if(!materials.has(key)){
      const weave=canvasTexture(128,128,(ctx,cw,ch)=>{
        ctx.fillStyle='#ededed';ctx.fillRect(0,0,cw,ch);
        for(let row=0;row<ch;row+=4)for(let col=0;col<cw;col+=4){
          ctx.fillStyle=(row+col)%8?'#d7d7d7':'#fbfbfb';
          ctx.fillRect(col,row,3,1);ctx.fillRect(col+2,row+1,1,3);
        }
      });weave.wrapS=weave.wrapT=THREE.RepeatWrapping;weave.repeat.set(8,8);
      materials.set(key,new THREE.MeshStandardMaterial({color,map:weave,bumpMap:weave,bumpScale:.008,roughness:1}));
    }
    const base=box(x,.016,z,w,.022,d,color);base.material=materials.get(key);
for(const sx of [-1,1])box(x+sx*(w/2-.12),.03,z,.028,.008,d-.20,CREAM);for(const sz of [-1,1])box(x,.03,z+sz*(d/2-.12),w-.20,.008,.028,CREAM);for(let i=0;i<10;i++)for(const sz of [-1,1])box(x-w/2+.15+i*(w-.3)/9,.019,z+sz*(d/2+.07),.025,.015,.14,CREAM);}
  function windowFrame(x,z,{rotation=0,w=2.8,h=2.3,y=2.45}={}){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;group.add(g);const t=canvasTexture(256,256,(ctx,cw,ch)=>{const gradient=ctx.createLinearGradient(0,0,0,ch);gradient.addColorStop(0,'#afced4');gradient.addColorStop(.62,'#dce5ce');gradient.addColorStop(1,'#799a75');ctx.fillStyle=gradient;ctx.fillRect(0,0,cw,ch);ctx.fillStyle='#9cb79a';ctx.beginPath();ctx.moveTo(0,170);ctx.bezierCurveTo(50,115,90,220,155,155);ctx.bezierCurveTo(195,120,225,170,256,140);ctx.lineTo(256,256);ctx.lineTo(0,256);ctx.fill();});plane(w,h,t,g,0,0,0);for(const s of [-1,1]){box(s*(w/2+.05),0,.07,.12,h+.25,.15,WOOD,g);box(0,s*(h/2+.05),.07,w+.2,.12,.15,WOOD,g);}box(0,0,.08,.075,h,.13,CREAM,g);box(0,0,.08,w,.075,.13,CREAM,g);box(0,-h/2-.13,.18,w+.35,.14,.38,CREAM,g);return g;}

  // Fine surface variation reads when the visitor zooms in; large shapes stay quiet.
  let surfaceSeed=2841;
  const surfaceRandom=()=>{surfaceSeed=(1664525*surfaceSeed+1013904223)>>>0;return surfaceSeed/4294967296;};
  const floorTexture=canvasTexture(1024,1024,(ctx,w,h)=>{
    ctx.fillStyle=`#${theme.floor.toString(16).padStart(6,'0')}`;ctx.fillRect(0,0,w,h);
    if(place.id==='tsinghua'){
      for(let y=0;y<h;y+=128)for(let x=0;x<w;x+=128){
        ctx.fillStyle=(x+y)%256?'rgba(255,255,255,.05)':'rgba(60,65,42,.045)';ctx.fillRect(x+2,y+2,124,124);
        ctx.strokeStyle='rgba(71,65,45,.18)';ctx.lineWidth=2;ctx.strokeRect(x,y,128,128);
        for(let i=0;i<80;i++){ctx.fillStyle=surfaceRandom()>.5?'rgba(255,255,255,.09)':'rgba(47,54,39,.04)';ctx.fillRect(x+surfaceRandom()*125,y+surfaceRandom()*125,1.5,1.5);}
      }
    }else{
      for(let y=0;y<h;y+=64)for(let x=(y%128?-128:0);x<w;x+=256){
        ctx.save();ctx.beginPath();ctx.rect(x+2,y+2,253,61);ctx.clip();
        ctx.fillStyle=`rgba(${surfaceRandom()>.5?'255,240,212':'45,27,15'},${.02+surfaceRandom()*.045})`;ctx.fillRect(x,y,256,64);
        for(let g=0;g<13;g++){
          const yy=y+4+g*4.6;ctx.strokeStyle=`rgba(67,42,23,${.022+surfaceRandom()*.035})`;ctx.lineWidth=.7;
          ctx.beginPath();ctx.moveTo(x,yy);ctx.bezierCurveTo(x+70,yy+3.5,x+170,yy-3,x+256,yy+1);ctx.stroke();
        }
        if(surfaceRandom()>.64){ctx.strokeStyle='rgba(72,42,22,.08)';for(let ring=1;ring<4;ring++){ctx.beginPath();ctx.ellipse(x+70+surfaceRandom()*60,y+31,ring*9,ring*2.2,0,0,Math.PI*2);ctx.stroke();}}
        ctx.restore();ctx.fillStyle='rgba(54,36,24,.18)';ctx.fillRect(x,y,256,1.4);ctx.fillRect(x,y,1.3,64);
        ctx.fillStyle='rgba(255,237,202,.12)';ctx.fillRect(x+1.5,y+1.5,254,1);
      }
    }
  });
  const floor=mesh(new THREE.PlaneGeometry(14,12),new THREE.MeshStandardMaterial({map:floorTexture,bumpMap:floorTexture,bumpScale:.015,roughness:.88}),group,0,0,0);floor.rotation.x=-Math.PI/2;floor.castShadow=false;floor.name='interior-walkable-floor';
  box(0,-.17,0,14.4,.30,12.4,WOOD);box(0,-.035,5.98,14.15,.09,.15,BRASS);
  if(place.id!=='internships'){
    box(0,2.28,-6,14.3,4.6,.24,theme.wall);
    // The near half of each side wall is cut away for the explorer's camera.
    for(const side of [-1,1]){box(side*7,2.28,-3.45,.24,4.6,5.2,theme.wall);box(side*7,.27,2.6,.24,.55,6.7,theme.wall);box(side*7,4.6,-3.45,.34,.22,5.4,WOOD);box(side*7,1.0,-3.45,.27,.07,5.2,WOOD);}
    box(0,4.6,-5.92,14.4,.22,.38,WOOD);box(0,.13,-5.81,14.1,.26,.15,WOOD);box(0,1.0,-5.83,14.1,.07,.12,WOOD);
    for(const x of [-6.8,-3.45,3.45,6.8])box(x,2.3,-5.81,.15,4.4,.15,WOOD);
    windowFrame(-6.83,-3.15,{rotation:Math.PI/2,w:2.9});windowFrame(6.83,-3.15,{rotation:-Math.PI/2,w:2.9});
  }else{
    // Canvas walls and seams, an open front and rolled-back roof: a real tent room.
    box(0,2.05,-5.94,14.1,4.1,.10,theme.wall);for(const side of [-1,1]){box(side*6.95,1.6,-2.7,.1,3.2,6.5,theme.wall);for(const z of [-5.7,-2.8,.4])line([side*6.84,0,z],[side*6.84,3.7,z],.055,WOOD);}
    for(let x=-6.5;x<=6.5;x+=1.3)box(x,2.05,-5.87,.025,4.1,.02,0xc4a579);
    line([-6.8,3.8,-5.7],[0,5.3,-5.7],.08,WOOD);line([0,5.3,-5.7],[6.8,3.8,-5.7],.08,WOOD);// The near roof ridge is removed with the cutaway, keeping exhibits unobscured.
    windowFrame(-3.5,-5.82,{w:2.1,h:1.5,y:2.4});windowFrame(3.5,-5.82,{w:2.1,h:1.5,y:2.4});
  }
  const fill=new THREE.HemisphereLight(0xffefda,0x526056,1.2);group.add(fill);const windowLight=new THREE.DirectionalLight(0xd7e7dd,1.25);windowLight.position.set(-6,7,-1);group.add(windowLight);
  glow(0,3.5,-2.2,0xffdfae,20,14);
  // A clear threshold doubles as the exit target; no front wall obscures the room.
  for(const x of [-1.25,1.25]){box(x,.25,5.8,.18,.5,.36,WOOD);sphere(x,.52,5.8,.09,BRASS);}
  rug(0,4.9,2.15,1.0,theme.accent);const exitLabel=plane(1.65,.25,textBoard('RETURN TO THE VILLAGE',1.65,.25,{font:54}),group,0,.04,5.0);exitLabel.rotation.x=-Math.PI/2;
  const exitMesh=box(0,.11,5.85,2.3,.12,.30,BRASS);exitMesh.userData.exit=true;targets.push(exitMesh);
  panel(theme.name,0,4.03,-5.83,5.8,.45,{font:71,color:'#293f42',background:`#${theme.wall.toString(16)}`});
  panel(theme.subtitle,0,3.61,-5.82,6.0,.21,{font:44,color:'#5f675b',background:`#${theme.wall.toString(16)}`});

  function screen(x,y,z,w=1.5,h=.9,mode='sequence',parent=group){
    box(x,y,z,w+.12,h+.12,.12,INK,parent);const tex=canvasTexture(640,360,(ctx,cw,ch)=>{ctx.fillStyle='#223c42';ctx.fillRect(0,0,cw,ch);ctx.strokeStyle='#456268';ctx.lineWidth=1;for(let xx=40;xx<cw;xx+=40){ctx.beginPath();ctx.moveTo(xx,0);ctx.lineTo(xx,ch);ctx.stroke();}for(let yy=40;yy<ch;yy+=40){ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(cw,yy);ctx.stroke();}ctx.fillStyle='#dfebde';ctx.font='600 26px system-ui';ctx.fillText(mode==='sequence'?'SEQUENCE DESIGN':mode==='video'?'CREATIVE STUDIO':'RESEARCH NOTEBOOK',32,40);ctx.strokeStyle='#d5b978';ctx.lineWidth=4;ctx.beginPath();if(mode==='sequence'){const points=[[32,130],[100,130],[115,82],[155,82],[170,130],[238,130],[253,170],[360,170],[375,130],[608,130]];points.forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.stroke();ctx.strokeStyle='#7ec3b8';ctx.beginPath();[[32,265],[185,265],[200,200],[390,200],[405,265],[608,265]].forEach(([px,py],i)=>i?ctx.lineTo(px,py):ctx.moveTo(px,py));ctx.stroke();}else if(mode==='video'){for(let i=0;i<4;i++){ctx.fillStyle=['#c9958d','#719a99','#d4ba8b','#7d8fa7'][i];ctx.fillRect(32+i*148,92,132,132);ctx.fillStyle='#f3e1bc';ctx.beginPath();ctx.arc(98+i*148,140,22,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#bb86a2';ctx.fillRect(32,262,530,23);ctx.fillStyle='#679a9c';ctx.fillRect(32,301,410,19);}else{for(let i=0;i<5;i++){ctx.fillStyle=['#82b6ae','#d7be80','#88a5b6'][i%3];ctx.fillRect(33,85+i*46,170+i%3*130,12);}ctx.fillStyle='#e1d9c3';ctx.fillRect(465,84,110,195);}});plane(w,h,tex,parent,x,y,z+.068);box(x,y-h/2-.18,z,.12,.36,.14,INK,parent);box(x,y-h/2-.38,z+.08,.62,.06,.40,INK,parent);return tex;
  }
  function scanner(x,z,scale=1){
    const g=new THREE.Group();g.name='MRI scanner · long-bore magnet';g.position.set(x,0,z);g.scale.setScalar(scale);group.add(g);
    // MRI has a substantial axial magnet body, not a thin toroidal CT gantry.
    // The shell and liner are genuinely open through the entire 1.5 m tunnel.
    const profile=new THREE.Shape();profile.absarc(0,0,1.19,0,Math.PI*2,false);
    const bore=new THREE.Path();bore.absarc(0,0,.58,0,Math.PI*2,true);profile.holes.push(bore);
    const shell=new THREE.ExtrudeGeometry(profile,{depth:1.48,steps:1,curveSegments:64,bevelEnabled:true,bevelThickness:.045,bevelSize:.045,bevelSegments:3});
    mesh(shell,mat(CREAM),g,0,1.48,-.99);
    const liner=mesh(new THREE.CylinderGeometry(.575,.575,1.51,64,1,true),mat(0x80b6cb,{side:THREE.DoubleSide,roughness:.48}),g,0,1.48,-.25);liner.rotation.x=Math.PI/2;
    mesh(new THREE.TorusGeometry(.592,.055,12,64),mat(0x5998b6),g,0,1.48,.52);
    mesh(new THREE.TorusGeometry(1.194,.018,8,64),mat(0x7c969a),g,0,1.48,-.81);
    box(0,.25,-.25,2.50,.5,1.62,CREAM,g);
    box(0,.99,.48,.74,.13,3.02,CREAM,g);box(0,1.075,.47,.65,.07,2.94,0x9fc1cd,g);
    box(0,.52,1.55,.42,.91,.50,CREAM,g);box(0,.07,1.55,.79,.14,.83,INK,g);
    box(.90,1.45,.55,.23,.55,.07,0x7c969a,g);
    for(const yy of [1.31,1.42,1.53])sphere(.90,yy,.596,.029,0x83c2b2,g);
    // Retain the established furniture footprint and the room's routes.
    block(x,z+.5,2.7*scale,3.1*scale);return g;
  }
  function easel(x,z,color=WOOD){line([x-.54,0,z+.17],[x,2.35,z],.055,color);line([x+.54,0,z+.17],[x,2.35,z],.055,color);line([x,2.12,z],[x,0,z-.65],.05,color);box(x,1.43,z+.06,1.36,1.53,.09,CREAM);box(x,.67,z+.16,1.52,.10,.22,color);block(x,z,1.5,1.1);}
  function sofa(x,z,rotation=0,color=theme.accent){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;group.add(g);box(0,.34,0,2.3,.50,.87,color,g);box(0,.89,-.32,2.3,.76,.26,color,g);for(const side of [-1,1])box(side*1.03,.62,.02,.27,.60,1.0,color,g);for(const side of [-1,1])box(side*.5,.62,.08,.88,.14,.73,CREAM,g);for(const xx of [-.87,.87])box(xx,.08,.23,.1,.16,.1,WOOD,g);block(x,z,rotation?1.1:2.4,rotation?2.4:1.1);return g;}
  function cabinet(x,z,w=3.0){box(x,.50,z,w,1,.68,WOOD);box(x,1.04,z,w+.1,.10,.78,CREAM);for(const side of [-1,1]){box(x+side*w*.25,.53,z+.355,w*.45,.75,.045,theme.accent);
      const cx=x+side*w*.25,pw=w*.45;box(cx,.53,z+.385,pw-.17,.58,.018,theme.accent);
      for(const edge of [-1,1]){box(cx+edge*(pw/2-.055),.53,z+.396,.055,.72,.035,theme.accent);box(cx,.53+edge*.33,z+.396,pw-.05,.055,.035,theme.accent);}
      line([x+side*.14,.48,z+.44],[x+side*.14,.64,z+.44],.024,BRASS);
}block(x,z,w,.78);}
  function stringLights(){const points=[];for(let i=0;i<=12;i++){const x=-5.9+i*.98,y=3.8-Math.sin(i/12*Math.PI)*.6;points.push([x,y,-4.8]);if(i>0)line(points[i-1],points[i],.012,INK);sphere(x,y-.09,-4.8,.07,0xffd895);}}

  // Shared gallery furniture grounds the frames as a physical collection.
  for(const x of [-4.75,0,4.75])cabinet(x,-5.25,2.9);
  plant(-6.25,3.75,1.1);plant(6.22,3.85,.9);
  switch(place.id){
    case 'mrfoundry': {
      rug(0,.2,4.2,5.1);
      scanner(-4.6,-.15,.86);
      const d=desk(4.65,-.25,3.4,1.45);screen(0,1.91,-.32,1.64,.93,'sequence',d);notebook(-1.03,1.09,.13,d);mug(1.16,1.07,.26,d);
      // Pegboard and carefully hung workshop tools.
      box(6.76,2.07,-.15,.12,1.8,2.7,0xb69b76);for(let z=-1.22;z<1.0;z+=.29)for(let y=1.35;y<2.9;y+=.28)sphere(6.68,y,z,.024,WOOD);
      for(let i=0;i<4;i++){box(6.61,1.9+i*.06,-.91+i*.52,.06,.60,.07,INK);box(6.60,2.16+i*.06,-.91+i*.52,.10,.12,.22,BRASS);}
      stool(4.7,1.05);lamp(-6.0,-2.0);bookcase(5.45,-2.25,2.0,1.85);break;
    }
    case 'adobe': {
      rug(0,.3,5.0,5.2);
      const d=desk(-4.45,-.1,3.7,1.4,0xa58868);screen(-.65,1.92,-.34,1.55,.92,'research',d);screen(.98,1.86,-.31,1.18,.8,'research',d);notebook(-.45,1.09,.33,d);mug(1.42,1.07,.28,d);stool(-4.4,1.25,0xa96255);
      sofa(4.95,.45,-Math.PI/2,0x6d8990);const coffee=desk(3.3,.3,.95,1.7,0xc3ad87);coffee.scale.y=.55;notebook(0,1.09,0,coffee,0xb9584c);lamp(5.85,-1.65);plant(-5.9,-2.1,1.1);
      // Low pinboard: research directions, not invented results.
      const board=box(-6.72,2.1,-.2,.12,1.5,2.5,CREAM);for(let i=0;i<6;i++)box(-6.64,1.68+(i%2)*.68,-.91+Math.floor(i/2)*.72,.03,.48,.56,[0x9ab9af,0xdcb18e,0xb7aec6][Math.floor(i/2)]);
      break;
    }
    case 'pika': {
      rug(0,.3,4.7,5.0);
      const d=desk(4.55,-.25,3.7,1.5);screen(0,2.03,-.35,2.4,1.18,'video',d);notebook(-1.25,1.09,.30,d);mug(1.42,1.07,.25,d);stool(4.6,1.25);
      // A compact cyclorama and camera form a recognizable working studio.
      box(-4.8,.09,.20,3.1,.18,3.6,0xbaa5b2);box(-4.8,1.6,-1.35,3.1,3.0,.16,0xcbb7c4);box(-4.8,2.65,-1.24,2.8,.05,.05,CREAM);block(-4.8,.20,3.1,3.6);
      for(const side of [-1,1]){const xx=-4.8+side*1.2;line([xx,0,2.2],[xx,2.25,2.2],.035,INK);for(let a=0;a<3;a++)line([xx,.2,2.2],[xx+Math.sin(a*2.1)*.4,0,2.2+Math.cos(a*2.1)*.4],.025,INK);const softbox=box(xx,2.4,2.1,.62,.84,.16,CREAM);softbox.rotation.y=-side*.35;block(xx,2.2,.7,.7);}
      const cameraBody=box(-4.8,1.45,1.53,.53,.36,.40,INK);const lens=cylinder(-4.8,1.45,1.22,.15,.17,.36,0x46565b);lens.rotation.x=Math.PI/2;for(const off of [-.35,0,.35])line([-4.8,1.3,1.53],[-4.8+off,0,1.53+Math.abs(off)],.035,INK);block(-4.8,1.5,1.0,1.0);
      stringLights();break;
    }
    case 'berkeley': {
      rug(0,.4,4.65,5.5);const read=desk(0,-.9,3.35,1.75);notebook(-.85,1.09,.1,read);book(.5,1.14,.2,.65,.11,.75,theme.accent,read);mug(1.1,1.07,.35,read);lamp(0,-1.3,{height:1.0,table:true});stool(-1.0,.65,0x887558);stool(1.0,.65,0x887558);
      for(const side of [-1,1]){bookcase(side*5.0,-1.0,2.7,3.1);bookcase(side*5.0,2.35,2.7,2.1);}lamp(-3.0,2.3);break;
    }
    case 'tsinghua': {
      rug(0,.65,4.5,4.7);const d=desk(4.6,-.1,3.6,1.4);notebook(-.65,1.09,.1,d,0x627851);const scroll=box(.5,1.11,.08,.72,.025,.84,CREAM,d);for(const z of [-.38,.53])cylinder(.5,1.14,z,.04,.04,.9,WOOD,d).rotation.z=Math.PI/2;line([.3,1.16,.1],[.68,1.16,.35],.013,INK,d);mug(-1.26,1.07,.24,d);stool(4.6,1.23);
      // Dry courtyard garden with a deliberate stone path and bamboo border.
      box(-4.8,.11,.05,3.2,.22,4.2,0x8e9782);box(-4.8,.24,.05,2.95,.05,3.95,0xc5c3a7);for(let i=0;i<5;i++){const rock=sphere(-5.25+(i%2)*.75,.35,-1.15+i*.6,.28,0x7d8980,group,1.3,.40,1);rock.rotation.y=i*.7;}block(-4.8,.05,3.2,4.2);plant(-5.7,-1.35,.85,'bamboo');plant(-4.0,-1.35,.9,'bamboo');
      // Lattice screen and warm paper lanterns frame the quiet garden.
      for(let i=0;i<8;i++)box(-6.65,1.9,-1.8+i*.48,.07,2.8,.035,WOOD);for(const y of [.55,1.45,2.4,3.3])box(-6.65,y,-.1,.08,.035,3.6,WOOD);
      for(const x of [-2.0,2.0]){line([x,4.4,-3.8],[x,3.35,-3.8],.018,INK);sphere(x,3.1,-3.8,.38,0xefd6a0,group,.8,1.1,.8);glow(x,2.95,-3.8,0xffd5a0,.7,3);}
      break;
    }
    case 'imaging': {
      rug(0,.5,4.8,5.1);const d=desk(4.7,-.1,3.35,1.4);screen(0,1.96,-.28,1.9,1.05,'research',d);notebook(-1.12,1.09,.1,d);mug(1.2,1.07,.3,d);stool(4.6,1.2);
      // Telescope with lens, balancing arm, mount, and tripod rather than a blob.
      const scope=new THREE.Group();scope.position.set(-4.45,1.9,.25);scope.rotation.z=-.35;scope.rotation.x=-.65;group.add(scope);const tube=cylinder(0,0,0,.31,.28,1.9,CREAM,scope);cylinder(0,.96,0,.34,.34,.12,INK,scope);cylinder(0,1.03,0,.27,.27,.02,0x73a4b0,scope);cylinder(0,-1.06,0,.12,.14,.30,INK,scope);line([-.38,-.22,0],[.38,-.22,0],.08,BRASS,scope);cylinder(-4.45,.86,.25,.1,.12,1.4,BRASS);for(let a=0;a<3;a++)line([-4.45,1.1,.25],[-4.45+Math.sin(a*2.1)*.9,0,.25+Math.cos(a*2.1)*.9],.065,INK);block(-4.45,.25,2.2,2.2);
      cabinet(-4.8,-2.6,2.7);for(let i=0;i<3;i++){const lens=cylinder(-5.55+i*.75,1.3,-2.6,.18,.18,.40,INK);cylinder(-5.55+i*.75,1.51,-2.6,.15,.15,.02,0x7ea5b1);}lamp(6.0,-2.1);break;
    }
    case 'internships': {
      rug(0,.4,5.1,5.0);sofa(-4.6,.1,Math.PI/2,0x788765);sofa(4.6,.1,-Math.PI/2,0x9e7a55);const d=desk(0,-1.6,2.7,1.0);d.scale.y=.65;notebook(-.65,1.09,.05,d);mug(.8,1.07,.05,d);book(.1,1.14,.0,.5,.11,.62,theme.accent,d);
      // Travel trunks and a lantern make this a research base camp, not a campsite caricature.
      for(const side of [-1,1]){box(side*5.25,.31,2.8,1.4,.62,.80,0x907652);for(const dx of [-.43,.43])box(side*5.25+dx,.34,2.8,.055,.7,.85,WOOD);box(side*5.25,.34,3.23,.18,.15,.04,BRASS);block(side*5.25,2.8,1.4,.85);}
      lamp(-2.4,-2.0,{height:2.1});lamp(2.4,-2.0,{height:2.1});stringLights();break;
    }
  }

  const exhibitRecords=[];
  const mounted=exhibits.slice(0,3);
  for(let i=0;i<mounted.length;i++){
    const item=mounted[i],x=mounted.length===1?0:mounted.length===2?(i-.5)*6.0:(i-1)*4.75;
    const y=2.43,z=-5.72,w=3.02,h=1.72;
    const frame=box(x,y,z,w+.19,h+.19,.12,WOOD);frame.userData.exhibitId=item.id;targets.push(frame);
    const backing=box(x,y,z+.073,w,h,.025,CREAM);backing.userData.exhibitId=item.id;targets.push(backing);
    let imageShown=false;
    if(item.image){try{const t=await exhibitTexture(item.image);const aspect=t.image.width/t.image.height,aw=w-.20,ah=h-.18,iw=Math.min(aw,ah*aspect),ih=iw/aspect;const p=mesh(new THREE.PlaneGeometry(iw,ih),new THREE.MeshBasicMaterial({map:t,transparent:true,toneMapped:false}),group,x,y,z+.094);p.castShadow=false;p.userData.exhibitId=item.id;targets.push(p);imageShown=true;}catch(error){console.warn(`Interior exhibit image unavailable: ${item.id}`,error?.message||error);}}
    if(!imageShown){const t=canvasTexture(1024,576,(ctx,cw,ch)=>{ctx.fillStyle='#f1ecd9';ctx.fillRect(0,0,cw,ch);ctx.fillStyle=`#${theme.accent.toString(16)}`;ctx.fillRect(0,0,15,ch);ctx.font='500 26px system-ui';ctx.fillText(item.kind==='project'?'PROJECT NOTE':'FIELD NOTE',55,70);ctx.fillStyle='#294145';ctx.font='600 56px system-ui';const words=item.title.split(' ');let line='',yy=170;for(const word of words){const trial=line+word+' ';if(ctx.measureText(trial).width>cw-110&&line){ctx.fillText(line,55,yy);yy+=68;line=word+' ';}else line=trial;}ctx.fillText(line,55,yy);ctx.font='400 25px system-ui';ctx.fillStyle='#687267';ctx.fillText('Walk closer to explore',55,ch-65);});const p=plane(w-.12,h-.12,t,group,x,y,z+.095);p.userData.exhibitId=item.id;targets.push(p);}
    plaque(item.title,x,1.34,z+.08,3.05);
    // Museum-style picture light: three shapes plus a gentle emissive strip.
    box(x,y+h/2+.27,z+.18,.72,.06,.25,BRASS);box(x,y+h/2+.233,z+.19,.62,.016,.15,CREAM,group,{emissive:0xf5ce89,emissiveIntensity:.5});
    const position=new THREE.Vector3(x,y,z+.10),approach=new THREE.Vector3(x,0,-3.45);
    exhibitRecords.push({...item,body:item.body||item.description,links:item.links||(item.href?[{label:item.label||'Explore',url:item.href}]:[]),position,approach});
  }
  // Preserve any additional entries as clearly marked tabletop folios, all reachable.
  for(let i=3;i<exhibits.length;i++){
    const item=exhibits[i],x=(i-3)%2===0?-2.15:2.15,z=2.8+Math.floor((i-3)/2)*.9;
    const stand=desk(x,z,.70,.65);stand.scale.y=.85;
    const face=plane(.62,.76,textBoard(item.title,.62,.76,{font:60}),group,x,1.06,z-.03);face.rotation.x=-.55;face.userData.exhibitId=item.id;targets.push(face);
    exhibitRecords.push({...item,body:item.body||item.description,links:item.links||(item.href?[{label:item.label||'Explore',url:item.href}]:[]),position:new THREE.Vector3(x,1.1,z),approach:new THREE.Vector3(x,0,z+.85)});
  }
  group.updateMatrixWorld(true);
  // Furniture never moves. Bake its small pieces into one mesh per material
  // instead of issuing hundreds of separate draw calls for book spines/trim.
  // Clickable artwork and the navigation floor remain separate raycast targets.
  const sourceGeometries=new Set(),batches=new Map();
  group.traverse(o=>{
    if(!o.isMesh)return;sourceGeometries.add(o.geometry);
    if(o===floor||targets.includes(o)||Array.isArray(o.material))return;
    const key=o.material.uuid+':'+o.castShadow+':'+o.receiveShadow;
    if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);
  });
  for(const pieces of batches.values()){
    if(pieces.length<2)continue;
    const transformed=pieces.map(o=>{const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);return g;});
    const geometry=mergeGeometries(transformed);for(const g of transformed)g.dispose();
    if(!geometry)continue;
    const m=new THREE.Mesh(geometry,pieces[0].material);m.castShadow=pieces[0].castShadow;m.receiveShadow=pieces[0].receiveShadow;m.name='static-room-furniture';
    for(const piece of pieces)piece.removeFromParent();group.add(m);
  }
  const disposableMaterials=new Set(),disposableGeometries=new Set(sourceGeometries);group.traverse(o=>{if(o.isMesh){disposableGeometries.add(o.geometry);for(const m of [].concat(o.material))disposableMaterials.add(m);}});
  return {
    group,floor,blockers,targets,exhibits:exhibitRecords,
    spawn:new THREE.Vector3(0,0,4.5),heading:Math.PI,
    exit:{position:new THREE.Vector3(0,.2,5.85),approach:new THREE.Vector3(0,0,5.2),radius:1.3},
    bounds:{minX:-6.7,maxX:6.7,minZ:-5.65,maxZ:5.65},
    camera:{target:new THREE.Vector3(0,1,0),distance:19,pitch:.66,yaw:.15},
    update(dt,time){for(const animate of animations)animate(dt,time);},
    dispose(){group.removeFromParent();for(const g of disposableGeometries)g.dispose();for(const m of disposableMaterials)m.dispose();for(const t of textures)t.dispose();}
  };
}
