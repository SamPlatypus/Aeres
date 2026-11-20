import {
  DRAG_AREA_M2,
  DRAG_CD,
  G0_MPS2,
  MAX_VACUUM_THRUST_N,
  VACUUM_ISP_S,
} from "./constants.ts";
import { Vector3d } from "./vector3d.ts";

export interface PropulsionModel {
  maxVacuumThrustN: number;
  vacuumIspS: number;
  g0Mps2: number;
  dragCd: number;
  dragAreaM2: number;
  /** Inertial unit vector. Pass 1 verification uses +Y. */
  thrustDirectionInertial: Vector3d;
}

export function createDefaultPropulsion(): PropulsionModel {
  return {
    maxVacuumThrustN: MAX_VACUUM_THRUST_N,
    vacuumIspS: VACUUM_ISP_S,
    g0Mps2: G0_MPS2,
    dragCd: DRAG_CD,
    dragAreaM2: DRAG_AREA_M2,
    thrustDirectionInertial: Vector3d.up,
  };
}

export function exhaustVelocityMps(model: PropulsionModel): number {
  return model.vacuumIspS * model.g0Mps2;
}

/**
 * Positive propellant consumption dm/dt = T / (Isp · g0).
 * Zero when the throttle is closed or the tanks are empty.
 * A tiny negative propellant (RK4 stage probe landing on the burnout boundary)
 * is still treated as firing so the stage derivative stays consistent.
 */
export function isFiring(throttle: number, propellantKg: number): boolean {
  return throttle > 0 && propellantKg > -1e-8;
}

export function thrustMagnitudeN(model: PropulsionModel, throttle: number, propellantKg: number): number {
  if (!isFiring(throttle, propellantKg)) return 0;
  const limited = throttle > 1 ? 1 : throttle;
  return limited * model.maxVacuumThrustN;
}

export function massFlowKgS(model: PropulsionModel, throttle: number, propellantKg: number): number {
  const thrust = thrustMagnitudeN(model, throttle, propellantKg);
  if (thrust <= 0) return 0;
  return thrust / exhaustVelocityMps(model);
}

/** Ideal rocket equation. Δv = Isp · g0 · ln(m0 / mf). */
export function idealRocketDeltaVMps(model: PropulsionModel, initialMassKg: number, finalMassKg: number): number {
  if (!(initialMassKg > 0) || !(finalMassKg > 0) || finalMassKg > initialMassKg) {
    throw new Error("Rocket equation requires 0 < mf ≤ m0.");
  }
  return exhaustVelocityMps(model) * Math.log(initialMassKg / finalMassKg);
}
