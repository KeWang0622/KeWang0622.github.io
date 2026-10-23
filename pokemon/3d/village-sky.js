import * as THREE from './lib/three.module.js';

// A quiet painted sky: a warm horizon, blue upper air, and soft cloud banks.
// One draw call, no downloaded texture, no animation competing with navigation.
export function createVillageSky(){
  const material=new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{zenith:{value:new THREE.Color(0x8dbcd2)},horizon:{value:new THREE.Color(0xdce7d8)},cloud:{value:new THREE.Color(0xfff5df)}},
    vertexShader:`varying vec3 vSky;void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`
      varying vec3 vSky;uniform vec3 zenith,horizon,cloud;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      float bank(vec2 p){return noise(p)*.56+noise(p*2.07)*.27+noise(p*4.13)*.12+noise(p*8.23)*.05;}
      void main(){
        vec3 d=normalize(vSky);float h=max(d.y,0.);
        vec3 colour=mix(horizon,zenith,smoothstep(0.,.68,h));
        vec2 p=d.xz/max(.12,h)*1.7;
        float clouds=smoothstep(.50,.71,bank(p))*smoothstep(.025,.13,h)*(1.-smoothstep(.62,.95,h));
        float shade=smoothstep(.36,.69,bank(p+vec2(.12,.08)));
        colour=mix(colour,mix(horizon,cloud,.66+.34*shade),clouds*.88);
        float glow=pow(max(dot(d,normalize(vec3(-18.,34.,20.))),0.),18.);
        colour=mix(colour,cloud,glow*.13);
        gl_FragColor=vec4(colour,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  const sky=new THREE.Mesh(new THREE.SphereGeometry(850,24,16),material);
  sky.name='Soft daylight and cloud banks';sky.renderOrder=-100;sky.frustumCulled=false;
  return sky;
}
