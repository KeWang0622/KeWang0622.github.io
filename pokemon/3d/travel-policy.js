const REVERSIBLE_CARS = new Set(['model-s', 'cybertruck', 'porsche']);

// Reverse is a car gear. Bikes and living mounts turn toward their next
// direction of travel instead of travelling backward.
export function canReverseTravel(id) {
  return REVERSIBLE_CARS.has(id);
}
