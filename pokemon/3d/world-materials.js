import * as THREE from './lib/three.module.js';

// Authored, deterministic surface studies: broad pigment variation remains
// visible at the exploration camera, with quiet detail when the player approaches.
// Colour is sRGB; height/roughness remain linear data.
export function createWorldMaterials(renderer) {
  const textures = [], materials = [];
  const anisotropy = Math.max(1, Math.min(4, renderer?.capabilities?.getMaxAnisotropy?.() || 1));
  const tau = Math.PI * 2;
  function random(seed) {
    return () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  }
  function canvas(width, height) {
    const element = document.createElement('canvas');
    element.width = width; element.height = height;
    return element;
  }
  function texture(element, color = true) {
    const map = new THREE.CanvasTexture(element);
    map.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = anisotropy;
    map.minFilter = THREE.LinearMipmapLinearFilter;
    textures.push(map);
    return map;
  }
  function material(options) {
    const m = new THREE.MeshStandardMaterial(options);
    materials.push(m);
    return m;
  }
  function pixels(width, height, draw) {
    const c = canvas(width, height), ctx = c.getContext('2d');
    const image = ctx.createImageData(width, height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const rgb = draw(x / width, y / height, x, y), offset = (y * width + x) * 4;
      image.data[offset] = rgb[0]; image.data[offset + 1] = rgb[1]; image.data[offset + 2] = rgb[2]; image.data[offset + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    return c;
  }
  const woodNoise = random(6241), grain = new Float32Array(512 * 256);
  const woodColor = pixels(512, 256, (u, v, x, y) => {
    // Grain follows the long axis of each plank. Integer frequencies make both
    // edges periodic; low contrast avoids repeated zebra stripes at a distance.
    const bend = .12 * Math.sin(tau * u) + .045 * Math.sin(tau * u * 3);
    const broad = Math.sin(tau * (v * 7 + bend));
    const fiber = Math.sin(tau * (v * 31 + bend * 1.8 + .025 * Math.sin(tau * u * 5)));
    const pores = Math.max(0, Math.sin(tau * (v * 83 + bend * 3))) ** 12;
    const worn = Math.sin(tau * (u * 2 + v)) * .15;
    const value = broad * .36 + fiber * .12 - pores * .10 + worn + (woodNoise() - .5) * .07;
    grain[y * 512 + x] = value;
    return [242 + value * 13, 239 + value * 12, 231 + value * 10];
  });
  const woodHeight = pixels(512, 256, (_, __, x, y) => {
    const value = 128 + grain[y * 512 + x] * 29;
    return [value, value, value];
  });
  const woodRoughness = pixels(512, 256, (_, __, x, y) => {
    const value = 227 - grain[y * 512 + x] * 12;
    return [value, value, value];
  });
  const woodMap = texture(woodColor), woodBump = texture(woodHeight, false), woodRough = texture(woodRoughness, false);
  const bridgeWood = material({ color: 0xbba17d, map: woodMap, bumpMap: woodBump, bumpScale: .007, roughnessMap: woodRough, roughness: .93 });
  bridgeWood.name = 'Sun-bleached oak';
  const bridgeWoodLight = material({ color: 0xcbb18c, map: woodMap, bumpMap: woodBump, bumpScale: .007, roughnessMap: woodRough, roughness: .93 });
  bridgeWoodLight.name = 'Sun-bleached oak · light';

  const gravelNoise = random(1327);
  const gravelCanvas = pixels(256, 256, (u, v) => {
    // Low-frequency mineral washes keep the road legible without a noisy gravel carpet.
    const wash = Math.sin(tau * (u + v)) * 2.8 + Math.cos(tau * (u * 2 - v)) * 1.9;
    const value = 246 + wash + (gravelNoise() - .5) * 5;
    return [value, value - 1, value - 4];
  });
  const gravelContext = gravelCanvas.getContext('2d');
  for (let i = 0; i < 310; i++) {
    const x = gravelNoise() * 256, y = gravelNoise() * 256, r = .35 + gravelNoise() * 1.1;
    gravelContext.fillStyle = i % 3 ? 'rgba(126,116,90,.08)' : 'rgba(255,255,248,.30)';
    // Draw wrapped copies, so larger surfaces never reveal a tile seam.
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
      gravelContext.beginPath(); gravelContext.ellipse(x + dx, y + dy, r * 1.45, r, i * .71, 0, tau); gravelContext.fill();
    }
  }
  const gravelMap = texture(gravelCanvas), gravelBump = texture(gravelCanvas, false);
  const pathGravel = material({ color: 0xe4d4af, map: gravelMap, bumpMap: gravelBump, bumpScale: .006, roughness: 1, transparent: true, depthWrite: false });
  pathGravel.name = 'Ivory limestone footpath · feathered verge';
  pathGravel.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec2 vLaneUV;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvLaneUV = uv;');
    shader.fragmentShader = 'varying vec2 vLaneUV;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float laneEdge = min(vLaneUV.x, 1.0 - vLaneUV.x);
      float vergeIrregularity = sin(vLaneUV.y * 5.1 + vLaneUV.x * 10.0) * .012
        + sin(vLaneUV.y * 13.7 - vLaneUV.x * 19.0) * .006;
      diffuseColor.a *= smoothstep(.008, .095, laneEdge + vergeIrregularity);
      float wornCentre = smoothstep(.02, .35, laneEdge);
      diffuseColor.rgb *= mix(.95, 1.025, wornCentre);
    `);
  };
  pathGravel.customProgramCacheKey = () => 'village-ivory-verge-v2';

  const grassNoise = random(9017);
  const grassCanvas = pixels(256, 256, (u, v) => {
    const patch = Math.sin(tau * u) * Math.sin(tau * v) * 3 + Math.cos(tau * (u * 3 + v * 2)) * 2;
    const value = 128 + patch + (grassNoise() - .5) * 8;
    return [value, value, value];
  });
  const grassContext = grassCanvas.getContext('2d');
  grassContext.lineWidth = .7;
  for (let i = 0; i < 420; i++) {
    const x = grassNoise() * 256, y = grassNoise() * 256, length = 1 + grassNoise() * 2.7, dx = (grassNoise() - .5) * 1.7;
    grassContext.strokeStyle = i % 2 ? 'rgba(167,167,167,.22)' : 'rgba(91,91,91,.18)';
    for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
      grassContext.beginPath(); grassContext.moveTo(x + ox, y + oy); grassContext.lineTo(x + ox + dx, y + oy - length); grassContext.stroke();
    }
  }
  const grassDetail = texture(grassCanvas, false);
  const meadowPaint = { value: grassDetail }, meadowPaintStrength = { value: 0 };
  const meadowPaintScale = { value: .125 };
  const terrainGrass = material({ vertexColors: true, roughness: 1 });
  terrainGrass.name = 'Painted meadow · world-space pigment';
  terrainGrass.onBeforeCompile = shader => {
    shader.uniforms.uMeadowDetail = { value: grassDetail };
    shader.uniforms.uMeadowPaint = meadowPaint;
    shader.uniforms.uMeadowPaintStrength = meadowPaintStrength;
    shader.uniforms.uMeadowPaintScale = meadowPaintScale;
    shader.vertexShader = 'varying vec2 vMeadowXZ;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvMeadowXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = `uniform sampler2D uMeadowDetail;
      uniform sampler2D uMeadowPaint;
      uniform float uMeadowPaintStrength;
      uniform float uMeadowPaintScale;
      varying vec2 vMeadowXZ;
    ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>
      float meadowDetail = texture2D(uMeadowDetail, vMeadowXZ * .62).r;
      float meadowWash = sin(vMeadowXZ.x * .33 + vMeadowXZ.y * .21)
        * cos(vMeadowXZ.y * .28 - vMeadowXZ.x * .17);
      float sunlitPatch = smoothstep(-.55, .70, meadowWash);
      // Broad cool-to-warm brushwork, not a repeated mottled noise field.
      diffuseColor.rgb *= mix(vec3(.91, .96, .96), vec3(1.065, 1.025, .94), sunlitPatch);
      diffuseColor.rgb *= .97 + meadowDetail * .06;
      vec3 meadowPaint = texture2D(uMeadowPaint, vMeadowXZ * uMeadowPaintScale).rgb;
      float meadowLuma = dot(meadowPaint, vec3(.2126, .7152, .0722));
      float pigmentValue = clamp(meadowLuma * 2.8, .68, 1.25);
      diffuseColor.rgb *= mix(1.0, pigmentValue, uMeadowPaintStrength);
    `);
  };
  terrainGrass.customProgramCacheKey = () => 'village-meadow-pigment-v2';
  // Caller owns an optional image texture. A shared uniform makes loading async
  // without recompiling the terrain or changing its navigation geometry.
  function setMeadowMap(map, { strength = .48, scale = .125 } = {}) {
    if (!map) { meadowPaint.value = grassDetail; meadowPaintStrength.value = 0; return; }
    map.colorSpace = THREE.SRGBColorSpace;
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.anisotropy = anisotropy;
    map.needsUpdate = true;
    meadowPaint.value = map;
    meadowPaintStrength.value = Math.max(0, Math.min(1, strength));
    meadowPaintScale.value = Math.max(.001, scale);
  }
  const stoneNoise = random(8319), mineral = new Float32Array(256 * 256);
  const stoneHeightCanvas = pixels(256, 256, (u, v, x, y) => {
    const value = Math.sin(tau * (u * 3 + v * 2)) * 3 + Math.cos(tau * (u * 7 - v * 5)) * 2 + (stoneNoise() - .5) * 9;
    mineral[y * 256 + x] = value;
    return [128 + value, 128 + value, 128 + value];
  });
  const stoneRoughCanvas = pixels(256, 256, (_, __, x, y) => {
    const value = 232 - mineral[y * 256 + x] * .5;
    return [value, value, value];
  });
  // Reuse on cloned rock materials; keep the authored diffuse colours intact.
  const stoneBump = texture(stoneHeightCanvas, false), stoneRoughness = texture(stoneRoughCanvas, false);
  return {
    bridgeWood, bridgeWoodLight, terrainGrass, pathGravel, stoneBump, stoneRoughness, setMeadowMap,
    dispose() { for (const m of materials) m.dispose(); for (const t of textures) t.dispose(); }
  };
}
