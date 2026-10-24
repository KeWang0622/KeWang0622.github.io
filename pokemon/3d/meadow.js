import * as THREE from './lib/three.module.js';

// A living ground layer, not a collection of oversized plant props. Everything
// here is decorative: add it after the collision / flight-height atlas is built.
// Sixteen-metre tiles allow normal frustum culling; motion stays on the GPU.
export function buildMeadow({scene,groundHeight,roadDistance,riverZ,nearBuilding,pondRadius,windUniform}) {
  const group=new THREE.Group();
  group.name='wind-swept-meadow';
  const grassGeometry=makeTuft(),flowerGeometry=makeWildflower();
  // Four small GPU influence fields are shared by every tile. They never alter
  // terrain or navigation: only blade tips yield as a person passes through.
  const interactors={value:Array.from({length:4},()=>new THREE.Vector4(0,0,0,0))};
  const grassMaterial=meadowMaterial(windUniform,'meadow-grass',interactors);
  const flowerMaterial=meadowMaterial(windUniform,'meadow-wildflowers',interactors);
  const tiles=[],flowerTiles=[],matrix=new THREE.Object3D(),tint=new THREE.Color();
  let seed=27431;
  const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  const smooth=THREE.MathUtils.smoothstep;
  const tileSize=16,samples=25;
  let tuftCount=0,flowerCount=0;

  // These are quiet landscape patches, not repeated circular flower beds.
  // The broad field mixes several spatial scales, so neighbouring tufts share
  // height and colour while a wind wave can visibly move across the meadow.
  const field=(x,z)=>THREE.MathUtils.clamp(.50
    +.23*Math.sin(x*.11+z*.075)
    +.17*Math.cos(z*.17-x*.065)
    +.10*Math.sin(x*.39+z*.21),0,1);
  for(let tz=0;tz<8;tz++)for(let tx=0;tx<8;tx++){
    const tufts=[],flowers=[];
    for(let iz=0;iz<samples;iz++)for(let ix=0;ix<samples;ix++){
      const x=-64+tx*tileSize+random()*tileSize;
      const z=-64+tz*tileSize+random()*tileSize;
      const drift=field(x,z);
      // Leave genuine quiet clearings between denser drifts. A uniform random
      // probability makes grass read as pepper scattered over a flat lawn.
      // The finer candidate grid makes the high patches richer while the broad
      // low patches keep the total instance budget below the original meadow.
      const density=drift<.24?0:.06+.94*smooth(drift,.29,.73);
      if(random()>density)continue;
      const road=roadDistance(x,z);
      // Road ribbons, bridge approaches, terraces, building thresholds and
      // water stay completely legible, including from first-person view.
      if(road<1.72||nearBuilding(x,z,.52)||Math.abs(z-riverZ(x))<1.92||pondRadius(x,z)<1.20)continue;
      // The arrival courtyard is a single broad paved space between paths.
      if(x>-11.5&&x<4.6&&z>4.5&&z<15.35)continue;
      const y=groundHeight(x,z);
      if(!Number.isFinite(y)||y<-.12)continue;
      const verge=smooth(road,1.72,4.25);
      const height=(.15+.29*drift+.15*drift*drift)*(.58+.42*verge)*(.86+random()*.28);
      const width=.90+random()*.40;
      tufts.push({x,y:y-.018,z,height,width,rotation:random()*Math.PI*2,tone:drift});
      // A few ivory flower heads occur together inside the higher grass. Their
      // small size and restricted palette keep roofs and people as focal points.
      const flowerField=Math.sin(x*.29+z*.13)*Math.cos(z*.33-x*.08);
      if(verge>.35&&drift>.44&&flowerField>.58&&random()<.18){
        flowers.push({x:x+.10,y:y-.012,z:z-.08,height:height*(.90+random()*.26),rotation:random()*Math.PI*2});
      }
    }
    if(tufts.length){
      const mesh=new THREE.InstancedMesh(grassGeometry,grassMaterial,tufts.length);
      mesh.name=`meadow-tile-${tx}-${tz}`;
      for(let i=0;i<tufts.length;i++){
        const p=tufts[i];
        matrix.position.set(p.x,p.y,p.z);matrix.rotation.set(0,p.rotation,0);matrix.scale.set(p.width,p.height,p.width);matrix.updateMatrix();
        mesh.setMatrixAt(i,matrix.matrix);
        // Warm olive high ground and subtly blue-green hollows. Small, coherent
        // shifts prevent a speckled checkerboard of independently random greens.
        tint.setRGB(.88+p.tone*.10,.92+p.tone*.07,.88+(1-p.tone)*.12);
        mesh.setColorAt(i,tint);
      }
      prepareInstance(mesh);group.add(mesh);tiles.push(mesh);tuftCount+=tufts.length;
    }
    if(flowers.length){
      const mesh=new THREE.InstancedMesh(flowerGeometry,flowerMaterial,flowers.length);
      mesh.name=`wildflower-tile-${tx}-${tz}`;
      for(let i=0;i<flowers.length;i++){
        const p=flowers[i];
        matrix.position.set(p.x,p.y,p.z);matrix.rotation.set(0,p.rotation,0);matrix.scale.set(1,p.height,1);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);
      }
      prepareInstance(mesh);group.add(mesh);flowerTiles.push(mesh);flowerCount+=flowers.length;
    }
  }
  group.userData.decorative=true;
  group.userData.updateInteractors=(actors=[],dt=1/60,enabled=true)=>{
    const blend=1-Math.exp(-Math.max(0,Math.min(dt,.1))*18);
    for(let i=0;i<interactors.value.length;i++){
      const field=interactors.value[i],actor=enabled?actors[i]:null;
      const point=actor?.position||actor;
      if(point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&Number.isFinite(point.z)){
        // Initial placement must not sweep a field from the origin to the actor.
        if(field.w<.01)field.set(point.x,point.y,point.z,0);
        field.x+=(point.x-field.x)*blend;field.y+=(point.y-field.y)*blend;field.z+=(point.z-field.z)*blend;
        field.w+=((actor?.radius??(i===0?.88:.68))-field.w)*blend;
      }else field.w*=1-blend;
    }
  };
  group.userData.meadow={tufts:tuftCount,blades:tuftCount*5,flowers:flowerCount,tiles:tiles.length,drawCalls:tiles.length+flowerTiles.length,instancedVertices:tuftCount*grassGeometry.attributes.position.count+flowerCount*flowerGeometry.attributes.position.count};
  group.userData.dispose=()=>{
    for(const mesh of [...tiles,...flowerTiles])mesh.dispose();
    grassGeometry.dispose();flowerGeometry.dispose();grassMaterial.dispose();flowerMaterial.dispose();group.removeFromParent();
  };
  scene.add(group);
  return group;
}

