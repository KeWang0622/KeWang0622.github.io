// One slow cloud field across the village. This changes direct sunlight only;
// ambient illumination, baked occlusion and the authored material remain intact.
const wrappedMaterials = new WeakMap();
const CLOUD_VERSION = 'landscape-cloud-light-v1';

const worldPosition = `
  vec4 landscapePosition = vec4(transformed, 1.0);
  #ifdef USE_BATCHING
    landscapePosition = batchingMatrix * landscapePosition;
  #endif
  #ifdef USE_INSTANCING
    landscapePosition = instanceMatrix * landscapePosition;
  #endif
  vLandscapeXZ = (modelMatrix * landscapePosition).xz;
`;

const cloudFunctions = `
  uniform float uLandscapeCloudTime;
  varying vec2 vLandscapeXZ;
  float landscapeCloudHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }
  float landscapeCloudField(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    // Smooth, single-scale cloud masses. No fine noise or directional bands.
    vec2 blend = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    float a = landscapeCloudHash(cell);
    float b = landscapeCloudHash(cell + vec2(1.0, 0.0));
    float c = landscapeCloudHash(cell + vec2(0.0, 1.0));
    float d = landscapeCloudHash(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, blend.x), mix(c, d, blend.x), blend.y);
  }
`;

const cloudLighting = `
  // A 28 m field drifting at about 0.19 m/s, shared by terrain and buildings.
  vec2 landscapeCloudUV = vLandscapeXZ / 28.0
    + vec2(.006, .003) * uLandscapeCloudTime + vec2(3.7, 8.2);
  float landscapeCloudCover = smoothstep(.38, .80, landscapeCloudField(landscapeCloudUV));
  float landscapeSunlight = 1.0 - .14 * landscapeCloudCover;
  reflectedLight.directDiffuse *= landscapeSunlight;
  reflectedLight.directSpecular *= landscapeSunlight;
  #ifdef USE_CLEARCOAT
    clearcoatSpecularDirect *= landscapeSunlight;
  #endif
  #ifdef USE_SHEEN
    sheenSpecularDirect *= landscapeSunlight;
  #endif
`;

/**
 * Apply to the outdoor scene (or an outdoor subtree). Safe to call again after
 * asynchronously adding objects: shared materials are wrapped exactly once.
 * The same mutable { value: seconds } uniform as the foliage animation keeps
 * cloud motion frozen whenever the site's Pause motion setting is enabled.
 */
export function applyLandscapeLight(scene, windUniform) {
  if (!scene?.traverse || !windUniform || typeof windUniform.value !== 'number') return 0;
  let count = 0;
  scene.traverse(object => {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      if (!material || !(material.isMeshStandardMaterial || material.isMeshPhysicalMaterial)) continue;
      if (/^Quiet teal water/i.test(material.name) || material.userData?.skipLandscapeLight) continue;
      const existing = wrappedMaterials.get(material);
      if (existing) {
        existing.time = windUniform;
        for (const shader of existing.shaders) shader.uniforms.uLandscapeCloudTime = windUniform;
        continue;
      }
      const previousCompile = material.onBeforeCompile;
      // Evaluate before replacing onBeforeCompile: Three's default cache key
      // contains that hook's source, including any existing foliage/ground work.
      const previousKey = material.customProgramCacheKey?.() || '';
      const binding = { time: windUniform, shaders: new Set() };
      wrappedMaterials.set(material, binding);
      material.onBeforeCompile = function(shader, renderer) {
        previousCompile?.call(this, shader, renderer);
        const vertexAnchor = '#include <worldpos_vertex>';
        const fragmentAnchor = '#include <lights_fragment_end>';
        // A custom standard shader may replace these chunks entirely. Preserve
        // that shader rather than silently producing invalid GLSL.
        if (!shader.vertexShader.includes(vertexAnchor) || !shader.fragmentShader.includes(fragmentAnchor)) return;
        shader.uniforms.uLandscapeCloudTime = binding.time;
        shader.vertexShader = 'varying vec2 vLandscapeXZ;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(vertexAnchor, vertexAnchor + '\n' + worldPosition);
        shader.fragmentShader = cloudFunctions + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(fragmentAnchor, fragmentAnchor + '\n' + cloudLighting);
        binding.shaders.add(shader);
      };
      material.customProgramCacheKey = () => `${previousKey}|${CLOUD_VERSION}`;
      material.needsUpdate = true;
      count++;
    }
  });
  return count;
}
