// The pad uses real button bounds so dragging still works after rotation or a
// responsive layout change. A small gutter tolerance keeps a thumb continuous
// between buttons; moving away from the pad releases movement immediately.
export function padDirectionAt(x, y, regions, tolerance = 6) {
  let direction = '', nearest = Infinity;
  for (const { action, left, top, right, bottom } of regions) {
    const dx = Math.max(left - x, 0, x - right);
    const dy = Math.max(top - y, 0, y - bottom);
    const distance = Math.hypot(dx, dy);
    if (distance <= tolerance && distance < nearest) {
      nearest = distance; direction = action;
    }
  }
  return direction;
}

// Multiple fingers can hold a diagonal. Opposing directions cancel without
// losing the held finger, so releasing one restores the remaining direction.
export function combinePadDirections(actions) {
  const held = new Set(actions);
  return {
    throttle: Number(held.has('forward')) - Number(held.has('back')),
    turn: Number(held.has('left')) - Number(held.has('right')),
  };
}
