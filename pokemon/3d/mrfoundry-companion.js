import * as THREE from './lib/three.module.js';

// The same approved alpha artwork is used by the website, follower and backpack.
// A billboard preserves the exact character identity from every camera angle.
export const MRFOUNDRY_MASCOT_URL = new URL('../../assets/img/mri-mascot-trimmed.png', import.meta.url).href;
export function createMRFoundryCompanion(texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.SpriteMaterial({map: texture, transparent: true, alphaTest: .01, depthWrite: false, toneMapped: false});
  const sprite = new THREE.Sprite(material);
  const {width, height} = texture.image;
  sprite.name = 'Approved MRFoundry MRI mascot';
  sprite.scale.set(width / height, 1, 1);
  sprite.position.y = .5;
  const group = new THREE.Group();
  group.name = 'MRFoundry MRI Scout';
  group.add(sprite);
  return group;
}
export async function loadMRFoundryCompanion() {
  return createMRFoundryCompanion(await new THREE.TextureLoader().loadAsync(MRFOUNDRY_MASCOT_URL));
}