function prepareInstance(mesh){
  mesh.instanceMatrix.needsUpdate=true;
  if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  mesh.receiveShadow=true;
  // Tiny blades receive the tree/building shadows but do not render another
  // large vegetation pass into the sun's shadow map.
  mesh.castShadow=false;
  mesh.computeBoundingBox();mesh.computeBoundingSphere();
  mesh.boundingBox.expandByScalar(.45);mesh.boundingSphere.radius+=.45;
  mesh.userData.decorative=true;
}

function meadowMaterial(time,name,interactors){
  const material=new THREE.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:1,metalness:0,side:THREE.DoubleSide});
  material.name=name;material.forceSinglePass=true;
  material.onBeforeCompile=shader=>{
    // world.js freezes this same clock for Pause Motion / reduced motion. No
    // local animation loop or extra state can accidentally restart the grass.
    shader.uniforms.uMeadowTime=time||{value:0};
    shader.uniforms.uMeadowActors=interactors;
    shader.vertexShader='uniform float uMeadowTime;\nuniform vec4 uMeadowActors[4];\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      vec3 meadowRoot=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz;
      float meadowHeight=length(instanceMatrix[1].xyz);
      float meadowBend=pow(clamp(uv.y,0.,1.),2.);
      float meadowWave=sin(dot(meadowRoot.xz,vec2(.12,.075))-uMeadowTime*.72);
      float meadowRipple=sin(dot(meadowRoot.xz,vec2(.53,-.37))+uMeadowTime*1.25);
      vec3 meadowWind=vec3(.91,0.,.42)*((.10+.16*meadowWave+.035*meadowRipple)*meadowHeight*meadowBend);
      meadowWind.z+=sin(meadowRoot.x*.19-meadowRoot.z*.16-uMeadowTime*.52)*.045*meadowHeight*meadowBend;
      for(int actor=0;actor<4;actor++){
        vec4 field=uMeadowActors[actor];
        vec2 offset=meadowRoot.xz-field.xz;
        float squaredDistance=dot(offset,offset);
        // An airborne rider cannot flatten grass below; a nearby walker or MRI
        // companion bends it away, with a broad, soft falloff and anchored roots.
        if(field.w>.01&&squaredDistance<field.w*field.w&&abs(meadowRoot.y-field.y)<.72){
          float influence=pow(1.-squaredDistance/(field.w*field.w),2.);
          vec2 outward=offset*inversesqrt(max(squaredDistance,.001));
          meadowWind.xz+=outward*influence*.58*meadowHeight*meadowBend;
          meadowWind.y-=influence*.32*meadowHeight*meadowBend;
        }
      }
      // Each tuft has a different yaw; convert the common world-space wind back
      // into instance coordinates so a breeze never blows in random directions.
      transformed+=vec3(
        dot(instanceMatrix[0].xyz,meadowWind)/dot(instanceMatrix[0].xyz,instanceMatrix[0].xyz),
        meadowWind.y/max(meadowHeight,.01),
        dot(instanceMatrix[2].xyz,meadowWind)/dot(instanceMatrix[2].xyz,instanceMatrix[2].xyz)
      );`);
    // Standard double-sided shading flips the deliberately upward-biased blade
    // normals on backfaces. That makes half of a meadow read as black thorns.
    // Treat the thin, translucent blades as one softly lit canopy instead. Keep
    // the same received tree/building shadows and all standard PBR lighting.
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
      vec3 meadowUp=normalize(mat3(viewMatrix)*vec3(0.,1.,0.));
      normal=normalize(meadowUp*.78+normal*faceDirection*.22);
      nonPerturbedNormal=normal;`);
  };
  material.customProgramCacheKey=()=>`${name}-world-wind-soft-canopy-v3`;
  return material;
}

