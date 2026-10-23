// Vehicle footprints and routes share the same swept collision tests as input.
export const TRAVEL = {
  walk:{speed:3.6,radius:.22,axle:0,turn:13},
  bicycle:{speed:5.5,radius:.35,axle:.80,turn:4.4},
  'model-s':{speed:7.2,radius:.96,axle:1.28,turn:2.8},
  cybertruck:{speed:6.8,radius:1.05,axle:1.40,turn:2.5},
  porsche:{speed:7.6,radius:.96,axle:1.10,turn:3.0},
  horse:{speed:6.1,radius:.46,axle:.96,turn:3.8}
};
export const angleDelta=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
const offsetCache=new WeakMap();
// Closely spaced discs cover the actual animated model, including wheels,
// handlebars and the rider. Three widely separated discs left side gaps.
export function footprintOffsets(shape) {
  const axle=shape.axle||0,cached=offsetCache.get(shape);
  if(cached?.axle===axle)return cached.offsets;
  const halves=Math.ceil(axle/.18),offsets=[0];
  for(let i=halves;i>0;i--)offsets.push(-axle*i/halves,axle*i/halves);
  offsetCache.set(shape,{axle,offsets});return offsets;
}
export function footprintClear(x,z,yaw,shape,walkable) {
  const sx=Math.sin(yaw),sz=Math.cos(yaw);
  for(const offset of footprintOffsets(shape))
    if(!walkable(x+sx*offset,z+sz*offset,shape.radius))return false;
  return true;
}
export function turnClear(x,z,from,to,shape,walkable) {
  if(!shape.axle)return footprintClear(x,z,0,shape,walkable);
  const angle=angleDelta(from,to),increment=Math.min(.12,.12/Math.max(1,shape.axle)),steps=Math.max(1,Math.ceil(Math.abs(angle)/increment));
  for(let i=0;i<=steps;i++)if(!footprintClear(x,z,from+angle*i/steps,shape,walkable))return false;
  return true;
}
export function motionClear(from,to,yaw,shape,walkable) {
  const dx=to.x-from.x,dz=to.z-from.z,sx=Math.sin(yaw),sz=Math.cos(yaw),along=dx*sx+dz*sz;
  // Along the body axis, all swept discs form one extended capsule. Sampling
  // that interval once avoids rechecking 10–17 overlapping bodies per step.
  if(Math.abs(dx*sz-dz*sx)<1e-8){
    const low=Math.min(0,along)-(shape.axle||0),high=Math.max(0,along)+(shape.axle||0);
    const steps=Math.max(1,Math.ceil((high-low)/.12));
    for(let i=0;i<=steps;i++){const offset=low+(high-low)*i/steps;if(!walkable(from.x+sx*offset,from.z+sz*offset,shape.radius))return false;}
    return true;
  }
  const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.12));
  for(let i=0;i<=steps;i++){const t=i/steps;if(!footprintClear(from.x+(to.x-from.x)*t,from.z+(to.z-from.z)*t,yaw,shape,walkable))return false;}
  return true;
}
class Heap {
  values=[];
  push(item){const a=this.values;a.push(item);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].score<=item.score)break;a[i]=a[p];i=p;}a[i]=item;}
  pop(){const a=this.values,top=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].score<a[c].score)c++;if(last.score<=a[c].score)break;a[i]=a[c];i=c;}a[i]=last;}return top;}
}

