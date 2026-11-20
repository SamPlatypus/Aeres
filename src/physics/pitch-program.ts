import { Vector3d } from "./vector3d.ts";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Open-loop inertial pitch. The vehicle stays a point mass.
 * 0 ≤ t ≤ tVertical: thrust is inertial +Y.
 * After that, either a constant pitch rate toward +X, or a held inertial pitch.
 * Rate 0 and no hold is pure vertical.
 */
export interface PitchProgram {
  tVerticalS: number;
  pitchRateDegPerS: number;
  /** When set, this angle (deg from +Y toward +X) is held after tVertical instead of integrating rate. */
  holdPitchDeg: number | null;
}

export const PURE_VERTICAL_PROGRAM: PitchProgram = {
  tVerticalS: 0,
  pitchRateDegPerS: 0,
  holdPitchDeg: null,
};

/** Verification pitch-over: 20 s vertical, then 1.0 deg/s toward horizontal. */
export const DEFAULT_PITCH_PROGRAM: PitchProgram = {
  tVerticalS: 20,
  pitchRateDegPerS: 1,
  holdPitchDeg: null,
};

/** Signed degrees from inertial +Y toward inertial +X. Zero at and before tVertical. */
export function pitchAngleDeg(timeS: number, program: PitchProgram): number {
  if (!(timeS > program.tVerticalS)) return 0;
  if (program.holdPitchDeg !== null) return program.holdPitchDeg;
  return program.pitchRateDegPerS * (timeS - program.tVerticalS);
}

/** Unit thrust direction. Exactly Vector3d.up when the commanded angle is 0. */
export function thrustDirectionAt(timeS: number, program: PitchProgram): Vector3d {
  const deg = pitchAngleDeg(timeS, program);
  if (deg === 0) return Vector3d.up;
  const rad = deg * DEG_TO_RAD;
  return new Vector3d(Math.sin(rad), Math.cos(rad), 0);
}

/** Speed perpendicular to the radius vector. Zero on a radial trajectory. */
export function horizontalSpeedMps(position: Vector3d, velocity: Vector3d): number {
  const radius = position.magnitude;
  if (!(radius > 0)) return 0;
  const radial = velocity.dot(position) / radius;
  const radialVelocity = position.scale(radial / radius);
  return velocity.sub(radialVelocity).magnitude;
}

/**
 * Flight-path angle from the local horizontal, degrees.
 * +90 is radially outward. At rest this is reported as 90, matching the initial vertical.
 */
export function flightPathAngleDeg(position: Vector3d, velocity: Vector3d): number {
  const radius = position.magnitude;
  const speed = velocity.magnitude;
  if (!(radius > 0) || !(speed > 0)) return 90;
  const radial = velocity.dot(position) / radius;
  const horizontalSq = speed * speed - radial * radial;
  const horizontal = Math.sqrt(horizontalSq > 0 ? horizontalSq : 0);
  return Math.atan2(radial, horizontal) * RAD_TO_DEG;
}
