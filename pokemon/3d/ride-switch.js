import {angleDelta,footprintClear,turnClear,motionClear,findWalkingRoute} from './navigation.js';

const yawOffsets=[0];
for(let i=1;i<=6;i++)yawOffsets.push(i*Math.PI/12,-i*Math.PI/12);

// Find somewhere the requested ride really fits, and a route the current ride
// can actually drive. The caller keeps the old ride until that route and the
// final turn finish; switching never bypasses water, walls or collision size.
export function planRideSwitch(from,{
  fromShape,toShape,walkable,limit=64,maxDistance=5,maxMilliseconds=120
}={}){
  if(!fromShape||!toShape||typeof walkable!=='function'||
    ![from.x,from.z,from.yaw??0,limit,maxDistance,maxMilliseconds].every(Number.isFinite)||
    limit<=0||maxDistance<0||maxMilliseconds<=0)return null;
  const started=performance.now(),origin={x:from.x,z:from.z,yaw:from.yaw??0};
  const free=(x,z,r=0)=>Math.abs(x)+r<=limit&&Math.abs(z)+r<=limit&&walkable(x,z,r);
  const fits=(point,yaw,shape)=>footprintClear(point.x,point.z,yaw,shape,free);
  const exhausted=()=>performance.now()-started>=maxMilliseconds;
  const placementAt=(point,startYaw)=>{
    for(const offset of yawOffsets){
      const yaw=startYaw+offset;
      if(fits(point,yaw,toShape)&&turnClear(point.x,point.z,startYaw,yaw,fromShape,free))
        return {x:point.x,z:point.z,yaw};
    }
    return null;
  };
  // An immediate change, including dismounting, should not need an extra turn.
  if(fits(origin,origin.yaw,toShape))return {placement:{...origin},route:[],distance:0};
  const samePlace=placementAt(origin,origin.yaw);
  if(samePlace)return {placement:samePlace,route:[],distance:0};
  if(!fits(origin,origin.yaw,fromShape))return null;

  const fallback=[];
  for(let radius=.5;radius<=maxDistance+1e-9;radius+=.5){
    // Nearby places are considered first. Prefer ahead before either side;
    // the exact same search works on a bridge, path or open lawn.
    const count=Math.max(16,Math.ceil(Math.PI*2*radius/.5));
    for(let sample=0;sample<count;sample++){
      if(exhausted())return null;
      const ringIndex=sample===0?0:(sample%2?1:-1)*Math.ceil(sample/2);
      const heading=origin.yaw+ringIndex*Math.PI*2/count;
      const point={x:origin.x+Math.sin(heading)*radius,z:origin.z+Math.cos(heading)*radius};
      const placement=placementAt(point,heading);
      if(!placement)continue;
      const route=[{...point,yaw:heading}];
      if(turnClear(origin.x,origin.z,origin.yaw,heading,fromShape,free)&&
        motionClear(origin,point,heading,fromShape,free))return {placement,route,distance:radius};
      // Avoid spending a full path search on every adjacent sample of the same
      // small opening. Distinct nearby openings are sufficient for fallback.
      if(fallback.every(p=>Math.hypot(p.x-point.x,p.z-point.z)>.8))fallback.push(point);
    }
  }

  for(const point of fallback.slice(0,8)){
    const remaining=maxMilliseconds-(performance.now()-started);
    if(remaining<=0)break;
    const route=findWalkingRoute(origin,point,{
      shape:fromShape,walkable:free,min:-limit,max:limit,
      maxMilliseconds:Math.min(remaining,45)
    });
    if(!route.length)continue;
    // The route finder may terminate on a nearby grid point. Its actual end
    // must fit the new ride; never assume the requested coordinate was reached.
    const end=route.at(-1),placement=placementAt(end,end.yaw);
    if(!placement||Math.hypot(placement.x-origin.x,placement.z-origin.z)>maxDistance+1e-9)continue;
    let previous=origin,length=0,valid=true;
    for(const waypoint of route){
      const distance=Math.hypot(waypoint.x-previous.x,waypoint.z-previous.z);
      const heading=distance>1e-8?Math.atan2(waypoint.x-previous.x,waypoint.z-previous.z):previous.yaw;
      if(!turnClear(previous.x,previous.z,previous.yaw,heading,fromShape,free)||
        !motionClear(previous,waypoint,heading,fromShape,free)||
        Math.abs(angleDelta(heading,waypoint.yaw))>1e-6){valid=false;break;}
      length+=distance;previous=waypoint;
    }
    if(valid&&length<=Math.max(2,maxDistance*2.4))return {placement,route,distance:length};
  }
  return null;
}
