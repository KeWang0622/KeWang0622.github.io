import * as THREE from './lib/three.module.js';

export const FIRST_PERSON_FOV=64;
const walkingEye=new THREE.Vector3(0,1.67,.07);

// The local eye belongs to the authored seat, not to a world-space guess.
// Heading remains horizontal on bridge ramps so the horizon does not roll.
export function firstPersonPose({trainer,mount,lookYaw=0,lookPitch=-.10},eye,look){
  eye.copy(mount?.camera?.eye||walkingEye);
  (mount?.group||trainer).localToWorld(eye);
  const yaw=trainer.rotation.y+lookYaw;
  const pitch=THREE.MathUtils.clamp(lookPitch,-.85,.7);
  look.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)).add(eye);
  return {eye,look};
}
