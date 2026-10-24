// Mounted controls are relative to the vehicle, never to the camera. This is
// shared by the first- and third-person views: W accelerates, S brakes then
// reverses, and A/D steer. The caller still owns swept collision checks.
const CAR_IDS = new Set(['model-s', 'cybertruck', 'porsche']);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const toward = (value, target, amount) => value + clamp(target - value, -amount, amount);
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;

/**
 * @param {{speed:number, steer?:number}} state Mutable velocity and steering.
 * @param {{throttle?:number, turn?:number, brake?:boolean}} input
 *   throttle: +1 forward, -1 brake/reverse; turn: +1 left, -1 right.
 * @param {{id?:string, speed:number, axle?:number, turn?:number, car?:boolean,
 *   reverseRatio?:number, acceleration?:number, braking?:number,
 *   coastDeceleration?:number}} shape Travel footprint with its mode id.
 * @param {number} dt Seconds; long suspended frames are capped at 100 ms.
 * @returns {{speed:number, yawDelta:number, steer:number}}
 *   Apply yawDelta only when the new footprint is clear, then move by speed*dt
 *   along the actor's heading. Zero state.speed on a blocked translation or a
 *   mode, room or route change. Steering is the visible wheel angle in radians.
 */
export function stepRideControl(state, {throttle = 0, turn = 0, brake = false} = {}, shape, dt) {
  const step = clamp(finite(dt), 0, .1);
  const maxSpeed = Math.max(0, finite(shape.speed));
  const car = shape.car ?? CAR_IDS.has(shape.id);
  const reverseRatio = clamp(finite(shape.reverseRatio, car ? .45 : .40), 0, 1);
  const reverseMax = maxSpeed * reverseRatio;
  const previousSpeed = clamp(finite(state.speed), -reverseMax, maxSpeed);
  const command = clamp(finite(throttle), -1, 1);
  const steeringInput = clamp(finite(turn), -1, 1);
  const acceleration = Math.max(0, finite(shape.acceleration, maxSpeed * (car ? 1.0 : 1.35)));
  const braking = Math.max(0, finite(shape.braking, maxSpeed * 2.5));
  const coast = Math.max(0, finite(shape.coastDeceleration, maxSpeed * (car ? .70 : 1.05)));
  let speed;

  if (brake) {
    // A dedicated brake never engages reverse, even when held at a standstill.
    speed = toward(previousSpeed, 0, braking * step);
  } else if (command && previousSpeed * command < 0) {
    // Reach zero before engaging the opposite direction. Keeping that zero for
    // this update also makes a direction change perceptible instead of snapping
    // directly from a forward frame into a reversing frame.
    speed = toward(previousSpeed, 0, braking * Math.abs(command) * step);
  } else if (command) {
    const target = command > 0 ? command * maxSpeed : command * reverseMax;
    speed = toward(previousSpeed, target, acceleration * Math.abs(command) * step);
  } else {
    speed = toward(previousSpeed, 0, coast * step);
  }
  if (Math.abs(speed) < 1e-6) speed = 0;

  const maxSteer = car ? .48 : .44;
  const previousSteer = clamp(finite(state.steer), -maxSteer, maxSteer);
  const steer = previousSteer + (steeringInput * maxSteer - previousSteer) * (1 - Math.exp(-10 * step));
  const turnLimit = Math.max(0, finite(shape.turn, 3));
  let yawRate;
  if (car) {
    // Kinematic bicycle steering: no velocity means no yaw. Signed velocity
    // naturally reverses the steering response while backing into a turn.
    const wheelbase = Math.max(.8, finite(shape.axle, 1) * 1.5);
    yawRate = clamp(speed * Math.tan(steer) / wheelbase, -turnLimit, turnLimit);
  } else {
    // Bikes and living mounts may pivot slowly to avoid a cumbersome multi-
    // point turn at every path junction. Forward movement increases agility.
    const pace = maxSpeed ? Math.min(1, Math.abs(speed) / maxSpeed) : 0;
    const pivotRate = Math.min(.85, turnLimit * .24);
    const movementRate = turnLimit * .60 * pace;
    const direction = speed < 0 ? -1 : 1;
    yawRate = (steer / maxSteer) * (pivotRate + movementRate) * direction;
  }

  state.speed = speed;
  state.steer = steer;
  return {speed, yawDelta: yawRate * step, steer};
}
