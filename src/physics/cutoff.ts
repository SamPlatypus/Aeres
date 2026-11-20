import { Vector3d } from "./vector3d.ts";

/**
 * Open-loop engine cutoff. Point mass only: no staging.
 * Thrust command is 1 until the first limit is reached, then exactly 0.
 * A null time and a null propellant limit never cut off.
 * Time cutoff is active at t >= tCutoffS. A cutoff after the run ends does not engage.
 */
export interface CutoffCommand {
  tCutoffS: number | null;
  /** Remaining propellant. Cut off once tanks are at or below this. Null disables the limit. */
  propellantRemainingKg: number | null;
}

export const NO_CUTOFF: CutoffCommand = {
  tCutoffS: null,
  propellantRemainingKg: null,
};

/** Verification cutoff. 60 s of thrust, then ballistic coast. */
export const CUTOFF_AT_60_S: CutoffCommand = {
  tCutoffS: 60,
  propellantRemainingKg: null,
};

/** Coast log for the cutoff verification cases. */
export const COAST_END_S = 120;

/** 1 while the engine is commanded on, 0 at and after cutoff. */
export function commandThrottle(timeS: number, propellantKg: number, cutoff: CutoffCommand): number {
  if (cutoff.tCutoffS !== null && !(timeS < cutoff.tCutoffS)) return 0;
  if (cutoff.propellantRemainingKg !== null && !(propellantKg > cutoff.propellantRemainingKg)) return 0;
  return 1;
}

/**
 * Specific mechanical energy, m²/s².
 * ε = v²/2 − μ/r when the point-mass field is active. Kinetic only when gravity is off.
 */
export function specificMechanicalEnergyM2S2(position: Vector3d, velocity: Vector3d, muM3S2: number): number {
  const kinetic = 0.5 * velocity.sqrMagnitude;
  if (!(muM3S2 > 0)) return kinetic;
  const radius = position.magnitude;
  if (!(radius > 0)) return kinetic;
  return kinetic - muM3S2 / radius;
}
