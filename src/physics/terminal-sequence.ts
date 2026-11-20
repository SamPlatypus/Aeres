import {
  TERMINAL_EARLY_ALTITUDE_M,
  TERMINAL_EARLY_THROTTLE,
  TERMINAL_FLIP_DURATION_S,
  TERMINAL_FLIP_THROTTLE,
  TERMINAL_LANDING_THROTTLE,
  TERMINAL_MAX_HORIZONTAL_FRACTION,
  TERMINAL_NOMINAL_HORIZONTAL_MPS,
  TERMINAL_NOMINAL_VERTICAL_MPS,
  TERMINAL_PROPORTIONAL_GAIN,
  TERMINAL_PROPORTIONAL_VREF_MPS,
  TERMINAL_TRIGGER_ALTITUDE_M,
} from "./constants.ts";
import { horizontalSpeedMps } from "./pitch-program.ts";
import type { TelemetryFrame } from "./telemetry.ts";
import { QuaternionD } from "./quaternion.ts";
import type { VehicleState } from "./vehicle-state.ts";
import { Vector3d } from "./vector3d.ts";

export type TerminalPhase = "Coast" | "Flip" | "LandingBurn" | "Complete";

/**
 * Open-loop terminal sequence. Null trigger fields are off.
 * Altitude and time are OR'd: the first one that is true arms the flip.
 */
export interface TerminalSequenceConfig {
  triggerAltitudeM: number | null;
  triggerTimeS: number | null;
  flipDurationS: number;
  flipThrottle: number;
  landingThrottle: number;
  /** Seconds from entry start. Null means no manual cutoff. */
  manualCutoffS: number | null;
  /**
   * Share of the landing-burn direction taken from anti-horizontal velocity.
   * Omitted or 0 keeps pure local vertical, identical to Pass 6.
   * Ignored while guidanceMode is Proportional.
   */
  horizontalFraction?: number;
  /**
   * FixedFraction is the Pass 7 schedule. Omitted means FixedFraction.
   * Proportional sets the fraction from horizontal speed each step.
   */
  guidanceMode?: "FixedFraction" | "Proportional";
  /** Proportional gain. Default 1. Used only in Proportional mode. */
  proportionalGain?: number;
  /** Reference horizontal speed, m/s. Default 500. */
  proportionalSpeedRefMps?: number;
  /** Upper clamp of the proportional fraction. Default 0.75. */
  maxHorizontalFraction?: number;
}

/** Case B. Flip at 3 km, thrust off during the flip, then 60% vertical. */
export const DEFAULT_TERMINAL_SEQUENCE: TerminalSequenceConfig = {
  triggerAltitudeM: TERMINAL_TRIGGER_ALTITUDE_M,
  triggerTimeS: null,
  flipDurationS: TERMINAL_FLIP_DURATION_S,
  flipThrottle: TERMINAL_FLIP_THROTTLE,
  landingThrottle: TERMINAL_LANDING_THROTTLE,
  manualCutoffS: null,
};

/** Case C. Earlier altitude gate and full thrust. Same flip. */
export const EARLY_TERMINAL_SEQUENCE: TerminalSequenceConfig = {
  triggerAltitudeM: TERMINAL_EARLY_ALTITUDE_M,
  triggerTimeS: null,
  flipDurationS: TERMINAL_FLIP_DURATION_S,
  flipThrottle: TERMINAL_FLIP_THROTTLE,
  landingThrottle: TERMINAL_EARLY_THROTTLE,
  manualCutoffS: null,
};

export interface TerminalCommand {
  phase: TerminalPhase;
  throttle: number;
  direction: Vector3d;
  pitchFromVerticalDeg: number;
  /** Present only when a horizontal landing component is commanded. */
  horizontalFraction?: number;
  /** Present only on a proportional landing command. */
  guidanceMode?: "Proportional";
}

export interface ImpactAssessment {
  verticalMps: number;
  horizontalMps: number;
  speedMps: number;
  kineticEnergyJ: number;
  flag: "nominal" | "RUD";
  peakSpeedMps: number;
}

