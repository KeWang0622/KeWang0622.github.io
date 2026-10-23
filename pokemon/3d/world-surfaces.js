// One source of truth for the rendered bridge, its foot surface, and its rails.
// Coordinates are local to each straight bridge, not to the curved river below.
export const BRIDGE_XS = [-9, 7.25, 47];
export const WALKER_RADIUS = .22;
const smooth = t => { t = Math.max(0, Math.min(1, t)); return t*t*(3-2*t); };

export function createBridgeSurfaces(riverZ, groundHeight) {
  return BRIDGE_XS.map(x => {
    const z = riverZ(x), halfWidth = 1.625, halfLength = 2.2, rampLength = 1.15;
    const railX = 1.6, railHalfLength = 2.1, railRadius = .095;
    return {
      x, z, halfWidth, halfLength, rampLength, railX, railHalfLength,
      contains(px, pz) {
        return Math.abs(px-x) <= halfWidth && Math.abs(pz-z) <= halfLength+rampLength;
      },
      blocks(px, pz, radius = WALKER_RADIUS) {
        return Math.abs(Math.abs(px-x)-railX) < railRadius+radius &&
          Math.abs(pz-z) < railHalfLength+railRadius+radius;
      },
      supports(px, pz, radius = WALKER_RADIUS) {
        // A large body can still overlap the water's inflated boundary while
        // its centre is already on an approach ramp. The continuous ramp is a
        // support surface too; retain the same conservative lateral clearance.
        return Math.abs(px-x) <= railX-railRadius-radius &&
          Math.abs(pz-z) <= halfLength+rampLength;
      },
      height(px, pz) {
        const distance = Math.abs(pz-z);
        if (distance <= halfLength) {
          // Zero slope at the deck ends lets the shallow approach ramps join smoothly.
          const arch = 1-(distance/halfLength)**2;
          return .255 + .22*arch*arch;
        }
        const t = smooth((distance-halfLength)/rampLength);
        // The exposed approach edges taper into the bank as well. The rails
        // protect the untapered deck seam; the open ramp has no lateral step.
        const shoulder=smooth((Math.abs(px-x)-(halfWidth-.55))/.55)*smooth((distance-halfLength)/.20);
        const base=groundHeight(px,pz),rise=(1-t)*(1-shoulder);
        return base+(.255-base)*rise;
      }
    };
  });
}

export function clearWalkingSegment(a, b, walkable, spacing = .08) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/spacing));
  for (let i=0; i<=steps; i++) {
    const t=i/steps;
    if (!walkable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t)) return false;
  }
  return true;
}
