import { DRAG_AREA_M2 } from "./constants.ts";
import { CYLINDER_HEIGHT_M } from "./cylinder-inertia.ts";
import { QuaternionD } from "./quaternion.ts";
import { Vector3d } from "./vector3d.ts";

/**
 * Center of pressure, aft of the geometric center on body −Y.
 * H/4 = 12.5 m. A lateral force here restores a positive angle of attack.
 */
export const COP_AXIAL_OFFSET_M = CYLINDER_HEIGHT_M / 4;

/** Same reference area as the axial drag model. */
export const AERO_REFERENCE_AREA_M2 = DRAG_AREA_M2;

export function copPointBody(): Vector3d {
  return new Vector3d(0, -COP_AXIAL_OFFSET_M, 0);
}

/** Inertial velocity expressed in the body frame. v_b = q* ⊗ v_i ⊗ q. */
export function velocityBody(attitude: QuaternionD, velocityInertial: Vector3d): Vector3d {
  return attitude.conjugate.rotate(velocityInertial);
}

/**
 * Signed angle of attack in the body XY plane.
 * α = atan2(v_x, v_y). Zero in-plane velocity is exactly 0.
 */
export function angleOfAttackRad(velocityBodyFrame: Vector3d): number {
  if (velocityBodyFrame.x === 0 && velocityBodyFrame.y === 0) return 0;
  return Math.atan2(velocityBodyFrame.x, velocityBodyFrame.y);
}

/**
 * sin α from the body-frame components. v_x = 0 is exactly 0, including when
 * the nose is anti-parallel to the velocity (atan2 would return π and sin(π) is not a clean 0).
 */
export function sinAngleOfAttack(velocityBodyFrame: Vector3d): number {
  if (velocityBodyFrame.x === 0) return 0;
  const lateral = Math.hypot(velocityBodyFrame.x, velocityBodyFrame.y);
  if (!(lateral > 0)) return 0;
  return velocityBodyFrame.x / lateral;
}

/** Lateral aerodynamic force along body +X. Signed with sin α. */
export function normalForceN(densityKgM3: number, speedMps: number, sinAlpha: number): number {
  if (!(densityKgM3 > 0) || !(speedMps > 0) || sinAlpha === 0) return 0;
  const v2 = speedMps * speedMps;
  return 0.5 * densityKgM3 * v2 * AERO_REFERENCE_AREA_M2 * sinAlpha;
}

/**
 * Aerodynamic moment about the CoM.
 * F = (F_normal, 0, 0), r_cop = (0, −H/4, 0).
 * M_z = r_cop.y · F_x = −(H/4) · ½ ρ |v|² S sin α.
 * That sign is restoring for dq/dt = ½ q ⊗ ω: a positive α produces M_z < 0.
 * Vacuum, zero speed, and zero α return the shared zero vector.
 */
export function aerodynamicMoment(attitude: QuaternionD, velocityInertial: Vector3d, densityKgM3: number): Vector3d {
  if (!(densityKgM3 > 0)) return Vector3d.zero;
  const speed = velocityInertial.magnitude;
  if (!(speed > 0)) return Vector3d.zero;
  const sinAlpha = sinAngleOfAttack(velocityBody(attitude, velocityInertial));
  if (sinAlpha === 0) return Vector3d.zero;
  const mz = -COP_AXIAL_OFFSET_M * normalForceN(densityKgM3, speed, sinAlpha);
  if (mz === 0) return Vector3d.zero;
  return new Vector3d(0, 0, mz);
}