export function touchdownFlag(verticalMps: number, horizontalMps: number): "nominal" | "RUD" {
  if (Math.abs(verticalMps) <= TERMINAL_NOMINAL_VERTICAL_MPS && horizontalMps <= TERMINAL_NOMINAL_HORIZONTAL_MPS) {
    return "nominal";
  }
  return "RUD";
}

export function pitchFromVerticalDeg(direction: Vector3d, position: Vector3d): number {
  const radius = position.magnitude;
  if (!(radius > 0) || !(direction.magnitude > 0)) return 0;
  const up = position.scale(1 / radius);
  const cosine = Math.max(-1, Math.min(1, direction.normalized.dot(up)));
  return (Math.acos(cosine) * 180) / Math.PI;
}

export function inertialPitchFromYDeg(direction: Vector3d): number {
  const cosine = Math.max(-1, Math.min(1, direction.normalized.y));
  return (Math.acos(cosine) * 180) / Math.PI;
}

function localUp(position: Vector3d): Vector3d {
  const radius = position.magnitude;
  if (!(radius > 0)) return Vector3d.up;
  return position.scale(1 / radius);
}

/** Unit slerp. Antiparallel vectors rotate through a perpendicular so the flip stays defined. */
export function slerpUnit(from: Vector3d, to: Vector3d, u: number): Vector3d {
  const a = from.normalized;
  const b = to.normalized;
  const clamped = Math.max(0, Math.min(1, u));
  if (!(a.magnitude > 0)) return b.magnitude > 0 ? b : Vector3d.up;
  if (!(b.magnitude > 0)) return a;
  const dot = Math.max(-1, Math.min(1, a.dot(b)));
  if (dot > 0.999999) return b;
  if (dot < -0.999999) {
    const side = Math.abs(a.y) < 0.9 ? a.cross(Vector3d.up).normalized : a.cross(new Vector3d(1, 0, 0)).normalized;
    return clamped < 0.5 ? slerpUnit(a, side, clamped * 2) : slerpUnit(side, b, clamped * 2 - 1);
  }
  const omega = Math.acos(dot);
  const scale = Math.sin(omega);
  return a
    .scale(Math.sin((1 - clamped) * omega) / scale)
    .add(b.scale(Math.sin(clamped * omega) / scale))
    .normalized;
}

/**
 * Landing direction. fraction <= 0 returns `up` unchanged so Pass 6 stays the same vector.
 * Otherwise normalize((1 - f) * up + f * opposition), with opposition against horizontal velocity.
 */
export function landingThrustDirection(
  up: Vector3d,
  velocity: Vector3d,
  fraction: number,
): { direction: Vector3d; pitchFromVerticalDeg: number } {
  if (!(fraction > 0)) return { direction: up, pitchFromVerticalDeg: 0 };
  const f = fraction > 1 ? 1 : fraction;
  const horizontal = velocity.sub(up.scale(velocity.dot(up)));
  const speed = horizontal.magnitude;
  if (!(speed > 0)) return { direction: up, pitchFromVerticalDeg: 0 };
  const opposition = horizontal.scale(-1 / speed);
  const direction = up.scale(1 - f).add(opposition.scale(f)).normalized;
  const cosine = Math.max(-1, Math.min(1, direction.dot(up)));
  return { direction, pitchFromVerticalDeg: (Math.acos(cosine) * 180) / Math.PI };
}

/**
 * Proportional landing fraction. clamp(k * vh / v_ref, 0, max_fraction).
 * Not called on the FixedFraction path.
 */
export function proportionalHorizontalFraction(config: TerminalSequenceConfig, position: Vector3d, velocity: Vector3d): number {
  const gain = config.proportionalGain ?? TERMINAL_PROPORTIONAL_GAIN;
  const reference = config.proportionalSpeedRefMps ?? TERMINAL_PROPORTIONAL_VREF_MPS;
  let cap = config.maxHorizontalFraction ?? TERMINAL_MAX_HORIZONTAL_FRACTION;
  if (!(cap > 0)) cap = 0;
  const horizontal = horizontalSpeedMps(position, velocity);
  let fraction = reference > 0 ? (gain * horizontal) / reference : 0;
  if (!(fraction > 0)) fraction = 0;
  if (fraction > cap) fraction = cap;
  return fraction;
}

