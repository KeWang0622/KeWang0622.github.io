// Follow the player's stable world anchor continuously. The caller supplies a
// pelvis/seat anchor rather than an animated head or mesh, so footsteps, wing
// beats and suspension cannot shake the camera. Move eye and look-at together
// using this focus; heading, viewing angle and zoom never belong to this step.
// Fixed-angle follow reference: https://github.com/brunosimon/folio-2025/blob/main/sources/Game/View.js
export function updateCenteredFocus(focus,target,{
  dt=1/60,sharpness=10,heightSharpness=8
}={}){
  if(![focus.x,focus.y,focus.z,target.x,target.y,target.z,dt,sharpness,
    heightSharpness].every(Number.isFinite)||dt<=0||sharpness<=0||
    heightSharpness<=0)return false;
  // Exponential damping has the same response across normal frame rates, unlike
  // a per-frame lerp. A resumed background tab cannot cause a one-frame jump.
  const elapsed=Math.min(dt,.05);
  const horizontal=-Math.expm1(-sharpness*elapsed);
  const vertical=-Math.expm1(-heightSharpness*elapsed);
  let changed=false;
  for(const axis of ['x','y','z']){
    const delta=target[axis]-focus[axis];
    if(delta===0)continue;
    // Only snap sub-pixel numerical residue; there is no visible dead zone.
    focus[axis]=Math.abs(delta)<1e-7?target[axis]:
      focus[axis]+delta*(axis==='y'?vertical:horizontal);
    changed=true;
  }
  return changed;
}

// Legacy edge-only framing, retained for explicit overview/compatibility uses.
// A fixed-orientation camera only translates when the player's ground position
// leaves its central window. Height, heading, ride choice and animation never
// affect framing. The window is expressed in the camera's ground-plane basis.
export function updateStableFocus(focus,point,{
  yaw,pitch,distance,fov,aspect,dt=1/60,
  halfWidth=.33,halfHeight=.26,maxSpeed=10
}={}){
  if(![focus.x,focus.z,point.x,point.z,yaw,pitch,distance,fov,aspect,dt,
    halfWidth,halfHeight,maxSpeed].every(Number.isFinite)||dt<=0||distance<=0||
    aspect<=0||fov<=0||fov>=180||halfWidth<0||halfHeight<0||maxSpeed<=0)return false;
  const span=distance*Math.tan(fov*Math.PI/360);
  const width=span*aspect*halfWidth;
  const depth=span*halfHeight/Math.max(.02,Math.abs(Math.sin(pitch)));
  const sin=Math.sin(yaw),cos=Math.cos(yaw),dx=point.x-focus.x,dz=point.z-focus.z;
  const across=cos*dx-sin*dz,along=sin*dx+cos*dz;
  const excess=(value,limit)=>Math.sign(value)*Math.max(0,Math.abs(value)-limit);
  const moveAcross=excess(across,width),moveAlong=excess(along,depth);
  const length=Math.hypot(moveAcross,moveAlong);
  if(length<1e-9)return false;
  // Limit translation directly; there is no velocity or lerp target to keep
  // drifting after the player is back inside the window. Cap suspended frames.
  const step=Math.min(1,Math.min(dt,.05)*maxSpeed/length);
  focus.x+=(cos*moveAcross+sin*moveAlong)*step;
  focus.z+=(-sin*moveAcross+cos*moveAlong)*step;
  return true;
}

// Flight has a separate outer vertical window. Raise/lower the camera only
// when the subject would otherwise leave the frame; do not follow each wing
// beat or recenter on the rider. Rotation and zoom remain untouched.
export function updateStableHeight(focus,point,{
  yaw,pitch,distance,fov,dt=1/60,maxSpeed=8,halfHeight=.65
}={}){
  if(![focus.x,focus.y,focus.z,point.x,point.y,point.z,yaw,pitch,distance,fov,
    dt,maxSpeed,halfHeight].every(Number.isFinite)||dt<=0||distance<=0||
    fov<=0||fov>=180||maxSpeed<=0||halfHeight<=0||halfHeight>=1)return false;
  const sin=Math.sin(pitch),cos=Math.cos(pitch),tan=Math.tan(fov*Math.PI/360);
  const along=(point.x-focus.x)*Math.sin(yaw)+(point.z-focus.z)*Math.cos(yaw);
  const dy=point.y-focus.y,depth=distance-along*cos-dy*sin;
  const vertical=-along*sin+dy*cos;
  if(depth>0&&Math.abs(vertical)<=halfHeight*depth*tan+1e-9)return false;
  // Translating the eye and target by h changes vertical by -h*cos(pitch)
  // and depth by +h*sin(pitch). Solve the nearest boundary without changing
  // the camera's viewing direction or field of view.
  const boundary=Math.sign(vertical||1)*halfHeight;
  const denominator=cos+boundary*sin*tan;
  if(Math.abs(denominator)<1e-8)return false;
  const shift=(vertical-boundary*depth*tan)/denominator;
  const maxStep=Math.min(dt,.05)*maxSpeed;
  if(Math.abs(shift)<1e-9)return false;
  focus.y+=Math.max(-maxStep,Math.min(maxStep,shift));
  return true;
}
