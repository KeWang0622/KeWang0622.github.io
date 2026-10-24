import * as THREE from './lib/three.module.js';

// Shared by the river and pond. Their vertices already use world coordinates;
// the same low-amplitude wave field supplies geometry and per-fragment normals.
// Fragment normals keep broad pond triangles from looking like rigid glass.
const waterField = /* glsl */ `
  uniform float uWaterTime;
  vec3 villageWaterField(vec2 p) {
    float a = dot(p, vec2(.90, .40)) + uWaterTime * .62;
    float b = dot(p, vec2(1.80, -1.20)) - uWaterTime * .79;
    float c = dot(p, vec2(3.10, 2.20)) + uWaterTime * .47;
    float h = .009 * sin(a) + .005 * sin(b) + .002 * sin(c);
    vec2 slope = .009 * cos(a) * vec2(.90, .40)
               + .005 * cos(b) * vec2(1.80, -1.20)
               + .002 * cos(c) * vec2(3.10, 2.20);
    return vec3(h, slope);
  }
`;

export function createPainterlyWater(windUniform,pond) {
  const material = new THREE.MeshPhysicalMaterial({
    color: 0x4e9295,
    roughness: .30,
    metalness: 0,
    clearcoat: .36,
    clearcoatRoughness: .28,
    reflectivity: .35,
    dithering: true
  });
  material.name = 'Quiet teal water · soft reflected sky';
  material.customProgramCacheKey = () => 'village-painterly-water-v2';
  material.onBeforeCompile = shader => {
    shader.uniforms.uWaterTime = windUniform;
    // THREE.Color converts authored sRGB colours to the linear working space.
    shader.uniforms.uWaterSky = { value: new THREE.Color(0xb8d7d7) };
    shader.uniforms.uWaterShallow = { value: new THREE.Color(0x8bb6a5) };
    shader.uniforms.uPond = { value: new THREE.Vector4(pond.x,pond.z,pond.rx,pond.rz) };
    shader.vertexShader = `${waterField}\nvarying vec3 vWaterWorld;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       vec3 waterBaseWorld = (modelMatrix * vec4(position, 1.0)).xyz;
       transformed.y += villageWaterField(waterBaseWorld.xz).x;
       vWaterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`
    );

    shader.fragmentShader = `${waterField}\nvarying vec3 vWaterWorld;\nuniform vec3 uWaterSky, uWaterShallow;\nuniform vec4 uPond;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       // Colour follows the actual irregular pond outline and the river bank.
       vec2 pondUV=(vWaterWorld.xz-uPond.xy)/uPond.zw;
       float pondAngle=atan(pondUV.y,pondUV.x);
       float pondEdge=length(pondUV)/(1.+.08*sin(pondAngle*3.)+.04*cos(pondAngle*5.));
       float riverEdge=abs(vWaterWorld.z-(-5.5+sin(vWaterWorld.x*.12)*2.))/1.45;
       float waterEdge=pondEdge<1.4?pondEdge:riverEdge;
       diffuseColor.rgb=mix(diffuseColor.rgb,uWaterShallow,smoothstep(.38,1.03,waterEdge)*.72);
       // Large, quiet tonal patches suggest reflected air without noisy foam.
       float waterPatch = sin(vWaterWorld.x * .24 + vWaterWorld.z * .36)
                        * sin(vWaterWorld.z * .21 - uWaterTime * .035);
       diffuseColor.rgb *= 1.0 + waterPatch * .055;`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       vec3 waterSlope = villageWaterField(vWaterWorld.xz);
       vec3 waterWorldNormal = normalize(vec3(-waterSlope.y, 1.0, -waterSlope.z));
       normal = normalize((viewMatrix * vec4(waterWorldNormal, 0.0)).xyz);`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <clearcoat_normal_fragment_maps>',
      `#include <clearcoat_normal_fragment_maps>
       #ifdef USE_CLEARCOAT
         clearcoatNormal = normal;
       #endif`
    );
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      `float waterFacing = clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
       float waterFresnel = pow(1.0 - waterFacing, 3.0);
       // A restrained painted sky reflection; retain lighting and bank shadows.
       outgoingLight = mix(outgoingLight, uWaterSky, .035 + .16 * waterFresnel);
       #include <opaque_fragment>`
    );
  };
  return material;
}
