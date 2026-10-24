// Conservative height envelopes built from the actual rendered landscape.
// Wing clearance is separate from pedestrian/vehicle collision: flight can
// cross water and roofs, but cannot pass through them or leave the world.
export const FLIGHT = Object.freeze({radius:3.35, clearance:1.0, cruise:6.5, minCruise:2, maxCruise:30, climb:5, descend:3});
export function createFlightEnvelope(boxes,{limit=64,cell=1,radius=FLIGHT.radius}={}) {
  const n=Math.ceil(limit*2/cell)+1,heights=new Float32Array(n*n);heights.fill(-Infinity);
  for(const b of boxes){
    const x0=Math.max(0,Math.floor((b.minX-radius+limit)/cell)),x1=Math.min(n-1,Math.ceil((b.maxX+radius+limit)/cell));
    const z0=Math.max(0,Math.floor((b.minZ-radius+limit)/cell)),z1=Math.min(n-1,Math.ceil((b.maxZ+radius+limit)/cell));
    for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)heights[z*n+x]=Math.max(heights[z*n+x],b.top);
  }
  return (x,z)=>{const ix=Math.max(0,Math.min(n-1,Math.round((x+limit)/cell))),iz=Math.max(0,Math.min(n-1,Math.round((z+limit)/cell)));return heights[iz*n+ix];};
}
export function stepFlight(position,next,{dt,ground,ceiling,cruise=FLIGHT.cruise,landing=false,limit=64}){
  const safe=limit-FLIGHT.radius;
  const x=Math.max(-safe,Math.min(safe,next.x)),z=Math.max(-safe,Math.min(safe,next.z));
  const length=Math.hypot(x-position.x,z-position.z),steps=Math.max(1,Math.ceil(length/.18));
  let floor=-Infinity;
  for(let i=0;i<=steps;i++){const t=i/steps,px=position.x+(x-position.x)*t,pz=position.z+(z-position.z)*t;floor=Math.max(floor,ground(px,pz)+FLIGHT.minCruise,ceiling(px,pz)+FLIGHT.clearance);}
  const target=landing?ground(position.x,position.z):Math.max(ground(x,z)+cruise,floor);
  const dy=Math.max(-FLIGHT.descend*dt,Math.min(FLIGHT.climb*dt,target-position.y));
  const y=position.y+dy,clear=!landing&&y>=floor-.02;
  return {x:clear?x:position.x,y,z:clear?z:position.z,blocked:!clear&&length>1e-6,landed:landing&&Math.abs(y-target)<.025};
}
export function findLandingSpot(point,{shape,clear,ground,ceiling,limit=64,maxRadius=22}){
  for(let r=0;r<=maxRadius;r+=.8){const count=r?Math.ceil(Math.PI*2*r/.8):1;for(let i=0;i<count;i++){
    const a=i/count*Math.PI*2,x=point.x+Math.sin(a)*r,z=point.z+Math.cos(a)*r;
    if(Math.abs(x)>limit-FLIGHT.radius||Math.abs(z)>limit-FLIGHT.radius)continue;
    if(clear(x,z,shape)&&ceiling(x,z)<ground(x,z)+1.1)return {x,z};
  }}return null;
}

export function flightDeployment(y,ground,obstacleTop){
  return Math.max(0,Math.min(1,(y-Math.max(ground,obstacleTop+.2))/.8));
}