/**
 * Point-mass terminal sequence. Thrust direction slews from the trigger's
 * anti-velocity vector to local up, then stays on local up unless a horizontal
 * landing fraction is set. No attitude state.
 */
export class TerminalSequence {
  readonly config: TerminalSequenceConfig;
  private triggerAtS: number | null = null;
  private retrograde: Vector3d | null = null;

  constructor(config: TerminalSequenceConfig) {
    this.config = config;
  }

  get triggerTimeS(): number | null {
    return this.triggerAtS;
  }

  command(timeS: number, position: Vector3d, velocity: Vector3d, propellantKg: number, altitudeM: number): TerminalCommand {
    const up = localUp(position);
    if (this.triggerAtS === null) {
      const byTime = this.config.triggerTimeS !== null && timeS >= this.config.triggerTimeS;
      const byAltitude = this.config.triggerAltitudeM !== null && altitudeM > 0 && altitudeM <= this.config.triggerAltitudeM;
      if (byTime || byAltitude) {
        this.triggerAtS = timeS;
        this.retrograde = velocity.magnitude > 0 ? velocity.normalized.scale(-1) : up;
      }
    }

    if (this.triggerAtS === null || this.retrograde === null) {
      return { phase: "Coast", throttle: 0, direction: up, pitchFromVerticalDeg: 0 };
    }

    const elapsed = timeS - this.triggerAtS;
    const cutoff = this.config.manualCutoffS !== null && timeS >= this.config.manualCutoffS;
    if (elapsed < this.config.flipDurationS && !cutoff) {
      const blend = this.config.flipDurationS > 0 ? elapsed / this.config.flipDurationS : 1;
      const direction = slerpUnit(this.retrograde, up, blend);
      return {
        phase: "Flip",
        throttle: this.config.flipThrottle,
        direction,
        pitchFromVerticalDeg: pitchFromVerticalDeg(direction, position),
      };
    }

    if (cutoff || propellantKg <= 0) {
      return { phase: "Complete", throttle: 0, direction: up, pitchFromVerticalDeg: 0 };
    }

    if (this.config.guidanceMode === "Proportional") {
      const fraction = proportionalHorizontalFraction(this.config, position, velocity);
      const blend = fraction > 1 ? 1 : fraction;
      const aim = landingThrustDirection(up, velocity, blend);
      return {
        phase: "LandingBurn",
        throttle: this.config.landingThrottle,
        direction: aim.direction,
        pitchFromVerticalDeg: aim.pitchFromVerticalDeg,
        horizontalFraction: fraction,
        guidanceMode: "Proportional",
      };
    }

    const fraction = this.config.horizontalFraction;
    if (!(typeof fraction === "number") || !(fraction > 0)) {
      return {
        phase: "LandingBurn",
        throttle: this.config.landingThrottle,
        direction: up,
        pitchFromVerticalDeg: 0,
      };
    }

    const clamped = fraction > 1 ? 1 : fraction;
    const aim = landingThrustDirection(up, velocity, clamped);
    return {
      phase: "LandingBurn",
      throttle: this.config.landingThrottle,
      direction: aim.direction,
      pitchFromVerticalDeg: aim.pitchFromVerticalDeg,
      horizontalFraction: clamped,
    };
  }
}

export function assessImpact(state: VehicleState, peakSpeedMps: number): ImpactAssessment {
  const radius = state.position.magnitude;
  const vertical = radius > 0 ? state.velocity.dot(state.position) / radius : 0;
  const horizontal = horizontalSpeedMps(state.position, state.velocity);
  const speed = state.velocity.magnitude;
  return {
    verticalMps: vertical,
    horizontalMps: horizontal,
    speedMps: speed,
    kineticEnergyJ: 0.5 * state.totalMassKg * speed * speed,
    flag: touchdownFlag(vertical, horizontal),
    peakSpeedMps,
  };
}

/**
 * Linear segment between two RK4 states, solved so |r| = R.
 * u is the fraction of the step. Position is then projected onto the sphere.
 */
