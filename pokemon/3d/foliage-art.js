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
      // Restrain atlas saturation and let cool lower foliage support warm tips.
      diffuseColor.rgb=mix(vec3(leafValue),diffuseColor.rgb,.76);
      diffuseColor.rgb*=mix(vec3(.80,.98,1.09),vec3(1.12,1.06,.86),smoothstep(.2,1.,vCanopyHeight));
    `);
    shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`outgoingLight+=diffuseColor.rgb*.085;
      #include <opaque_fragment>`);
  };
  material.customProgramCacheKey=()=>`painted-foliage-v2-${/TwistedTree/i.test(material.name)}-${height}`;
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,map:material.map,alphaMap:material.alphaMap,alphaTest:material.alphaTest,side:THREE.DoubleSide});
  depth.onBeforeCompile=vertex;
  depth.customProgramCacheKey=()=>`painted-foliage-depth-v1-${height}`;
  return depth;
}
