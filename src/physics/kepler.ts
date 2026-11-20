import { Vector3d } from "./vector3d.ts";

export interface KeplerElements {
  /** Signed semi-major axis. Positive ellipse, negative hyperbola, +∞ parabola. */
  semiMajorAxisM: number;
  eccentricity: number;
  specificEnergyM2S2: number;
  /** Reciprocal semi-major axis. Zero on a parabola. */
  alphaPerM: number;
}

export interface KeplerState {
  position: Vector3d;
  velocity: Vector3d;
}

/**
 * Classical elements from an inertial state.
 * α = 2/r − v²/μ, a = 1/α, e = |((v×h)/μ) − r̂|.
 */
export function keplerElements(position: Vector3d, velocity: Vector3d, muM3S2: number): KeplerElements {
  const radius = position.magnitude;
  const speedSq = velocity.sqrMagnitude;
  const energy = 0.5 * speedSq - (muM3S2 > 0 && radius > 0 ? muM3S2 / radius : 0);
  if (!(muM3S2 > 0) || !(radius > 0)) {
    return {
      semiMajorAxisM: Number.POSITIVE_INFINITY,
      eccentricity: 0,
      specificEnergyM2S2: energy,
      alphaPerM: 0,
    };
  }
  const alpha = 2 / radius - speedSq / muM3S2;
  const semiMajorAxisM = Math.abs(alpha) < 1e-14 ? Number.POSITIVE_INFINITY : 1 / alpha;
  const h = position.cross(velocity);
  const eccentricityVector = velocity.cross(h).scale(1 / muM3S2).sub(position.scale(1 / radius));
  return {
    semiMajorAxisM,
    eccentricity: eccentricityVector.magnitude,
    specificEnergyM2S2: energy,
    alphaPerM: Math.abs(alpha) < 1e-14 ? 0 : alpha,
  };
}

/** Stumpff C(z). Series near zero so a short coast does not cancel. */
export function stumpffC(z: number): number {
  if (z > 1e-4) {
    const s = Math.sqrt(z);
    return (1 - Math.cos(s)) / z;
  }
  if (z < -1e-4) {
    const s = Math.sqrt(-z);
    return (Math.cosh(s) - 1) / -z;
  }
  return 0.5 - z / 24 + (z * z) / 720 - (z * z * z) / 40320;
}

/** Stumpff S(z). */
export function stumpffS(z: number): number {
  if (z > 1e-4) {
    const s = Math.sqrt(z);
    return (s - Math.sin(s)) / (s * s * s);
  }
  if (z < -1e-4) {
    const s = Math.sqrt(-z);
    return (Math.sinh(s) - s) / (s * s * s);
  }
  return 1 / 6 - z / 120 + (z * z) / 5040 - (z * z * z) / 362880;
}

/**
 * Universal-variable Kepler propagation (Battin / Vallado).
 * Ellipse, parabola, and hyperbola. dt = 0 returns the captured state.
 * μ ≤ 0 is uniform rectilinear motion: no gravity, no drag.
 */
export function propagateKepler(position: Vector3d, velocity: Vector3d, muM3S2: number, dtS: number): KeplerState {
  if (!(dtS !== 0)) return { position, velocity };
  if (!(muM3S2 > 0)) {
    return { position: position.add(velocity.scale(dtS)), velocity };
  }

  const radius = position.magnitude;
  const speedSq = velocity.sqrMagnitude;
  const radialRate = position.dot(velocity);
  const sqrtMu = Math.sqrt(muM3S2);
  const alpha = 2 / radius - speedSq / muM3S2;
  let chi = initialChi(alpha, radius, radialRate, muM3S2, dtS, sqrtMu);

  for (let i = 0; i < 40; i++) {
    const z = alpha * chi * chi;
    const c = stumpffC(z);
    const s = stumpffS(z);
    const residual =
      (radialRate / sqrtMu) * chi * chi * c + (1 - alpha * radius) * chi * chi * chi * s + radius * chi - sqrtMu * dtS;
    const derivative =
      (radialRate / sqrtMu) * chi * (1 - z * s) + (1 - alpha * radius) * chi * chi * c + radius;
    if (!(Math.abs(derivative) > 0)) break;
    const ratio = residual / derivative;
    chi -= ratio;
    if (Math.abs(ratio) < 1e-12) break;
  }

  const z = alpha * chi * chi;
  const c = stumpffC(z);
  const s = stumpffS(z);
  const f = 1 - (chi * chi * c) / radius;
  const g = dtS - (chi * chi * chi * s) / sqrtMu;
  const nextPosition = position.scale(f).add(velocity.scale(g));
  const nextRadius = nextPosition.magnitude;
  const fDot = (sqrtMu / (nextRadius * radius)) * chi * (z * s - 1);
  const gDot = 1 - (chi * chi * c) / nextRadius;
  const nextVelocity = position.scale(fDot).add(velocity.scale(gDot));
  return { position: nextPosition, velocity: nextVelocity };
}

function initialChi(
  alpha: number,
  radius: number,
  radialRate: number,
  mu: number,
  dt: number,
  sqrtMu: number,
): number {
  if (alpha > 1e-8) return sqrtMu * dt * alpha;
  if (alpha < -1e-8) {
    const semi = 1 / alpha;
    const sqrtNegA = Math.sqrt(-semi);
    const denom =
      radialRate + Math.sign(dt) * Math.sqrt(-mu * semi) * (1 - radius * alpha);
    const numer = -2 * mu * alpha * dt;
    if (denom !== 0 && numer / denom > 0) return Math.sign(dt) * sqrtNegA * Math.log(numer / denom);
  }
  return (sqrtMu * dt) / radius;
}
