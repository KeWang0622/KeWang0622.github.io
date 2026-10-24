import * as THREE from './lib/three.module.js';

// Keep the authored leaf atlas. Broad, shared gusts use each tree's world
// position; the depth material applies exactly the same displacement.
export function styleFoliage(material, wind, geometry) {
  geometry.computeBoundingBox();
  const height=Math.max(.1,geometry.boundingBox.max.y);
  const declarations='uniform float uLeafWind; uniform float uCanopyHeight;\n';
  const motion=`
    vec3 treeRoot=vec3(0.);
    #ifdef USE_INSTANCING
      treeRoot=instanceMatrix[3].xyz;
    #endif
    float canopyAmount=clamp(position.y/uCanopyHeight,0.,1.);
    float gust=sin(uLeafWind*.72+dot(treeRoot.xz,vec2(.12,.075)));
    float flutter=sin(uLeafWind*1.6+position.x*1.2+position.z*.6+treeRoot.x*.3);
    transformed.x+=(gust*.055+flutter*.012)*canopyAmount;
    transformed.z+=cos(uLeafWind*.48+treeRoot.z*.13)*.028*canopyAmount;
  `;
  function vertex(shader) {
    shader.uniforms.uLeafWind=wind;
    shader.uniforms.uCanopyHeight={value:height};
    shader.vertexShader=declarations+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+motion);
  }
  material.side=THREE.DoubleSide;
  material.alphaTest=Math.max(material.alphaTest,.3);
  material.transparent=false;
  material.roughness=1;
  material.onBeforeCompile=shader=>{
    vertex(shader);
    shader.vertexShader='varying float vCanopyHeight;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCanopyHeight=clamp(position.y/uCanopyHeight,0.,1.);');
    shader.fragmentShader='varying float vCanopyHeight;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
      float leafValue=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));
      ${/TwistedTree/i.test(material.name)?'diffuseColor.rgb=vec3(.19,.32,.13)*clamp(leafValue*7.5,.55,1.45); leafValue=dot(diffuseColor.rgb,vec3(.2126,.7152,.0722));':''}
      // Keep the painted atlas and its internal shading; broad colour masses
      // make the upper canopy warm, with a cooler sheltered underside.
      diffuseColor.rgb=mix(vec3(leafValue),diffuseColor.rgb,.83);
      float canopyTip=smoothstep(.28,.96,vCanopyHeight);
      diffuseColor.rgb*=mix(vec3(.86,.98,1.06),vec3(1.16,1.07,.87),canopyTip);
    `);
    // Leaves are thin surfaces. Lighting the back of a card as opaque geometry
    // creates dark rectangular cutouts when viewed from the opposite side.
    // Cancel only the backface flip and gently bias toward the sky. Alpha and
    // the authored silhouette still come from the original texture.
    shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
      vec3 leafSkyNormal=normalize(mat3(viewMatrix)*vec3(0.,1.,0.));
      normal=normalize(normal*faceDirection*.82+leafSkyNormal*.18);
      nonPerturbedNormal=normal;`);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
      // A small, bounded transmission fill keeps deep leaf layers readable.
      // Received shadows and the world sunlight/cloud field remain intact.
      outgoingLight+=diffuseColor.rgb*mix(vec3(.058,.067,.074),vec3(.105,.094,.066),canopyTip);
      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>`painted-foliage-v3-${/TwistedTree/i.test(material.name)}-${height}`;
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:material.map,alphaMap:material.alphaMap,alphaTest:material.alphaTest,side:THREE.DoubleSide});
  depth.onBeforeCompile=vertex;
  depth.customProgramCacheKey=()=>`painted-foliage-depth-v1-${height}`;
  return depth;
}
