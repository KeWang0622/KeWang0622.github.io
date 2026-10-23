/* Local companion steering. The travelled trail remains the destination source;
 * this layer only makes small, swept, collision-checked steps toward that target. */
const EPS = 1e-6;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

function segmentDistance(a, b, point) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = clamp(((point.x - a.x) * dx + (point.z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(a.x + dx * t - point.x, a.z + dz * t - point.z);
}

/** Test the entire footprint along a proposed move, rather than its endpoint. */
export function companionSegmentClear(from, to, walkable, footprintRadius = 0) {
  const count = Math.max(1, Math.ceil(distance(from, to) / .08));
  for (let i = 1; i <= count; i++) {
    const t = i / count, x = from.x + (to.x - from.x) * t, z = from.z + (to.z - from.z) * t;
    if (!walkable(x, z)) return false;
    if (footprintRadius > 0) for (let k = 0; k < 8; k++) {
      const angle = k * Math.PI / 4;
      if (!walkable(x + Math.sin(angle) * footprintRadius, z + Math.cos(angle) * footprintRadius)) return false;
    }
  }
  return true;
}

/**
 * @param {object} options
 * current / desired: {x,z}; desired is the existing arc-length trail sample.
 * occupants: player and earlier companions, each {x,z,radius,vx?,vz?}.
 * walkable: the world's existing collision predicate for a centre point.
 * footprintRadius: EXTRA clearance beyond that already included by walkable.
 * state: retain the previous result.state on the follower. No shared state.
 * Returns a bounded position, plus state and diagnostics. An already-overlapping
 * input is resolved outward gradually; a moving player is never teleported.
 */
export function stepCompanion({current, desired, occupants = [], walkable, dt,
  radius = .34, footprintRadius = .12, maxSpeed = 5.2, state = {}}) {
  const seconds = clamp(Number.isFinite(dt) ? dt : 0, 0, .05);
  const step = maxSpeed * seconds;
  const bodies = occupants.filter(p => Number.isFinite(p.x) && Number.isFinite(p.z))
    .map(p => ({...p, radius: p.radius ?? .30, vx: p.vx || 0, vz: p.vz || 0}));
  const separationAt = p => bodies.reduce((min, body) => Math.min(min, distance(p, body) - radius - body.radius), Infinity);
  if (step < EPS) return {x:current.x,z:current.z,state:{...state},blocked:false,separation:separationAt(current)};

  // Look ahead far enough to start a sidestep before a reversing player reaches
  // the follower. Arc spacing alone cannot do this on a folded-back trail.
  let threat = null, nearest = Infinity;
  for (const body of bodies) {
    const safe = radius + body.radius + .08;
    const future = {x:body.x + body.vx * .32, z:body.z + body.vz * .32};
    const close = Math.min(distance(current, body), segmentDistance(body, future, current));
    const targetNear = distance(desired, body) < safe + .14;
    const crossing = segmentDistance(current, desired, body) < safe && distance(current, desired) < 2.4;
    if ((close < safe + .30 || targetNear || crossing) && close < nearest) {threat = body; nearest = close;}
  }

  let nextState = {...state}, goal = desired;
  if (threat) {
    let nx = state.nx, nz = state.nz, side = state.side;
    if (!state.yielding || !Number.isFinite(nx) || !Number.isFinite(nz)) {
      const vx = Math.abs(threat.vx) + Math.abs(threat.vz) > .05 ? threat.vx : desired.x - current.x;
      const vz = Math.abs(threat.vx) + Math.abs(threat.vz) > .05 ? threat.vz : desired.z - current.z;
      const length = Math.hypot(vx, vz);
      nx = length > EPS ? -vz / length : 1; nz = length > EPS ? vx / length : 0;
      const offset = (current.x - desired.x) * nx + (current.z - desired.z) * nz;
      side = Math.abs(offset) > .12 ? Math.sign(offset) : (state.side || 1);
    }
    const width = radius + threat.radius + .20;
    const options = [side, -side].map(sign => ({sign, point:{x:desired.x + nx * width * sign,z:desired.z + nz * width * sign}}));
    // A rail or wall may remove one side. Try the other before making a step;
    // neither side being available means wait, not cut through the obstruction.
    const usable = options.find(option => companionSegmentClear(current, option.point, walkable, footprintRadius));
    if (usable) {side = usable.sign; goal = usable.point;}
    else goal = current;
    nextState = {yielding:true,nx,nz,side};
  } else nextState = {...nextState,yielding:false};

  const targetDistance = distance(current, goal), angle = Math.atan2(goal.z - current.z, goal.x - current.x);
  let best = {x:current.x,z:current.z}, bestScore = -Infinity, found = false;
  // The angular fan is deterministic, preserves the chosen passing side, and
  // permits stopping/sliding around a corner without jumping off the trail.
  const turns = [0,.35,-.35,.7,-.7,Math.PI/2,-Math.PI/2,2.2,-2.2,Math.PI];
  const candidates = [current];
  for (const turn of turns) for (const factor of [1,.5]) {
    const length = Math.min(step * factor, Math.max(targetDistance, step * .5));
    candidates.push({x:current.x+Math.cos(angle+turn)*length,z:current.z+Math.sin(angle+turn)*length});
  }
  for (const point of candidates) {
    if (!companionSegmentClear(current, point, walkable, footprintRadius)) continue;
    let safe = true, futureRisk = 0, recovery = 0;
    for (const body of bodies) {
      const clearance = radius + body.radius + .025;
      const relativeStart = {x:current.x-body.x,z:current.z-body.z};
      const relativeEnd = {x:point.x-body.x-body.vx*seconds,z:point.z-body.z-body.vz*seconds};
      const before = Math.hypot(relativeStart.x,relativeStart.z), after = Math.hypot(relativeEnd.x,relativeEnd.z);
      if (before >= clearance - EPS) {
        if (segmentDistance(relativeStart,relativeEnd,{x:0,z:0}) < clearance - EPS) {safe=false;break;}
      } else {
        // An input can already overlap after a player movement or a scene change.
        // Never deepen that overlap; choose the fastest available escape instead.
        if (after < before - EPS) {safe=false;break;}
        recovery += (after-before)*24;
      }
      const forecast = {x:body.x+body.vx*.20,z:body.z+body.vz*.20};
      futureRisk += Math.max(0,clearance+.15-distance(point,forecast))*2.5;
    }
    if (!safe) continue;
    const travelled = distance(current,point);
    const toward = distance(current,goal)-distance(point,goal);
    const score = toward*4 - futureRisk + recovery - travelled*.015;
    if (score > bestScore) {best=point;bestScore=score;found=true;}
  }
  return {x:best.x,z:best.z,state:nextState,blocked:!found||distance(current,best)<EPS&&targetDistance>.05,separation:separationAt(best)};
}
