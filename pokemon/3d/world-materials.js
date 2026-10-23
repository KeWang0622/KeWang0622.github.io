import * as THREE from './lib/three.module.js';

// Small, deterministic surface studies. Colour is sRGB; height/roughness remain
// linear data. The sculpted shapes and lighting still do most of the work.
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
    const value = broad * .32 + fiber * .17 - pores * .16 + (woodNoise() - .5) * .12;
    grain[y * 512 + x] = value;
    return [235 + value * 10, 230 + value * 11, 219 + value * 12];
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
  const bridgeWood = material({ color: 0xc8aa79, map: woodMap, bumpMap: woodBump, bumpScale: .010, roughnessMap: woodRough, roughness: .93 });
  bridgeWood.name = 'Weathered honey timber';
  const bridgeWoodLight = material({ color: 0xd4b78a, map: woodMap, bumpMap: woodBump, bumpScale: .010, roughnessMap: woodRough, roughness: .93 });
  bridgeWoodLight.name = 'Weathered honey timber · light';

  const gravelNoise = random(1327);
  const gravelCanvas = pixels(256, 256, () => {
    const value = 237 + (gravelNoise() - .5) * 13;
    return [value, value, value - 2];
  });
  const gravelContext = gravelCanvas.getContext('2d');
  for (let i = 0; i < 440; i++) {
    const x = gravelNoise() * 256, y = gravelNoise() * 256, r = .35 + gravelNoise() * 1.1;
    gravelContext.fillStyle = i % 3 ? 'rgba(113,105,84,.12)' : 'rgba(255,255,248,.50)';
    // Draw wrapped copies, so larger surfaces never reveal a tile seam.
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
      gravelContext.beginPath(); gravelContext.ellipse(x + dx, y + dy, r * 1.45, r, i * .71, 0, tau); gravelContext.fill();
    }
  }
  const gravelMap = texture(gravelCanvas), gravelBump = texture(gravelCanvas, false);
  const pathGravel = material({ color: 0xd7c4a1, map: gravelMap, bumpMap: gravelBump, bumpScale: .012, roughness: .98 });
  pathGravel.name = 'Fine warm limestone gravel';

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
  const terrainGrass = material({ vertexColors: true, roughness: .98 });
  terrainGrass.name = 'Meadow microtexture · world space';
  terrainGrass.onBeforeCompile = shader => {
    shader.uniforms.uMeadowDetail = { value: grassDetail };
    shader.vertexShader = 'varying vec2 vMeadowXZ;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvMeadowXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = 'uniform sampler2D uMeadowDetail;\nvarying vec2 vMeadowXZ;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\nfloat meadowDetail = texture2D(uMeadowDetail, vMeadowXZ * .62).r;\ndiffuseColor.rgb *= .94 + meadowDetail * .12;');
  };
  terrainGrass.customProgramCacheKey = () => 'village-meadow-detail-v1';
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
    bridgeWood, bridgeWoodLight, terrainGrass, pathGravel, stoneBump, stoneRoughness,
    dispose() { for (const m of materials) m.dispose(); for (const t of textures) t.dispose(); }
  };
}
