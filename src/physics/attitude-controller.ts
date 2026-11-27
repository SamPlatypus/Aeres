import { QuaternionD } from "./quaternion.ts";
import type { VehicleState } from "./vehicle-state.ts";
import type { Vector3d } from "./vector3d.ts";

/** rad/rad. Vertical hold. */
export const ATTITUDE_KP = 1;

/** seconds. Rate damping on body ωz. */
export const ATTITUDE_KD = 1.5;

/** Nozzle stop. ±5°. */
export const GIMBAL_LIMIT_RAD = (5 * Math.PI) / 180;

/** Vertical body +Y. */
export const PITCH_TARGET_RAD = 0;

/**
 * Pitch about body +Z. The quaternion is canonicalized so w ≥ 0, then
 * θ = 2 atan2(q.z, q.w). Identity is exactly 0.
 */
export function pitchAngleRad(attitude: QuaternionD): number {
  let z = attitude.z;
  let w = attitude.w;
  if (w < 0) {
    z = -z;
    w = -w;
  }
  return 2 * Math.atan2(z, w);
}

/** θ − θ_target. Target defaults to inertial +Y. */
export function pitchErrorRad(attitude: QuaternionD, targetRad = PITCH_TARGET_RAD): number {
  return pitchAngleRad(attitude) - targetRad;
}

/**
 * Signed angle of local up about +Z, in the same convention as pitchAngleRad.
 * On the +Y axis this is exactly 0.
 */
export function verticalTargetRad(position: Vector3d): number {
  const radius = Math.hypot(position.x, position.y, position.z);
  if (!(radius > 0)) return 0;
  return Math.atan2(-position.x / radius, position.y / radius);
}

/** Signed pitch of body +Y relative to local vertical. */
export function verticalPitchErrorRad(attitude: QuaternionD, position: Vector3d): number {
  return pitchErrorRad(attitude, verticalTargetRad(position));
}

/**
 * δ = −(Kp θ_err + Kd ωz), clamped to ±5°.
 * A positive pitch error commands a negative gimbal.
 * A zero error and zero rate return exactly 0, not −0.
 */
export function gimbalCommandRad(attitude: QuaternionD, omegaZ: number, targetRad = PITCH_TARGET_RAD): number {
  const delta = -(ATTITUDE_KP * pitchErrorRad(attitude, targetRad) + ATTITUDE_KD * omegaZ);
  if (delta > GIMBAL_LIMIT_RAD) return GIMBAL_LIMIT_RAD;
  if (delta < -GIMBAL_LIMIT_RAD) return -GIMBAL_LIMIT_RAD;
  if (delta === 0) return 0;
  return delta;
}

/**
 * Deflection the nozzle actually holds.
 * Controller off returns the open-loop gimbal, which is the prior-pass command.
 * Controller on replaces that command with the PD law.
 */
export function effectiveGimbalRad(state: VehicleState): number {
  if (!state.controllerEnabled) return state.gimbalRad;
  return gimbalCommandRad(state.attitude, state.angularVelocityBody.z, state.pitchTargetRad);
}
