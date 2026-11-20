import { QuaternionD } from "./quaternion.ts";
import { Vector3d } from "./vector3d.ts";

/** Uniform solid cylinder. Body +Y is the longitudinal axis. */
export const CYLINDER_HEIGHT_M = 50;
export const CYLINDER_RADIUS_M = 4.5;

export interface PrincipalMoments {
  /** Transverse, about body X. kg·m². */
  ixx: number;
  /** Axial, about body Y. kg·m². */
  iyy: number;
  /** Transverse, about body Z. kg·m². Equals ixx. */
  izz: number;
}

/**
 * Principal inertia of a uniform cylinder at the current mass.
 * Geometry is fixed. Density scales with mass, so every moment scales with mass
 * and the ratios do not. Iyy = ½ m R². Ixx = Izz = ¼ m R² + ¹⁄₁₂ m H².
 */
export function principalMoments(massKg: number): PrincipalMoments {
  const r2 = CYLINDER_RADIUS_M * CYLINDER_RADIUS_M;
  const axial = 0.5 * massKg * r2;
  const transverse = massKg * (0.25 * r2 + (CYLINDER_HEIGHT_M * CYLINDER_HEIGHT_M) / 12);
  return { ixx: transverse, iyy: axial, izz: transverse };
}

/** Euler rate. I ω̇ + ω × (I ω) = M. Omit the moment for the torque-free Pass 10 path. */
export function eulerRate(omega: Vector3d, inertia: PrincipalMoments, moment?: Vector3d): Vector3d {
  const wx = omega.x;
  const wy = omega.y;
  const wz = omega.z;
  const x = ((inertia.iyy - inertia.izz) / inertia.ixx) * wy * wz;
  const y = ((inertia.izz - inertia.ixx) / inertia.iyy) * wz * wx;
  const z = ((inertia.ixx - inertia.iyy) / inertia.izz) * wx * wy;
  if (moment === undefined || (moment.x === 0 && moment.y === 0 && moment.z === 0)) {
    return new Vector3d(x, y, z);
  }
  return new Vector3d(x + moment.x / inertia.ixx, y + moment.y / inertia.iyy, z + moment.z / inertia.izz);
}

export function bodyAngularMomentum(omega: Vector3d, inertia: PrincipalMoments): Vector3d {
  return new Vector3d(inertia.ixx * omega.x, inertia.iyy * omega.y, inertia.izz * omega.z);
}

/** Inertial angular momentum. Rotation preserves the magnitude. */
export function inertialAngularMomentum(attitude: QuaternionD, omega: Vector3d, massKg: number): Vector3d {
  return attitude.rotate(bodyAngularMomentum(omega, principalMoments(massKg)));
}

/**
 * Engine application point. Uniform cylinder, so the CoM is the geometric center
 * and the nozzle is on the aft face, half a length behind the CoM, on −Y.
 */
export const THRUST_AXIAL_OFFSET_M = CYLINDER_HEIGHT_M / 2;

export function thrustPointBody(): Vector3d {
  return new Vector3d(0, -THRUST_AXIAL_OFFSET_M, 0);
}

/**
 * Body-frame thrust unit. A positive gimbal deflects thrust from +Y toward +X.
 * Zero is exactly +Y, so the force lies on the offset and the moment is zero.
 */
export function bodyThrustDirection(gimbalRad: number): Vector3d {
  if (gimbalRad === 0) return Vector3d.up;
  return new Vector3d(Math.sin(gimbalRad), Math.cos(gimbalRad), 0);
}

/** M = r × F about the CoM. r is fixed in the body. F is body-frame thrust. */
export function thrustMoment(forceBody: Vector3d): Vector3d {
  return thrustPointBody().cross(forceBody);
}

/**
 * Moment of a gimbaled thrust about the CoM.
 * F = T (sin δ, cos δ, 0) at r = (0, −d, 0), so M = (0, 0, d · T · sin δ).
 * Zero gimbal or zero thrust returns the zero vector.
 */
export function gimbalMoment(thrustN: number, gimbalRad: number): Vector3d {
  if (gimbalRad === 0 || !(thrustN > 0)) return Vector3d.zero;
  return new Vector3d(0, 0, THRUST_AXIAL_OFFSET_M * thrustN * Math.sin(gimbalRad));
}

export interface RotationStep {
  attitude: QuaternionD;
  omega: Vector3d;
}

/**
 * One classical RK4 step of Euler plus dq/dt = ½ q ⊗ ω.
 * Inertia is frozen across the step at `massKg`. The moment is body-frame and constant.
 * Identically zero ω and zero moment return the same objects and do not read the mass.
 * A principal-axis rate with zero moment has a zero Euler derivative, so ω is unchanged
 * and the quaternion step matches QuaternionD.integrateRk4.
 */
export function integrateEulerRk4(
  attitude: QuaternionD,
  omega: Vector3d,
  massKg: number,
  dt: number,
  moment?: Vector3d,
): RotationStep {
  const torque = moment !== undefined && (moment.x !== 0 || moment.y !== 0 || moment.z !== 0);
  if ((!torque && QuaternionD.angularVelocityIsZero(omega)) || !(dt > 0) || !(massKg > 0)) {
    return { attitude, omega };
  }
  const inertia = principalMoments(massKg);
  const rate = (w: Vector3d) => (torque ? eulerRate(w, inertia, moment) : eulerRate(w, inertia));
  const k1w = rate(omega);
  const k1q = QuaternionD.derivative(attitude, omega);
  const w2 = omega.add(k1w.scale(dt * 0.5));
  const q2 = attitude.add(k1q.scale(dt * 0.5));
  const k2w = rate(w2);
  const k2q = QuaternionD.derivative(q2, w2);
  const w3 = omega.add(k2w.scale(dt * 0.5));
  const q3 = attitude.add(k2q.scale(dt * 0.5));
  const k3w = rate(w3);
  const k3q = QuaternionD.derivative(q3, w3);
  const w4 = omega.add(k3w.scale(dt));
  const q4 = attitude.add(k3q.scale(dt));
  const k4w = rate(w4);
  const k4q = QuaternionD.derivative(q4, w4);
  const scale = dt / 6;
  return {
    attitude: attitude.add(k1q.add(k2q.scale(2)).add(k3q.scale(2)).add(k4q).scale(scale)).normalized,
    omega: omega.add(k1w.add(k2w.scale(2)).add(k3w.scale(2)).add(k4w).scale(scale)),
  };
}

/** Same sub-step split as the translational RK4. Zero ω does not write. */
export function integrateEulerSubsteps(
  attitude: QuaternionD,
  omega: Vector3d,
  massKg: number,
  dt: number,
  substeps: number,
): RotationStep {
  if (QuaternionD.angularVelocityIsZero(omega)) return { attitude, omega };
  if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
  if (!(dt > 0)) return { attitude, omega };
  const h = dt / substeps;
  let q = attitude;
  let w = omega;
  for (let i = 0; i < substeps; i++) {
    const step = integrateEulerRk4(q, w, massKg, h);
    q = step.attitude;
    w = step.omega;
  }
  return { attitude: q, omega: w };
}
