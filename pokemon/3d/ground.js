/* Worn limestone paths and a hand-laid arrival court, batched by material. */
import * as THREE from './lib/three.module.js';
import { RoundedBoxGeometry } from './lib/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from './lib/addons/utils/BufferGeometryUtils.js';

export function buildArrivalGround({scene,roads,groundHeight,riverZ,rand,surfaceMaterials}) {
  const buckets=new Map();
  function stone(x,z,w,d,color,angle=0,height=.09){
    const g=new RoundedBoxGeometry(w,height,d,1,.025);
    g.rotateY(angle);g.translate(x,groundHeight(x,z)+height*.38+.028,z);
    if(!buckets.has(color))buckets.set(color,[]);buckets.get(color).push(g);
  }
  const textureCanvas=document.createElement('canvas');textureCanvas.width=textureCanvas.height=256;
  const ctx=textureCanvas.getContext('2d'),pixels=ctx.createImageData(256,256);
  let textureSeed=1729;const noise=()=>{textureSeed=(1664525*textureSeed+1013904223)>>>0;return textureSeed/4294967296;};
  for(let y=0;y<256;y++)for(let x=0;x<256;x++){
    const i=(y*256+x)*4,u=x/256,v=y/256;
    const wash=Math.sin(Math.PI*2*(u+v))*2.6+Math.cos(Math.PI*2*(2*u-v))*1.8;
    const value=244+wash+noise()*5;
    pixels.data[i]=value;pixels.data[i+1]=value-1;pixels.data[i+2]=value-4;pixels.data[i+3]=255;
  }ctx.putImageData(pixels,0,0);
  for(let i=0;i<190;i++){const x=noise()*256,y=noise()*256,r=.4+noise()*1.2;ctx.fillStyle=noise()>.5?'rgba(113,102,83,.09)':'rgba(255,255,247,.24)';ctx.beginPath();ctx.ellipse(x,y,r*1.4,r,noise()*3,0,Math.PI*2);ctx.fill();}
  const gravel=new THREE.CanvasTexture(textureCanvas);gravel.colorSpace=THREE.SRGBColorSpace;gravel.wrapS=gravel.wrapT=THREE.RepeatWrapping;gravel.anisotropy=4;
  const tones=[0xcbbfa7,0xd8cdb9,0xd2c4ad,0xc7bba6,0xe0d5c2];
  // A narrow painted shoulder dissolves into the meadow. The authored route
  // centre and terrain heights stay identical to the traversable paths.
  const sampledRoads=roads.map(curve=>curve.getSpacedPoints(180));
  roads.forEach((curve,index)=>{
    const points=curve.getSpacedPoints(100),v=[],uv=[],ix=[];
    const width=index===0?1.14:.92;
    for(let i=0;i<points.length;i++){
      const p=points[i],tangent=curve.getTangentAt(i/(points.length-1)),n=new THREE.Vector3(-tangent.z,0,tangent.x);
      const w=width+.22+Math.sin(p.x*.63+p.z*.34)*.045+Math.sin(p.x*1.37-p.z*.81)*.018;
      for(const s of [-1,1]){const x=p.x+n.x*w*s,z=p.z+n.z*w*s;v.push(x,groundHeight(x,z)+.06,z);uv.push(s===-1?0:1,i*.22);}
      if(i&&Math.abs(p.z-riverZ(p.x))>2.2){const j=i*2;ix.push(j-2,j-1,j,j-1,j+1,j);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();
    const path=new THREE.Mesh(g,surfaceMaterials?.pathGravel||new THREE.MeshStandardMaterial({color:0xe4d4af,map:gravel,roughness:1}));path.name=`Limestone path ${index+1}`;path.receiveShadow=true;scene.add(path);
    // Uneven dressed-stone edging on the arrival routes; distant paths stay quiet.
    const steps=Math.ceil(curve.getLength()/.54);
    for(let i=0;i<=steps;i++){
      const u=i/steps,p=curve.getPointAt(u),t=curve.getTangentAt(u),n=new THREE.Vector3(-t.z,0,t.x);
      if(p.x<-17||p.x>20||p.z<.5||p.z>16)continue;
      if(p.x>-10.4&&p.x<2.7&&p.z>5.5&&p.z<12.3)continue;
      for(const side of [-1,1]){
        const x=p.x+n.x*(width+.04)*side,z=p.z+n.z*(width+.04)*side;
        if(sampledRoads.some((samples,k)=>k!==index&&samples.some(p=>Math.hypot(p.x-x,p.z-z)<1.24)))continue;
        stone(x,z,.48,.17,tones[i%tones.length],Math.atan2(-t.z,t.x),.10);
      }
    }
  });
  // A warm mortar bed sits beneath the pavers. Narrow joints read as stonework,
  // rather than the lawn showing through every crack in the court.
  const outline=[[-10.02,6.27],[-8.92,5.43],[1.31,5.43],[2.45,6.27],[2.45,10.93],[1.31,11.82],[-8.92,11.82],[-10.02,10.93]];
  const shape=new THREE.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const mortarGeometry=new THREE.ShapeGeometry(shape);mortarGeometry.rotateX(-Math.PI/2);
  const mortarPositions=mortarGeometry.attributes.position;for(let i=0;i<mortarPositions.count;i++)mortarPositions.setY(i,groundHeight(mortarPositions.getX(i),mortarPositions.getZ(i))+.047);
  mortarGeometry.computeVertexNormals();const mortar=new THREE.Mesh(mortarGeometry,new THREE.MeshStandardMaterial({color:0x96907b,roughness:1}));mortar.receiveShadow=true;scene.add(mortar);
  // A compact, chamfered entry court. Every paver is modeled, then batched.
  for(let row=0;row<12;row++)for(let col=0;col<21;col++){
    const x=-9.7+col*.59+(row%2)*.295,z=5.7+row*.53;
    if((x<-8.8||x>1.3)&&(z<6.25||z>11.0))continue;
    if(x>2.25||x<-10)continue;
    stone(x,z,.565,.505,tones[Math.floor(rand()*tones.length)],(rand()-.5)*.012,.071+((row*7+col*3)%5)*.002);
  }
  // Taller curved border stones visually hold the court against the garden.
  const border=[[-9.9,6.5],[-9.9,10.6],[-8.8,11.75],[1.3,11.75],[2.35,10.7],[2.35,6.4]];
  for(let i=0;i<border.length-1;i++){
    const a=border[i],b=border[i+1],d=Math.hypot(b[0]-a[0],b[1]-a[1]),count=Math.ceil(d/.52),angle=Math.atan2(-(b[1]-a[1]),b[0]-a[0]);
    for(let j=0;j<count;j++){const u=(j+.5)/count,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u;if(z>11&&x>-5.0&&x<-2.4)continue;stone(x,z,.49,.22,0xaaa98f,angle,.15);}
  }
  const beds=[{x:-8.8,z:6.3,w:1.7,d:2.6},{x:1.35,z:6.55,w:1.35,d:2.9},{x:-7.3,z:12.9,w:3.7,d:1.35},{x:.1,z:12.9,w:2.8,d:1.35}];
  for(const bed of beds){
    const earth=new THREE.Mesh(new RoundedBoxGeometry(bed.w,.12,bed.d,2,.06),new THREE.MeshStandardMaterial({color:0x786b4f,roughness:1}));earth.position.set(bed.x,groundHeight(bed.x,bed.z)+.035,bed.z);earth.receiveShadow=true;scene.add(earth);
    for(const side of [-1,1]){
      for(let x=-bed.w/2;x<bed.w/2;x+=.43)stone(bed.x+x+.20,bed.z+side*bed.d/2,.40,.15,0xb9b69c,0,.15);
      for(let z=-bed.d/2;z<bed.d/2;z+=.43)stone(bed.x+side*bed.w/2,bed.z+z+.20,.40,.15,0xb9b69c,Math.PI/2,.15);
    }
  }
  for(const[color,parts]of buckets){const mesh=new THREE.Mesh(mergeGeometries(parts,false),new THREE.MeshStandardMaterial({color,map:gravel,bumpMap:gravel,bumpScale:.006,roughness:.98}));mesh.castShadow=mesh.receiveShadow=true;scene.add(mesh);parts.forEach(g=>g.dispose());}
  return beds;
}