function makeTuft(){
  const positions=[],normals=[],colors=[],uvs=[],indices=[];
  const base=new THREE.Color(0x6f9066),middle=new THREE.Color(0x88a36c),tip=new THREE.Color(0x94ad74),color=new THREE.Color();
  // Five narrow, supple blades with six curve stations. The extra slender
  // silhouettes read as grass close up rather than three broad origami leaves.
  // Fewer tuft centres keep the whole-map vertex budget below one million.
  for(let blade=0;blade<5;blade++){
    const angle=blade*2.399+.24,ca=Math.cos(angle),sa=Math.sin(angle);
    const length=[1,.84,.93,.68,.77][blade],lean=[.08,.10,-.075,.13,-.10][blade],rootX=Math.sin(angle)*.038,rootZ=Math.cos(angle)*.038;
    const first=positions.length/3;
    for(let row=0;row<5;row++){
      const t=row/5,yy=(t-.08*t*t*t)*length,center=lean*t*t;
      const halfWidth=.017*Math.pow(1-t,.80)*(.85+.25*Math.sin(t*Math.PI));
      color.copy(base).lerp(middle,smooth01(t*1.7)).lerp(tip,smooth01((t-.45)/.55)*.68);
      for(const side of [-1,1]){
        const xx=center+side*halfWidth;
        positions.push(rootX+xx*ca,yy,rootZ+xx*sa);
        normals.push(-sa*.38,.925,ca*.38);
        colors.push(color.r,color.g,color.b);uvs.push((side+1)/2,t);
      }
      if(row>0){const a=first+(row-1)*2,b=a+1,c=a+2,d=a+3;indices.push(a,c,b,b,c,d);}
    }
    positions.push(rootX+lean*ca,length*.92,rootZ+lean*sa);normals.push(-sa*.38,.925,ca*.38);colors.push(tip.r,tip.g,tip.b);uvs.push(.5,1);
    indices.push(first+8,first+10,first+9);
  }
  return geometry(positions,normals,colors,uvs,indices);
}

function makeWildflower(){
  const positions=[],normals=[],colors=[],uvs=[],indices=[];
  const green=new THREE.Color(0x709369),cream=new THREE.Color(0xe9e6bd),gold=new THREE.Color(0xd2b566);
  const add=(x,y,z,c,u=0,v=y)=>{positions.push(x,y,z);normals.push(0,1,0);colors.push(c.r,c.g,c.b);uvs.push(u,v);return positions.length/3-1;};
  // A crossed fine stem, two modest leaves, and five folded petals around an
  // ochre centre. No sprite alpha/sorting, high-frequency dots or oversized disks.
  for(let side=0;side<2;side++){
    const a=side*Math.PI/2,c=Math.cos(a),s=Math.sin(a),start=positions.length/3;
    add(-.008*c,0,-.008*s,green);add(.008*c,0,.008*s,green);add(.023*c,.95,.023*s,green);add(.035*c,.95,.035*s,green);
    indices.push(start,start+2,start+1,start+1,start+2,start+3);
  }
  for(const sign of [-1,1]){
    const a=add(.015,.42,0,green),b=add(sign*.105,.66,.025,green),c=add(sign*.07,.49,-.018,green);indices.push(a,b,c);
  }
  for(let petal=0;petal<5;petal++){
    const angle=petal*Math.PI*2/5,ca=Math.cos(angle),sa=Math.sin(angle),r=.061;
    const a=add(.026,.96,0,cream),b=add(.026+ca*r-sa*.026,1,sa*r+ca*.026,cream),c=add(.026+ca*r*1.20,1.015,sa*r*1.20,cream),d=add(.026+ca*r+sa*.026,1,sa*r-ca*.026,cream);
    indices.push(a,b,c,a,c,d);
  }
  const centre=add(.026,.984,0,gold);
  for(let i=0;i<6;i++){const a=i*Math.PI/3,b=(i+1)*Math.PI/3;indices.push(centre,add(.026+Math.cos(a)*.019,.984,Math.sin(a)*.019,gold),add(.026+Math.cos(b)*.019,.984,Math.sin(b)*.019,gold));}
  return geometry(positions,normals,colors,uvs,indices);
}

function geometry(positions,normals,colors,uvs,indices){
  const result=new THREE.BufferGeometry();
  result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  result.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  result.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  result.setIndex(indices);result.computeBoundingBox();result.computeBoundingSphere();
  return result;
}

function smooth01(value){const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);}
