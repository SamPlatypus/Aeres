import {
  EARTH_J2,
  EARTH_MU_M3_S2,
  EARTH_RADIUS_M,
  EARTH_RHO0_KG_M3,
  EARTH_SCALE_HEIGHT_M,
  EARTH_SPEED_OF_SOUND_MPS,
  MARS_J2,
  MARS_MU_M3_S2,
  MARS_RADIUS_M,
  MARS_RHO0_KG_M3,
  MARS_SCALE_HEIGHT_M,
  MARS_SPEED_OF_SOUND_MPS,
} from "./constants.ts";
import { Vector3d } from "./vector3d.ts";

export interface PlanetaryEnvironment {
  name: string;
  muM3S2: number;
  equatorialRadiusM: number;
  seaLevelDensityKgM3: number;
  scaleHeightM: number;
  /** Zonal J2. Zero disables the harmonic. */
  j2: number;
  /** Constant speed of sound used only for Mach. */
  speedOfSoundMps: number;
  gravityEnabled: boolean;
  atmosphereEnabled: boolean;
}

export function createEarthEnvironment(options?: {
  gravityEnabled?: boolean;
  atmosphereEnabled?: boolean;
  includeJ2?: boolean;
}): PlanetaryEnvironment {
  return {
    name: "Earth",
    muM3S2: EARTH_MU_M3_S2,
    equatorialRadiusM: EARTH_RADIUS_M,
    seaLevelDensityKgM3: EARTH_RHO0_KG_M3,
    scaleHeightM: EARTH_SCALE_HEIGHT_M,
    j2: options?.includeJ2 ? EARTH_J2 : 0,
    speedOfSoundMps: EARTH_SPEED_OF_SOUND_MPS,
    gravityEnabled: options?.gravityEnabled ?? true,
    atmosphereEnabled: options?.atmosphereEnabled ?? true,
  };
}

export function createMarsEnvironment(options?: {
  gravityEnabled?: boolean;
  atmosphereEnabled?: boolean;
  includeJ2?: boolean;
}): PlanetaryEnvironment {
  return {
    name: "Mars",
    muM3S2: MARS_MU_M3_S2,
    equatorialRadiusM: MARS_RADIUS_M,
    seaLevelDensityKgM3: MARS_RHO0_KG_M3,
    scaleHeightM: MARS_SCALE_HEIGHT_M,
    j2: options?.includeJ2 ? MARS_J2 : 0,
    speedOfSoundMps: MARS_SPEED_OF_SOUND_MPS,
    gravityEnabled: options?.gravityEnabled ?? true,
    atmosphereEnabled: options?.atmosphereEnabled ?? true,
  };
}

/** Altitude above the spherical surface. Negative inside the body. */
export function altitudeM(env: PlanetaryEnvironment, position: Vector3d): number {
  return position.magnitude - env.equatorialRadiusM;
}

/**
 * Exponential atmosphere ρ = ρ0 exp(−h / H).
 * Height is clamped at zero so a numerical dip under the surface does not blow the density up.
 * Disabled atmosphere returns 0.
 */
export function atmosphericDensityKgM3(env: PlanetaryEnvironment, position: Vector3d): number {
  if (!env.atmosphereEnabled) return 0;
  const height = Math.max(0, altitudeM(env, position));
  return env.seaLevelDensityKgM3 * Math.exp(-height / env.scaleHeightM);
}

/**
 * Point-mass acceleration −μ r / |r|³, plus the J2 zonal term when j2 ≠ 0.
 * a_J2 = −(3/2) J2 μ Re² / r⁵ · [(1 − 5 z²/r²) r + 2 z z-hat]
 * Returns the zero vector when gravity is disabled or the position is the origin.
 */
export function gravitationalAcceleration(env: PlanetaryEnvironment, position: Vector3d): Vector3d {
  if (!env.gravityEnabled) return Vector3d.zero;
  const r2 = position.sqrMagnitude;
  const r = Math.sqrt(r2);
  if (!(r > 0)) return Vector3d.zero;

  const r3 = r2 * r;
  let accel = position.scale(-env.muM3S2 / r3);

  if (env.j2 !== 0) {
    const z2 = position.z * position.z;
    const fiveZ2OverR2 = (5 * z2) / r2;
    const factor = (-1.5 * env.j2 * env.muM3S2 * env.equatorialRadiusM * env.equatorialRadiusM) / (r3 * r2);
    accel = accel.add(
      new Vector3d(
        factor * position.x * (1 - fiveZ2OverR2),
        factor * position.y * (1 - fiveZ2OverR2),
        factor * position.z * (3 - fiveZ2OverR2),
      ),
    );
  }

  return accel;
}

export function gravityMagnitudeMps2(env: PlanetaryEnvironment, position: Vector3d): number {
  return gravitationalAcceleration(env, position).magnitude;
}