export function surfaceState(before: VehicleState, after: VehicleState, radiusM: number): { u: number; state: VehicleState } {
  const dp = after.position.sub(before.position);
  const a = dp.sqrMagnitude;
  const b = 2 * before.position.dot(dp);
  const c = before.position.sqrMagnitude - radiusM * radiusM;
  let u = 1;
  if (a > 0) {
    const disc = b * b - 4 * a * c;
    if (disc >= 0) {
      const root = Math.sqrt(disc);
      const candidates = [(-b - root) / (2 * a), (-b + root) / (2 * a)].filter((value) => value >= -1e-9 && value <= 1 + 1e-9);
      if (candidates.length > 0) u = Math.max(0, Math.min(1, Math.min(...candidates)));
    }
  }
  const mix = (start: number, end: number) => start + (end - start) * u;
  const position = before.position.add(dp.scale(u));
  const onSurface = position.magnitude > 0 ? position.normalized.scale(radiusM) : new Vector3d(0, radiusM, 0);
  const propellant = Math.max(0, mix(before.propellantMassKg, after.propellantMassKg));
  return {
    u,
    state: {
      position: onSurface,
      velocity: new Vector3d(
        mix(before.velocity.x, after.velocity.x),
        mix(before.velocity.y, after.velocity.y),
        mix(before.velocity.z, after.velocity.z),
      ),
      propellantMassKg: propellant,
      totalMassKg: before.totalMassKg + (after.totalMassKg - before.totalMassKg) * u,
      thrustIntegratedDeltaVMps: mix(before.thrustIntegratedDeltaVMps, after.thrustIntegratedDeltaVMps),
      initialAttitude: before.initialAttitude,
      angularVelocityBody: new Vector3d(
        mix(before.angularVelocityBody.x, after.angularVelocityBody.x),
        mix(before.angularVelocityBody.y, after.angularVelocityBody.y),
        mix(before.angularVelocityBody.z, after.angularVelocityBody.z),
      ),
      gimbalRad: before.gimbalRad,
      attitude:
        before.attitude.x === after.attitude.x &&
        before.attitude.y === after.attitude.y &&
        before.attitude.z === after.attitude.z &&
        before.attitude.w === after.attitude.w
          ? before.attitude
          : slerpAttitude(before.attitude, after.attitude, u),
    },
  };
}

function slerpAttitude(from: QuaternionD, to: QuaternionD, u: number): QuaternionD {
  let target = to;
  let dot = from.dot(to);
  if (dot < 0) {
    target = new QuaternionD(-to.x, -to.y, -to.z, -to.w);
    dot = -dot;
  }
  if (dot > 0.9995) {
    return from.add(target.sub(from).scale(u)).normalized;
  }
  const theta = Math.acos(Math.min(1, dot));
  const s = Math.sin(theta);
  const a = Math.sin((1 - u) * theta) / s;
  const b = Math.sin(u * theta) / s;
  return from.scale(a).add(target.scale(b)).normalized;
}

export function formatTerminalSuffix(frame: TelemetryFrame): string {
  const phase = frame.sequencePhase ?? "Coast";
  const pitch = frame.thrustPitchFromVerticalDeg ?? 0;
  const radial = frame.radialMps ?? 0;
  let line = ` | phase=${phase} | pitchv=${pitch.toFixed(4)} deg | vrad=${radial.toFixed(4)}`;
  if (frame.impactFlag === "nominal" || frame.impactFlag === "RUD") {
    line += ` | impact=${frame.impactFlag} | ke=${(frame.impactKineticEnergyJ ?? 0).toExponential(6)} J | vimp=${(frame.impactSpeedMps ?? 0).toFixed(4)} | vrad_imp=${(frame.impactVerticalMps ?? 0).toFixed(4)} | vhimp=${(frame.impactHorizontalMps ?? 0).toFixed(4)} | vpeak=${(frame.peakSpeedMps ?? 0).toFixed(4)}`;
  }
  const fraction = frame.horizontalFraction ?? 0;
  const burnOrImpact = phase === "LandingBurn" || frame.impactFlag === "nominal" || frame.impactFlag === "RUD";
  if (frame.guidanceMode === "Proportional" && burnOrImpact) {
    line += ` | guide=Proportional | hf=${fraction.toFixed(4)} | herr=${pitch.toFixed(4)} deg`;
  } else if (fraction > 0 && burnOrImpact) {
    line += ` | hf=${fraction.toFixed(4)} | herr=${pitch.toFixed(4)} deg`;
  }
  return line;
}
