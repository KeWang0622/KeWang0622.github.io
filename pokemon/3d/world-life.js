import * as THREE from './lib/three.module.js';

// A few inhabitants make the garden feel observed, not decorated. Instances
// share geometry/materials, use a private random sequence, and cast no shadows.
// Add this after the collision and flight atlas: the entire layer is decorative.
export function createWorldLife({scene,groundHeight=()=>0,mobile=false,flowerPatches}={}) {
  const group=new THREE.Group();group.name='garden-wildlife';group.userData.decorative=true;
  const random=seeded(80621),patches=flowerPatches?.length?flowerPatches:[
    [-36,7],[-29.5,7],[-26,28],[-18,28],[18,-13.4],[25.4,-13.4],[-13.8,12],[7.8,13]
  ];
  const palette=[0xe5ddad,0xd6b181,0xa5b9ba,0xd2ca9b];
  const butterflyCount=mobile?12:22,birdCount=mobile?2:4;
  const butterflies=Array.from({length:butterflyCount},(_,i)=>{
    const patch=patches[i%patches.length],x=patch.x??patch[0],z=patch.z??patch[1];
    return{x:x+(random()-.5)*1.6,z:z+(random()-.5)*1.6,phase:random()*Math.PI*2,
      radius:.35+random()*.75,height:.38+random()*.5,speed:.42+random()*.35,size:.11+random()*.05,
      fleeX:0,fleeZ:0,color:palette[i%palette.length]};
  });
  const birds=Array.from({length:birdCount},(_,i)=>({
    x:i<2?-10:24,z:i<2?1:-17,phase:i*Math.PI*.38+random(),height:9+(i%2)*.8,
    radius:13+(i%2)*1.6,size:.65+random()*.15,speed:.075+random()*.015
  }));
  const wingMaterial=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,side:THREE.DoubleSide});
  wingMaterial.name='Ivory and ochre garden wings';wingMaterial.forceSinglePass=true;
  const bodyMaterial=new THREE.MeshStandardMaterial({color:0x5c6254,roughness:1});bodyMaterial.name='Garden wildlife bodies';
  const birdMaterial=new THREE.MeshStandardMaterial({color:0xbac1b0,vertexColors:true,roughness:1,side:THREE.DoubleSide});
  birdMaterial.name='Quiet dove wings';birdMaterial.forceSinglePass=true;
  const bodyGeometry=new THREE.SphereGeometry(1,8,5),butterflyGeometry=makeWing(false),birdGeometry=makeWing(true);
  const butterflyWings=instances(butterflyGeometry,wingMaterial,butterflyCount*2,'butterfly-wings');
  const butterflyBodies=instances(bodyGeometry,bodyMaterial,butterflyCount,'butterfly-bodies');
  const birdWings=instances(birdGeometry,birdMaterial,birdCount*2,'dove-wings');
  const birdBodies=instances(bodyGeometry,bodyMaterial,birdCount,'dove-bodies');
  for(let i=0;i<butterflies.length;i++){
    const color=new THREE.Color(butterflies[i].color);butterflyWings.setColorAt(i*2,color);butterflyWings.setColorAt(i*2+1,color);
  }
  butterflyWings.instanceColor.needsUpdate=true;
  group.add(butterflyWings,butterflyBodies,birdWings,birdBodies);
  const root=new THREE.Object3D(),part=new THREE.Object3D(),matrix=new THREE.Matrix4();
  let lastTime=NaN;
  function placeWing(mesh,index,side,flap,size){
    // Rotate the left wing around its hinge instead of using a negative scale.
    // InstancedMesh does not support reflected transforms: those invert face
    // winding/normals and make one half of an otherwise matching pair shade dark.
    part.position.set(0,0,0);part.rotation.set(0,0,side===1?flap:Math.PI-flap);part.scale.set(size,size,size);part.updateMatrix();
    matrix.multiplyMatrices(root.matrix,part.matrix);mesh.setMatrixAt(index,matrix);
  }
  function placeBody(mesh,index,x,y,z){
    part.position.set(0,0,0);part.rotation.set(0,0,0);part.scale.set(x,y,z);part.updateMatrix();
    matrix.multiplyMatrices(root.matrix,part.matrix);mesh.setMatrixAt(index,matrix);
  }
  // Passing the same frozen wind clock freezes both flight and wing poses.
  // `enabled` is only visibility (e.g. indoors), never a hidden background loop.
  function update(time,{player=null,enabled=true,motion=true}={}){
    group.visible=enabled;
    if(!enabled)return;
    if(!Number.isFinite(time))time=0;
    const dt=Number.isFinite(lastTime)?Math.min(.05,Math.max(0,time-lastTime)):0;
    if(time===lastTime)return;
    lastTime=time;
    for(let i=0;i<butterflies.length;i++){
      const b=butterflies[i],phase=time*b.speed+b.phase;
      let x=b.x+Math.sin(phase)*b.radius,z=b.z+Math.sin(phase*.83+b.phase)*b.radius*.65;
      const height=groundHeight(x,z);
      const dx=player?x-player.x:0,dz=player?z-player.z:0,distance=Math.hypot(dx,dz);
      const nearby=motion&&player&&Math.abs(player.y-height)<1.4&&distance<1.55;
      const escape=nearby?(1-distance/1.55)*1.5:0;
      const response=1-Math.exp(-dt*(nearby?6:1.4));
      b.fleeX+=((nearby?dx/Math.max(distance,.1)*escape:0)-b.fleeX)*response;
      b.fleeZ+=((nearby?dz/Math.max(distance,.1)*escape:0)-b.fleeZ)*response;
      x+=b.fleeX;z+=b.fleeZ;
      const y=height+b.height+Math.sin(phase*2.5)*.12+Math.hypot(b.fleeX,b.fleeZ)*.20;
      const yaw=Math.atan2(Math.cos(phase),Math.cos(phase*.83+b.phase)*.54);
      root.position.set(x,y,z);root.rotation.set(Math.sin(phase)*.10,yaw,Math.sin(phase*1.3)*.16);root.scale.set(1,1,1);root.updateMatrix();
      const flap=.28+Math.sin(time*14+b.phase)*.86;
      placeWing(butterflyWings,i*2,1,flap,b.size);placeWing(butterflyWings,i*2+1,-1,flap,b.size);
      placeBody(butterflyBodies,i,b.size*.09,b.size*.09,b.size*.50);
    }
    for(let i=0;i<birds.length;i++){
      const b=birds[i],angle=time*b.speed+b.phase;
      root.position.set(b.x+Math.cos(angle)*b.radius,b.height+Math.sin(angle*2)*.45,b.z+Math.sin(angle)*b.radius*.68);
      root.rotation.set(0,Math.atan2(-Math.sin(angle),Math.cos(angle)*.68),-.10);root.scale.set(1,1,1);root.updateMatrix();
      // Long glides are punctuated by short, soft wingbeats, not a frantic loop.
      const beat=Math.max(0,Math.sin(time*.70+b.phase));
      const flap=.08+Math.sin(time*4.6+b.phase)*.32*beat*beat;
      placeWing(birdWings,i*2,1,flap,b.size);placeWing(birdWings,i*2+1,-1,flap,b.size);
      placeBody(birdBodies,i,b.size*.10,b.size*.10,b.size*.30);
    }
    for(const mesh of [butterflyWings,butterflyBodies,birdWings,birdBodies])mesh.instanceMatrix.needsUpdate=true;
  }
  update(0);
  group.userData.update=update;
  group.userData.wildlife={butterflies:butterflyCount,birds:birdCount,drawCalls:4};
  group.userData.dispose=()=>{
    for(const mesh of [butterflyWings,butterflyBodies,birdWings,birdBodies])mesh.dispose();
    for(const item of [bodyGeometry,butterflyGeometry,birdGeometry,wingMaterial,bodyMaterial,birdMaterial])item.dispose();
    group.removeFromParent();
  };
  scene?.add(group);
  return group;
}

function instances(geometry,material,count,name){
  const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.name=name;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);mesh.castShadow=false;mesh.receiveShadow=false;
  // Only four draws for the whole map. Explicit bounds include flight paths,
  // rather than recomputing every instance's geometry bounds every frame.
  mesh.boundingSphere=new THREE.Sphere(new THREE.Vector3(0,5,0),82);
  mesh.userData.decorative=true;return mesh;
}

function makeWing(bird){
  const points=bird?[
    [0,0,-.17],[.29,.018,-.25],[.68,.025,-.33],[.86,0,-.13],[.58,.035,.06],[.18,.01,.13],[0,0,.12]
  ]:[
    [0,0,-.30],[.38,.025,-.66],[.94,.04,-.57],[1,.015,-.12],[.55,.05,.12],
    [.78,.03,.48],[.57,.01,.66],[.18,0,.46],[0,0,.26]
  ];
  const positions=[],colors=[],indices=[];
  for(let i=0;i<points.length;i++){
    positions.push(...points[i]);
    const edge=(i===0||i===points.length-1)?.58:bird?.86:i%3===0?.82:1;
    colors.push(edge,edge,edge);
  }
  for(let i=1;i<points.length-1;i++)indices.push(0,i,i+1);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function seeded(seed){return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};}