export function findWalkingRoute(from,to,{shape=TRAVEL.walk,walkable,min=-64,max=64,step=.6,maxMilliseconds=200,onBudgetExceeded}={}) {
  const started=performance.now();
  const n=Math.ceil((max-min)/step)+1,dirs=[[0,1],[1,1],[1,0],[1,-1],[0,-1],[-1,-1],[-1,0],[-1,1]],yaw=dirs.map(([x,z])=>Math.atan2(x,z));
  const point=(x,z)=>({x:min+x*step,z:min+z*step});
  // A circular pedestrian footprint has no orientation state. Keeping eight
  // equivalent states multiplied long walking searches for no safety benefit.
  const key=(x,z,h)=>(x+z*n)*8+(shape.axle?h:0);
  const decode=k=>({x:Math.floor(k/8)%n,z:Math.floor(Math.floor(k/8)/n),h:k%8});
  const open=new Heap(),cost=new Map(),parent=new Map(),valid=new Map(),seedYaw=new Map(),seedPrefix=new Map(),edges=new Map();
  const occupancy=(x,z,h)=>{if(x<0||z<0||x>=n||z>=n)return false;const k=key(x,z,h);if(!valid.has(k)){const p=point(x,z);valid.set(k,footprintClear(p.x,p.z,yaw[h],shape,walkable));}return valid.get(k);};
  const tx=Math.round((to.x-min)/step),tz=Math.round((to.z-min)/step);
  // Reject solid destinations before expanding thousands of unreachable states.
  let reachableEnd=false;
  for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)for(let h=0;h<8;h++){
    const p=point(tx+dx,tz+dz);if(Math.hypot(p.x-to.x,p.z-to.z)<=step*.9&&occupancy(tx+dx,tz+dz,h))reachableEnd=true;
  }
  if(!reachableEnd)return [];
  const directYaw=Math.atan2(to.x-from.x,to.z-from.z);
  if(turnClear(from.x,from.z,from.yaw||0,directYaw,shape,walkable)&&motionClear(from,to,directYaw,shape,walkable))return [{x:to.x,z:to.z,yaw:directYaw}];

  // The initial connector must face its actual direction of motion. It may
  // have an arbitrary angle; quantizing it early permitted sideways car hops.
  function seedFrom(anchor,prefix=null){
  const sx=Math.round((anchor.x-min)/step),sz=Math.round((anchor.z-min)/step),prefixLength=Math.hypot(anchor.x-from.x,anchor.z-from.z);
  for(let r=0;r<=(prefix?1:2);r++)for(let dx=-r;dx<=r;dx++)for(let dz=-r;dz<=r;dz++){
    if(r&&Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;
    const x=sx+dx,z=sz+dz,p=point(x,z);
    if(x<0||z<0||x>=n||z>=n)continue;
    const length=Math.hypot(anchor.x-p.x,anchor.z-p.z),g=prefixLength+length,heading=length>1e-8?Math.atan2(p.x-anchor.x,p.z-anchor.z):(anchor.yaw||0);
    const h=((Math.round(heading/(Math.PI/4))%8)+8)%8;
    if(!turnClear(anchor.x,anchor.z,anchor.yaw||0,heading,shape,walkable)||!motionClear(anchor,p,heading,shape,walkable))continue;
    const k=key(x,z,h);if(g>=(cost.get(k)??Infinity))continue;
    cost.set(k,g);parent.set(k,null);seedYaw.set(k,heading);if(prefix)seedPrefix.set(k,prefix);else seedPrefix.delete(k);open.push({key:k,g,score:g+Math.hypot(x-tx,z-tz)*step});
  }
  }
  seedFrom(from);
  // A narrow lane can be physically passable even when no nearby grid column
  // fits its offset. Drive straight to an opening before joining the grid.
  if(!open.values.length&&shape.axle){
    const heading=from.yaw||0;
    for(let distance=step;distance<=8;distance+=step){
      if(performance.now()-started>maxMilliseconds){onBudgetExceeded?.();return [];}
      const anchor={x:from.x+Math.sin(heading)*distance,z:from.z+Math.cos(heading)*distance,yaw:heading};
      if(!motionClear(from,anchor,heading,shape,walkable))break;
      seedFrom(anchor,anchor);
    }
  }
  let loops=0;
  while(open.values.length&&loops++<70000){
    if((loops&31)===0&&performance.now()-started>maxMilliseconds){onBudgetExceeded?.();return [];}
    const current=open.pop();if(current.g!==cost.get(current.key))continue;
    const {x,z,h}=decode(current.key),a=point(x,z),heading=seedYaw.get(current.key)??yaw[h];
    if(Math.hypot(a.x-to.x,a.z-to.z)<=step*.9){
      const result=[];let k=current.key;
      while(k!==null){const c=decode(k);result.push({...point(c.x,c.z),yaw:seedYaw.get(k)??yaw[c.h]});if(parent.get(k)===null&&seedPrefix.has(k))result.push({...seedPrefix.get(k)});k=parent.get(k);}
      result.reverse();
      if(!shape.axle){let prior=from;for(const p of result){p.yaw=Math.hypot(p.x-prior.x,p.z-prior.z)>1e-8?Math.atan2(p.x-prior.x,p.z-prior.z):(prior.yaw||0);prior=p;}}
      return result;
    }
    for(let nh=0;nh<8;nh++){
      const [dx,dz]=dirs[nh],nx=x+dx,nz=z+dz;
      if(!occupancy(nx,nz,nh))continue;
      const b=point(nx,nz);
      if(!turnClear(a.x,a.z,heading,yaw[nh],shape,walkable))continue;
      const edge=(x+z*n)*8+nh;if(!edges.has(edge))edges.set(edge,motionClear(a,b,yaw[nh],shape,walkable));
      if(!edges.get(edge))continue;
      const k=key(nx,nz,nh),g=current.g+Math.hypot(dx,dz)*step+(shape.axle?.10:0)*Math.abs(angleDelta(heading,yaw[nh]));
      if(g>=(cost.get(k)??Infinity))continue;
      cost.set(k,g);parent.set(k,current.key);seedYaw.delete(k);seedPrefix.delete(k);open.push({key:k,g,score:g+Math.hypot(nx-tx,nz-tz)*step});
    }
  }
  return [];
}
