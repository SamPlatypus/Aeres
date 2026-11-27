import { BURN_DURATION_S, DRY_MASS_KG, LOG_INTERVAL_S, MARS_ENTRY_END_S, MARS_SURFACE_BURN_S, STEP_HZ, TERMINAL_MAX_TIME_S } from "./constants.ts";
import { commandThrottle, specificMechanicalEnergyM2S2, type CutoffCommand } from "./cutoff.ts";
import { evaluateForces, stepRk4, advanceAttitude, type ForceEvaluation } from "./integrator-rk4.ts";
import { keplerElements, propagateKepler, type KeplerElements } from "./kepler.ts";
import { altitudeM, createEarthEnvironment, createMarsEnvironment, type PlanetaryEnvironment } from "./planetary-environment.ts";
import { effectiveGimbalRad, verticalTargetRad } from "./attitude-controller.ts";
import { bodyThrustDirection } from "./cylinder-inertia.ts";
import { pitchAngleDeg, thrustDirectionAt, type PitchProgram } from "./pitch-program.ts";
import { createDefaultPropulsion, idealRocketDeltaVMps, massFlowKgS } from "./propulsion.ts";
import {
  assessImpact,
  DEFAULT_TERMINAL_SEQUENCE,
  formatTerminalSuffix,
  inertialPitchFromYDeg,
  landingThrustDirection,
  proportionalHorizontalFraction,
  surfaceState,
  TerminalSequence,
  type ImpactAssessment,
  type TerminalCommand,
  type TerminalSequenceConfig,
} from "./terminal-sequence.ts";
import { formatLogLine, frameFromForce, stampAttitude, type TelemetryFrame } from "./telemetry.ts";
import { QuaternionD } from "./quaternion.ts";
import { cloneState, createEntryState, createSeaLevelState, withTranslation, MARS_ENTRY_INTERFACE, type EntryInterface, type VehicleState } from "./vehicle-state.ts";
import { Vector3d } from "./vector3d.ts";

const FRAME_STRIDE = 10;
const VACUUM_AGREEMENT_LIMIT = 0.001;

export interface SimulationReport {
  disableGravityAndAtmosphere: boolean;
  substeps: number;
  samples: TelemetryFrame[];
  frames: TelemetryFrame[];
  logLines: string[];
  logText: string;
  initialMassKg: number;
  finalMassKg: number;
  initialVelocity: Vector3d;
  finalPosition: Vector3d;
  finalVelocity: Vector3d;
  idealDeltaVMps: number;
  achievedDeltaVMps: number;
  thrustIntegratedDeltaVMps: number;
  /** ideal − achieved. Positive when gravity and drag have taken Δv. */
  differenceMps: number;
  relativeError: number;
  vacuumCheckApplies: boolean;
  vacuumCheckPassed: boolean;
  /** Null on the pure-vertical Pass 1 path. */
  pitchProgram: PitchProgram | null;
  /** Null when this report is a Pass 1 or Pass 2 burn with cutoff disabled. */
  cutoff: CutoffCommand | null;
  endTimeS: number;
  /** True only for an analytic Kepler coast. Absent on the verified numerical paths. */
  analyticKepler?: boolean;
  keplerCapture?: KeplerCapture | null;
  /** Present only when the terminal sequence was armed. */
  terminal?: {
    config: TerminalSequenceConfig;
    triggerTimeS: number | null;
    impact: ImpactAssessment | null;
    peakSpeedMps: number;
  } | null;
}

export interface KeplerCapture {
  timeS: number;
  position: Vector3d;
  velocity: Vector3d;
  muM3S2: number;
  propellantKg: number;
  totalMassKg: number;
  thrustIntegratedDeltaVMps: number;
  elements: KeplerElements;
}

function sampleState(
  state: VehicleState,
  timeS: number,
  env: ReturnType<typeof createEarthEnvironment>,
  propulsion: ReturnType<typeof createDefaultPropulsion>,
  throttle: number,
  thrustPitchDeg = 0,
  thrustDirection: Vector3d = Vector3d.up,
  timeSinceCutoffS = 0,
  body = env.name,
  speedOfSoundMps = env.speedOfSoundMps,
): TelemetryFrame {
  const delta = effectiveGimbalRad(state);
  const steered = delta !== 0 && throttle > 0 ? state.attitude.rotate(bodyThrustDirection(delta)) : thrustDirection;
  const force = evaluateForces(
    state.position,
    state.velocity,
    state.propellantMassKg,
    env,
    propulsion,
    throttle,
    steered,
  );
  const mu = env.gravityEnabled ? env.muM3S2 : 0;
  const pitchDeg =
    delta !== 0 && throttle > 0 ? (Math.atan2(steered.x, steered.y) * 180) / Math.PI : thrustPitchDeg;
  return stampAttitude(
    frameFromForce(
      timeS,
      state.velocity,
      state.position,
      state.propellantMassKg,
      force,
      pitchDeg,
      throttle > 0 ? 1 : 0,
      timeSinceCutoffS,
      specificMechanicalEnergyM2S2(state.position, state.velocity, mu),
      "numerical",
      0,
      0,
      0,
      body,
      speedOfSoundMps,
    ),
    state,
  );
}

/**
 * Headless Pass 1 verification.
 * Sea-level Earth, position (0, R, 0), velocity 0, 100% +Y thrust for 90 s.
 * Fixed step 0.02 s. Optional RK4 sub-stepping.
 * Set disableGravityAndAtmosphere to compare integrated Δv with the rocket equation.
 */
export function runVerticalBurn(
  disableGravityAndAtmosphere: boolean,
  substeps = 1,
  angularVelocityBody: Vector3d = Vector3d.zero,
  gimbalRad = 0,
  controllerEnabled = false,
  initialAttitude: QuaternionD | null = null,
): SimulationReport {
  if (!Number.isInteger(substeps) || substeps < 1) {
    throw new Error("substeps must be a positive integer");
  }

  const env = createEarthEnvironment({
    gravityEnabled: !disableGravityAndAtmosphere,
    atmosphereEnabled: !disableGravityAndAtmosphere,
    includeJ2: false,
  });
  const propulsion = createDefaultPropulsion();
  let state = createSeaLevelState(env, angularVelocityBody, gimbalRad, controllerEnabled);
  if (initialAttitude) state = { ...state, attitude: initialAttitude, initialAttitude };
  const initialVelocity = state.velocity;
  const initialMassKg = state.totalMassKg;

  const steps = BURN_DURATION_S * STEP_HZ;
  const logEvery = LOG_INTERVAL_S * STEP_HZ;
  const samples: TelemetryFrame[] = [];
  const frames: TelemetryFrame[] = [];
  const logLines: string[] = [];

  const header = disableGravityAndAtmosphere
    ? "ARES CORE vertical burn | mode=VACUUM | gravity=off | atmosphere=off | thrust=+Y | throttle=1 | dt=0.02 s"
    : "ARES CORE vertical burn | mode=EARTH | gravity=point-mass | atmosphere=exponential | thrust=+Y | throttle=1 | dt=0.02 s";
  logLines.push(header);

  for (let n = 0; n <= steps; n++) {
    const timeS = n / STEP_HZ;
    if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
      const frame = sampleState(state, timeS, env, propulsion, 1);
      if (n % FRAME_STRIDE === 0) frames.push(frame);
      if (n % logEvery === 0) {
        samples.push(frame);
        logLines.push(formatLogLine(frame));
      }
    }
    if (n === steps) break;
    state = stepRk4(state, 1 / STEP_HZ, substeps, env, propulsion, 1);
  }

  const finalMassKg = state.totalMassKg;
  const ideal = idealRocketDeltaVMps(propulsion, initialMassKg, finalMassKg);
  const achieved = state.velocity.sub(initialVelocity).magnitude;
  const thrustDv = state.thrustIntegratedDeltaVMps;
  const difference = ideal - achieved;
  const relativeError = ideal > 0 ? Math.abs(achieved - ideal) / ideal : 0;
  const vacuumCheckApplies = disableGravityAndAtmosphere;
  const vacuumCheckPassed = !vacuumCheckApplies || relativeError < VACUUM_AGREEMENT_LIMIT;

  logLines.push(`ideal_dv_m_s=${ideal.toFixed(6)}`);
  logLines.push(`achieved_dv_m_s=${achieved.toFixed(6)}`);
  logLines.push(`thrust_integrated_dv_m_s=${thrustDv.toFixed(6)}`);
  logLines.push(`difference_ideal_minus_achieved_m_s=${difference.toFixed(6)}`);
  logLines.push(`relative_error=${(relativeError * 100).toFixed(8)} %`);
  logLines.push(
    vacuumCheckApplies
      ? `verdict=${vacuumCheckPassed ? "PASS" : "FAIL"} vacuum agreement limit=0.10000000 %`
      : "verdict=GRAVITY_AND_DRAG_LOSS vacuum agreement not applicable",
  );

  return {
    disableGravityAndAtmosphere,
    substeps,
    samples,
    frames,
    logLines,
    logText: logLines.join("\n"),
    initialMassKg,
    finalMassKg,
    initialVelocity,
    finalPosition: state.position,
    finalVelocity: state.velocity,
    idealDeltaVMps: ideal,
    achievedDeltaVMps: achieved,
    thrustIntegratedDeltaVMps: thrustDv,
    differenceMps: difference,
    relativeError,
    vacuumCheckApplies,
    vacuumCheckPassed,
    pitchProgram: null,
    cutoff: null,
    endTimeS: BURN_DURATION_S,
  };
}

/** Unpowered atmospheric coast used to show the restoring aerodynamic moment. */
export const WEATHERCOCK_DURATION_S = 120;
export const WEATHERCOCK_SPEED_MPS = 100;
export const WEATHERCOCK_ALPHA_DEG = 5;

/**
 * Engines off. Gravity off so the inertial velocity stays on +Y and α is the body pitch.
 * Atmosphere on. Initial attitude is a +Z rotation of `alphaDeg`, so α starts at that angle.
 * The center of pressure is aft of the CoM, so M_z restores α toward 0.
 */
export function runWeathercockCoast(substeps = 1, alphaDeg = WEATHERCOCK_ALPHA_DEG, speedMps = WEATHERCOCK_SPEED_MPS): SimulationReport {
  if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
  const env = createEarthEnvironment({ gravityEnabled: false, atmosphereEnabled: true, includeJ2: false });
  const propulsion = createDefaultPropulsion();
  const alphaRad = (alphaDeg * Math.PI) / 180;
  const attitude = alphaRad === 0 ? QuaternionD.identity : QuaternionD.fromAxisAngle(new Vector3d(0, 0, 1), alphaRad);
  let state = createSeaLevelState(env, Vector3d.zero, 0, false);
  state = {
    ...state,
    velocity: new Vector3d(0, speedMps, 0),
    attitude,
    initialAttitude: attitude,
  };
  const initialVelocity = state.velocity;
  const initialMassKg = state.totalMassKg;
  const steps = WEATHERCOCK_DURATION_S * STEP_HZ;
  const logEvery = LOG_INTERVAL_S * STEP_HZ;
  const samples: TelemetryFrame[] = [];
  const frames: TelemetryFrame[] = [];
  const logLines: string[] = [];
  logLines.push(
    `ARES CORE weathercock | mode=ATMOSPHERE | gravity=off | thrust=0 | alpha0=${alphaDeg} deg | v=${speedMps} m/s | dt=0.02 s`,
  );
  for (let n = 0; n <= steps; n++) {
    const timeS = n / STEP_HZ;
    if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
      const frame = sampleState(state, timeS, env, propulsion, 0, 0, Vector3d.up, timeS);
      if (n % FRAME_STRIDE === 0) frames.push(frame);
      if (n % logEvery === 0) {
        samples.push(frame);
        logLines.push(formatLogLine(frame));
      }
    }
    if (n === steps) break;
    state = stepRk4(state, 1 / STEP_HZ, substeps, env, propulsion, 0);
  }
  const finalMassKg = state.totalMassKg;
  const ideal = idealRocketDeltaVMps(propulsion, initialMassKg, finalMassKg);
  const achieved = state.velocity.sub(initialVelocity).magnitude;
  const thrustDv = state.thrustIntegratedDeltaVMps;
  const difference = ideal - achieved;
  const relativeError = ideal > 0 ? Math.abs(achieved - ideal) / ideal : 0;
  logLines.push(`ideal_dv_m_s=${ideal.toFixed(6)}`);
  logLines.push(`achieved_dv_m_s=${achieved.toFixed(6)}`);
  logLines.push("verdict=AERO_MOMENT engines off");
  return {
    disableGravityAndAtmosphere: false,
    substeps,
    samples,
    frames,
    logLines,
    logText: logLines.join("\n"),
    initialMassKg,
    finalMassKg,
    initialVelocity,
    finalPosition: state.position,
    finalVelocity: state.velocity,
    idealDeltaVMps: ideal,
    achievedDeltaVMps: achieved,
    thrustIntegratedDeltaVMps: thrustDv,
    differenceMps: difference,
    relativeError,
    vacuumCheckApplies: false,
    vacuumCheckPassed: true,
    pitchProgram: null,
    cutoff: null,
    endTimeS: WEATHERCOCK_DURATION_S,
  };
}

/**
 * Same 90 s sea-level burn as Pass 1, with an open-loop thrust direction.
 * A program that never leaves +Y delegates to runVerticalBurn, so those numbers stay identical.
 */
export function runPitchedBurn(
  disableGravityAndAtmosphere: boolean,
  substeps = 1,
  program: PitchProgram,
  angularVelocityBody: Vector3d = Vector3d.zero,
  gimbalRad = 0,
  controllerEnabled = false,
): SimulationReport {
  if (pitchAngleDeg(BURN_DURATION_S, program) === 0) {
    return runVerticalBurn(disableGravityAndAtmosphere, substeps, angularVelocityBody, gimbalRad, controllerEnabled);
  }
  if (!Number.isInteger(substeps) || substeps < 1) {
    throw new Error("substeps must be a positive integer");
  }

  const env = createEarthEnvironment({
    gravityEnabled: !disableGravityAndAtmosphere,
    atmosphereEnabled: !disableGravityAndAtmosphere,
    includeJ2: false,
  });
  const propulsion = createDefaultPropulsion();
  let state = createSeaLevelState(env, angularVelocityBody, gimbalRad, controllerEnabled);
  const initialVelocity = state.velocity;
  const initialMassKg = state.totalMassKg;

  const steps = BURN_DURATION_S * STEP_HZ;
  const logEvery = LOG_INTERVAL_S * STEP_HZ;
  const samples: TelemetryFrame[] = [];
  const frames: TelemetryFrame[] = [];
  const logLines: string[] = [];

  const mode = disableGravityAndAtmosphere ? "VACUUM" : "EARTH";
  const pitchText =
    program.holdPitchDeg === null
      ? `pitch_rate=${program.pitchRateDegPerS} deg/s`
      : `hold_pitch=${program.holdPitchDeg} deg`;
  logLines.push(
    `ARES CORE pitch program | mode=${mode} | t_vertical=${program.tVerticalS} s | ${pitchText} | plane=XY | throttle=1 | dt=0.02 s`,
  );

  for (let n = 0; n <= steps; n++) {
    const timeS = n / STEP_HZ;
    const pitchDeg = pitchAngleDeg(timeS, program);
    const direction = thrustDirectionAt(timeS, program);
    if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
      const frame = sampleState(state, timeS, env, propulsion, 1, pitchDeg, direction);
      if (n % FRAME_STRIDE === 0) frames.push(frame);
      if (n % logEvery === 0) {
        samples.push(frame);
        logLines.push(formatLogLine(frame));
      }
    }
    if (n === steps) break;
    state = stepRk4(state, 1 / STEP_HZ, substeps, env, propulsion, 1, direction);
  }

  const finalMassKg = state.totalMassKg;
  const ideal = idealRocketDeltaVMps(propulsion, initialMassKg, finalMassKg);
  const achieved = state.velocity.sub(initialVelocity).magnitude;
  const thrustDv = state.thrustIntegratedDeltaVMps;
  const difference = ideal - achieved;
  const relativeError = ideal > 0 ? Math.abs(achieved - ideal) / ideal : 0;

  logLines.push(`ideal_dv_m_s=${ideal.toFixed(6)}`);
  logLines.push(`achieved_dv_m_s=${achieved.toFixed(6)}`);
  logLines.push(`thrust_integrated_dv_m_s=${thrustDv.toFixed(6)}`);
  logLines.push(`difference_ideal_minus_achieved_m_s=${difference.toFixed(6)}`);
  logLines.push(`relative_error=${(relativeError * 100).toFixed(8)} %`);
  logLines.push("verdict=OPEN_LOOP_PITCH");

  return {
    disableGravityAndAtmosphere,
    substeps,
    samples,
    frames,
    logLines,
    logText: logLines.join("\n"),
    initialMassKg,
    finalMassKg,
    initialVelocity,
    finalPosition: state.position,
    finalVelocity: state.velocity,
    idealDeltaVMps: ideal,
    achievedDeltaVMps: achieved,
    thrustIntegratedDeltaVMps: thrustDv,
    differenceMps: difference,
    relativeError,
    vacuumCheckApplies: false,
    vacuumCheckPassed: true,
    pitchProgram: program,
    cutoff: null,
    endTimeS: BURN_DURATION_S,
  };
}

interface CutoffMark {
  timeS: number | null;
}

function markCutoff(mark: CutoffMark, timeS: number) {
  if (mark.timeS === null || timeS < mark.timeS) mark.timeS = timeS;
}

/**
 * One major step. Throttle is 1 until cutoff, then 0.
 * A cutoff that lands inside the step splits it. The RK4 step itself is unchanged.
 * With no cutoff this is a single stepRk4 of the full dt.
 */
function stepCommanded(
  state: VehicleState,
  timeS: number,
  dt: number,
  substeps: number,
  env: ReturnType<typeof createEarthEnvironment>,
  propulsion: ReturnType<typeof createDefaultPropulsion>,
  cutoff: CutoffCommand,
  direction: Vector3d,
  mark: CutoffMark,
): VehicleState {
  let cursor = timeS;
  let left = dt;
  let current = state;

  for (let guard = 0; guard < 4 && left > 1e-12; guard++) {
    const throttle = commandThrottle(cursor, current.propellantMassKg, cutoff);
    if (!(throttle > 0)) {
      markCutoff(mark, cursor);
      return stepRk4(current, left, substeps, env, propulsion, 0, direction);
    }

    let segment = left;
    let snapTo: number | null = null;
    if (cutoff.tCutoffS !== null && cursor < cutoff.tCutoffS && cursor + segment > cutoff.tCutoffS) {
      segment = cutoff.tCutoffS - cursor;
    }
    if (cutoff.propellantRemainingKg !== null) {
      const threshold = cutoff.propellantRemainingKg;
      const burnable = current.propellantMassKg - threshold;
      const mdot = massFlowKgS(propulsion, 1, current.propellantMassKg);
      if (!(burnable > 0) || !(mdot > 0)) {
        markCutoff(mark, cursor);
        return stepRk4(current, left, substeps, env, propulsion, 0, direction);
      }
      const dtFuel = burnable / mdot;
      if (dtFuel < segment) {
        segment = dtFuel;
        snapTo = threshold;
      }
    }

    if (!(segment > 0)) break;
    if (segment >= left - 1e-15 && snapTo === null) {
      return stepRk4(current, left, substeps, env, propulsion, 1, direction);
    }

    current = stepRk4(current, segment, substeps, env, propulsion, 1, direction);
    cursor += segment;
    left -= segment;
    if (snapTo !== null) {
      current = withTranslation(
        current,
        current.position,
        current.velocity,
        snapTo,
        DRY_MASS_KG + Math.max(snapTo, 0),
        current.thrustIntegratedDeltaVMps,
      );
      markCutoff(mark, cursor);
      if (left > 1e-12) return stepRk4(current, left, substeps, env, propulsion, 0, direction);
      return current;
    }
  }

  return current;
}

/**
 * Pass 3. Same sea-level burn as Pass 1 / Pass 2, with optional cutoff and a longer coast.
 * Cutoff that cannot engage before endTime, on a 90 s run, delegates to the verified function.
 */
export function runCoastBurn(
  disableGravityAndAtmosphere: boolean,
  substeps: number,
  program: PitchProgram,
  cutoff: CutoffCommand,
  endTimeS: number,
  angularVelocityBody: Vector3d = Vector3d.zero,
  gimbalRad = 0,
  controllerEnabled = false,
): SimulationReport {
  if (!Number.isInteger(substeps) || substeps < 1) {
    throw new Error("substeps must be a positive integer");
  }
  const steps = Math.round(endTimeS * STEP_HZ);
  if (!(steps > 0) || Math.abs(endTimeS * STEP_HZ - steps) > 1e-6) {
    throw new Error("end time must land on the 50 Hz step grid");
  }

  const inactive =
    cutoff.propellantRemainingKg === null && (cutoff.tCutoffS === null || cutoff.tCutoffS > endTimeS);
  if (inactive && endTimeS === BURN_DURATION_S) {
    if (pitchAngleDeg(BURN_DURATION_S, program) === 0) {
      return runVerticalBurn(disableGravityAndAtmosphere, substeps, angularVelocityBody, gimbalRad, controllerEnabled);
    }
    return runPitchedBurn(disableGravityAndAtmosphere, substeps, program, angularVelocityBody, gimbalRad, controllerEnabled);
  }

  const env = createEarthEnvironment({
    gravityEnabled: !disableGravityAndAtmosphere,
    atmosphereEnabled: !disableGravityAndAtmosphere,
    includeJ2: false,
  });
  const propulsion = createDefaultPropulsion();
  let state = createSeaLevelState(env, angularVelocityBody, gimbalRad, controllerEnabled);
  const initialVelocity = state.velocity;
  const initialMassKg = state.totalMassKg;
  const mark: CutoffMark = { timeS: null };

  const logEvery = LOG_INTERVAL_S * STEP_HZ;
  const samples: TelemetryFrame[] = [];
  const frames: TelemetryFrame[] = [];
  const logLines: string[] = [];

  const mode = disableGravityAndAtmosphere ? "VACUUM" : "EARTH";
  const pitchText =
    pitchAngleDeg(endTimeS, program) === 0
      ? "pitch=vertical"
      : program.holdPitchDeg === null
        ? `pitch_rate=${program.pitchRateDegPerS} deg/s after ${program.tVerticalS} s`
        : `hold_pitch=${program.holdPitchDeg} deg after ${program.tVerticalS} s`;
  const cutoffText =
    cutoff.tCutoffS === null
      ? "t_cutoff=never"
      : `t_cutoff=${cutoff.tCutoffS} s`;
  const propText =
    cutoff.propellantRemainingKg === null ? "mp_cutoff=none" : `mp_cutoff=${cutoff.propellantRemainingKg} kg`;
  logLines.push(
    `ARES CORE cutoff coast | mode=${mode} | ${cutoffText} | ${propText} | end=${endTimeS} s | ${pitchText} | dt=0.02 s`,
  );

  for (let n = 0; n <= steps; n++) {
    const timeS = n / STEP_HZ;
    const pitchDeg = pitchAngleDeg(timeS, program);
    const direction = thrustDirectionAt(timeS, program);
    const throttle = commandThrottle(timeS, state.propellantMassKg, cutoff);
    if (throttle === 0) markCutoff(mark, timeS);
    const since = mark.timeS === null || !(timeS > mark.timeS) ? 0 : timeS - mark.timeS;
    if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
      const frame = sampleState(state, timeS, env, propulsion, throttle, pitchDeg, direction, since);
      if (n % FRAME_STRIDE === 0) frames.push(frame);
      if (n % logEvery === 0) {
        samples.push(frame);
        logLines.push(formatLogLine(frame));
      }
    }
    if (n === steps) break;
    state = stepCommanded(state, timeS, 1 / STEP_HZ, substeps, env, propulsion, cutoff, direction, mark);
  }

  const finalMassKg = state.totalMassKg;
  const ideal = idealRocketDeltaVMps(propulsion, initialMassKg, finalMassKg);
  const achieved = state.velocity.sub(initialVelocity).magnitude;
  const thrustDv = state.thrustIntegratedDeltaVMps;
  const difference = ideal - achieved;
  const relativeError = ideal > 0 ? Math.abs(achieved - ideal) / ideal : 0;
  const engaged = mark.timeS !== null;

  logLines.push(`ideal_dv_m_s=${ideal.toFixed(6)}`);
  logLines.push(`achieved_dv_m_s=${achieved.toFixed(6)}`);
  logLines.push(`thrust_integrated_dv_m_s=${thrustDv.toFixed(6)}`);
  logLines.push(`difference_ideal_minus_achieved_m_s=${difference.toFixed(6)}`);
  logLines.push(`relative_error=${(relativeError * 100).toFixed(8)} %`);
  logLines.push(engaged ? "verdict=CUTOFF_AND_COAST" : "verdict=CONTINUOUS_THRUST");

  return {
    disableGravityAndAtmosphere,
    substeps,
    samples,
    frames,
    logLines,
    logText: logLines.join("\n"),
    initialMassKg,
    finalMassKg,
    initialVelocity,
    finalPosition: state.position,
    finalVelocity: state.velocity,
    idealDeltaVMps: ideal,
    achievedDeltaVMps: achieved,
    thrustIntegratedDeltaVMps: thrustDv,
    differenceMps: difference,
    relativeError,
    vacuumCheckApplies: false,
    vacuumCheckPassed: true,
    pitchProgram: pitchAngleDeg(endTimeS, program) === 0 ? null : program,
    cutoff: engaged ? cutoff : null,
    endTimeS,
  };
}

function analyticForce(
  position: Vector3d,
  massKg: number,
  mu: number,
  equatorialRadiusM: number,
): ForceEvaluation {
  const radius = position.magnitude;
  const gravity = mu > 0 && radius > 0 ? mu / (radius * radius) : 0;
  const gravityAccel = gravity > 0 ? position.scale(-gravity / radius) : Vector3d.zero;
  return {
    altitudeM: radius - equatorialRadiusM,
    massKg,
    acceleration: gravityAccel,
    accelerationMagnitudeMps2: gravity,
    thrustN: 0,
    thrustAccelMps2: 0,
    dragN: 0,
    dragAccel: Vector3d.zero,
    gravityMps2: gravity,
    gravityAccel,
    densityKgM3: 0,
    dynamicPressurePa: 0,
    massFlowKgS: 0,
  };
}

/**
 * Pass 4. Powered flight and the cutoff instant stay on the Pass 3 RK4 path.
 * After thrust is zero, position and velocity come from a universal-variable Kepler step.
 * Drag is not applied on that arc. Gravity off degenerates to a straight line.
 * A cutoff that never engages delegates to {@link runCoastBurn}.
 */
export function runKeplerCoast(
  disableGravityAndAtmosphere: boolean,
  substeps: number,
  program: PitchProgram,
  cutoff: CutoffCommand,
  endTimeS: number,
  angularVelocityBody: Vector3d = Vector3d.zero,
  gimbalRad = 0,
  controllerEnabled = false,
): SimulationReport {
  const inactive =
    cutoff.propellantRemainingKg === null && (cutoff.tCutoffS === null || cutoff.tCutoffS > endTimeS);
  if (inactive) return runCoastBurn(disableGravityAndAtmosphere, substeps, program, cutoff, endTimeS, angularVelocityBody, gimbalRad, controllerEnabled);
  if (!Number.isInteger(substeps) || substeps < 1) {
    throw new Error("substeps must be a positive integer");
  }
  const steps = Math.round(endTimeS * STEP_HZ);
  if (!(steps > 0) || Math.abs(endTimeS * STEP_HZ - steps) > 1e-6) {
    throw new Error("end time must land on the 50 Hz step grid");
  }

  const env = createEarthEnvironment({
    gravityEnabled: !disableGravityAndAtmosphere,
    atmosphereEnabled: !disableGravityAndAtmosphere,
    includeJ2: false,
  });
  const propulsion = createDefaultPropulsion();
  let state = createSeaLevelState(env, angularVelocityBody, gimbalRad, controllerEnabled);
  const initialVelocity = state.velocity;
  const initialMassKg = state.totalMassKg;
  const mark: CutoffMark = { timeS: null };
  let capture: KeplerCapture | null = null;

  const logEvery = LOG_INTERVAL_S * STEP_HZ;
  const samples: TelemetryFrame[] = [];
  const frames: TelemetryFrame[] = [];
  const logLines: string[] = [];
  const mu = env.gravityEnabled ? env.muM3S2 : 0;

  const mode = disableGravityAndAtmosphere ? "VACUUM" : "EARTH";
  const pitchText =
    pitchAngleDeg(endTimeS, program) === 0
      ? "pitch=vertical"
      : program.holdPitchDeg === null
        ? `pitch_rate=${program.pitchRateDegPerS} deg/s after ${program.tVerticalS} s`
        : `hold_pitch=${program.holdPitchDeg} deg after ${program.tVerticalS} s`;
  const cutoffText = cutoff.tCutoffS === null ? "t_cutoff=never" : `t_cutoff=${cutoff.tCutoffS} s`;
  logLines.push(
    `ARES CORE analytic kepler | mode=${mode} | ${cutoffText} | end=${endTimeS} s | ${pitchText} | drag=off | dt=0.02 s`,
  );

  for (let n = 0; n <= steps; n++) {
    const timeS = n / STEP_HZ;
    if (capture && timeS > capture.timeS) {
      const propagated = propagateKepler(capture.position, capture.velocity, capture.muM3S2, timeS - capture.timeS);
      state = withTranslation(
        state,
        propagated.position,
        propagated.velocity,
        capture.propellantKg,
        capture.totalMassKg,
        capture.thrustIntegratedDeltaVMps,
      );
    }
    const pitchDeg = pitchAngleDeg(timeS, program);
    const direction = thrustDirectionAt(timeS, program);
    const throttle = commandThrottle(timeS, state.propellantMassKg, cutoff);
    if (capture === null && throttle === 0) {
      const elements = keplerElements(state.position, state.velocity, mu);
      capture = {
        timeS,
        position: state.position,
        velocity: state.velocity,
        muM3S2: mu,
        propellantKg: state.propellantMassKg,
        totalMassKg: state.totalMassKg,
        thrustIntegratedDeltaVMps: state.thrustIntegratedDeltaVMps,
        elements,
      };
      markCutoff(mark, timeS);
    } else if (throttle === 0) {
      markCutoff(mark, timeS);
    }
    const since = mark.timeS === null || !(timeS > mark.timeS) ? 0 : timeS - mark.timeS;
    const onAnalyticArc = capture !== null && timeS > capture.timeS;

    if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
      let frame: TelemetryFrame;
      if (onAnalyticArc && capture) {
        const force = analyticForce(state.position, capture.totalMassKg, mu, env.equatorialRadiusM);
        frame = stampAttitude(
          frameFromForce(
            timeS,
            state.velocity,
            state.position,
            capture.propellantKg,
            force,
            pitchDeg,
            0,
            since,
            specificMechanicalEnergyM2S2(state.position, state.velocity, mu),
            "analytic",
            capture.elements.semiMajorAxisM,
            capture.elements.eccentricity,
            timeS - capture.timeS,
          ),
          state,
        );
      } else {
        frame = sampleState(state, timeS, env, propulsion, throttle, pitchDeg, direction, since);
        if (capture && timeS === capture.timeS) {
          frame = {
            ...frame,
            semiMajorAxisM: capture.elements.semiMajorAxisM,
            eccentricity: capture.elements.eccentricity,
            timeSinceElementsS: 0,
          };
        }
      }
      if (n % FRAME_STRIDE === 0) frames.push(frame);
      if (n % logEvery === 0) {
        samples.push(frame);
        logLines.push(formatLogLine(frame));
      }
    }

    if (n === steps) break;
    if (capture) {
      state = advanceAttitude(state, 1 / STEP_HZ, substeps);
      continue;
    }
    state = stepCommanded(state, timeS, 1 / STEP_HZ, substeps, env, propulsion, cutoff, direction, mark);
  }

  const finalMassKg = state.totalMassKg;
  const ideal = idealRocketDeltaVMps(propulsion, initialMassKg, finalMassKg);
  const achieved = state.velocity.sub(initialVelocity).magnitude;
  const thrustDv = state.thrustIntegratedDeltaVMps;
  const difference = ideal - achieved;
  const relativeError = ideal > 0 ? Math.abs(achieved - ideal) / ideal : 0;

  logLines.push(`ideal_dv_m_s=${ideal.toFixed(6)}`);
  logLines.push(`achieved_dv_m_s=${achieved.toFixed(6)}`);
  logLines.push(`thrust_integrated_dv_m_s=${thrustDv.toFixed(6)}`);
  logLines.push(`difference_ideal_minus_achieved_m_s=${difference.toFixed(6)}`);
  logLines.push(`relative_error=${(relativeError * 100).toFixed(8)} %`);
  logLines.push(capture ? "verdict=ANALYTIC_KEPLER" : "verdict=CONTINUOUS_THRUST");

  return {
    disableGravityAndAtmosphere,
    substeps,
    samples,
    frames,
    logLines,
    logText: logLines.join("\n"),
    initialMassKg,
    finalMassKg,
    initialVelocity,
    finalPosition: state.position,
    finalVelocity: state.velocity,
    idealDeltaVMps: ideal,
    achievedDeltaVMps: achieved,
    thrustIntegratedDeltaVMps: thrustDv,
    differenceMps: difference,
    relativeError,
    vacuumCheckApplies: false,
    vacuumCheckPassed: true,
    pitchProgram: pitchAngleDeg(endTimeS, program) === 0 ? null : program,
    cutoff: capture ? cutoff : null,
    endTimeS,
    analyticKepler: capture !== null,
    keplerCapture: capture,
  };
}

function closeReport(
  state: VehicleState,
  initialVelocity: Vector3d,
  initialMassKg: number,
  propulsion: ReturnType<typeof createDefaultPropulsion>,
  disableGravityAndAtmosphere: boolean,
  substeps: number,
  samples: TelemetryFrame[],
  frames: TelemetryFrame[],
  logLines: string[],
  endTimeS: number,
  verdict: string,
  extra: Partial<SimulationReport> = {},
): SimulationReport {
  const finalMassKg = state.totalMassKg;
  const ideal = idealRocketDeltaVMps(propulsion, initialMassKg, finalMassKg);
  const achieved = state.velocity.sub(initialVelocity).magnitude;
  const thrustDv = state.thrustIntegratedDeltaVMps;
  const difference = ideal - achieved;
  const relativeError = ideal > 0 ? Math.abs(achieved - ideal) / ideal : 0;
  logLines.push(`ideal_dv_m_s=${ideal.toFixed(6)}`);
  logLines.push(`achieved_dv_m_s=${achieved.toFixed(6)}`);
  logLines.push(`thrust_integrated_dv_m_s=${thrustDv.toFixed(6)}`);
  logLines.push(`difference_ideal_minus_achieved_m_s=${difference.toFixed(6)}`);
  logLines.push(`relative_error=${(relativeError * 100).toFixed(8)} %`);
  logLines.push(verdict);
  return {
    disableGravityAndAtmosphere,
    substeps,
    samples,
    frames,
    logLines,
    logText: logLines.join("\n"),
    initialMassKg,
    finalMassKg,
    initialVelocity,
    finalPosition: state.position,
    finalVelocity: state.velocity,
    idealDeltaVMps: ideal,
    achievedDeltaVMps: achieved,
    thrustIntegratedDeltaVMps: thrustDv,
    differenceMps: difference,
    relativeError,
    vacuumCheckApplies: false,
    vacuumCheckPassed: true,
    pitchProgram: null,
    cutoff: null,
    endTimeS,
    ...extra,
  };
}

/**
 * Pass 5. Pure vertical thrust from the Mars surface.
 * Same RK4 step and vehicle as Earth. Does not run when Earth is selected.
 */
export function runMarsVerticalBurn(
  disableGravityAndAtmosphere: boolean,
  substeps = 1,
  durationS = MARS_SURFACE_BURN_S,
  angularVelocityBody: Vector3d = Vector3d.zero,
  gimbalRad = 0,
): SimulationReport {
  if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
  const steps = Math.round(durationS * STEP_HZ);
  if (!(steps > 0) || Math.abs(durationS * STEP_HZ - steps) > 1e-6) throw new Error("end time must land on the 50 Hz step grid");

  const env = createMarsEnvironment({
    gravityEnabled: !disableGravityAndAtmosphere,
    atmosphereEnabled: !disableGravityAndAtmosphere,
    includeJ2: false,
  });
  const propulsion = createDefaultPropulsion();
  let state = createSeaLevelState(env, angularVelocityBody, gimbalRad, false);
  const initialVelocity = state.velocity;
  const initialMassKg = state.totalMassKg;
  const logEvery = LOG_INTERVAL_S * STEP_HZ;
  const samples: TelemetryFrame[] = [];
  const frames: TelemetryFrame[] = [];
  const logLines: string[] = [];
  const mode = disableGravityAndAtmosphere ? "VACUUM" : "MARS";
  logLines.push(
    `ARES CORE mars vertical burn | mode=${mode} | body=Mars | thrust=+Y | throttle=1 | end=${durationS} s | dt=0.02 s`,
  );

  for (let n = 0; n <= steps; n++) {
    const timeS = n / STEP_HZ;
    if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
      const frame = sampleState(state, timeS, env, propulsion, 1);
      if (n % FRAME_STRIDE === 0) frames.push(frame);
      if (n % logEvery === 0) {
        samples.push(frame);
        logLines.push(formatLogLine(frame));
      }
    }
    if (n === steps) break;
    state = stepRk4(state, 1 / STEP_HZ, substeps, env, propulsion, 1);
  }

  return closeReport(
    state,
    initialVelocity,
    initialMassKg,
    propulsion,
    disableGravityAndAtmosphere,
    substeps,
    samples,
    frames,
    logLines,
    durationS,
    "verdict=MARS_SURFACE_BURN",
  );
}

/**
 * Pass 5 entry interface. Engines stay off.
 * Numerical coast uses RK4 with the active atmosphere. Analytic Kepler ignores drag.
 */
export function runMarsEntry(
  disableGravityAndAtmosphere: boolean,
  substeps = 1,
  analytic = false,
  endTimeS = MARS_ENTRY_END_S,
  entry: EntryInterface = MARS_ENTRY_INTERFACE,
  angularVelocityBody: Vector3d = Vector3d.zero,
  gimbalRad = 0,
): SimulationReport {
  if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
  const steps = Math.round(endTimeS * STEP_HZ);
  if (!(steps > 0) || Math.abs(endTimeS * STEP_HZ - steps) > 1e-6) throw new Error("end time must land on the 50 Hz step grid");

  const env: PlanetaryEnvironment = createMarsEnvironment({
    gravityEnabled: !disableGravityAndAtmosphere,
    atmosphereEnabled: !disableGravityAndAtmosphere,
    includeJ2: false,
  });
  const propulsion = createDefaultPropulsion();
  let state = createEntryState(env, entry, angularVelocityBody, gimbalRad, false);
  const initialVelocity = state.velocity;
  const initialMassKg = state.totalMassKg;
  const mu = env.gravityEnabled ? env.muM3S2 : 0;
  const logEvery = LOG_INTERVAL_S * STEP_HZ;
  const samples: TelemetryFrame[] = [];
  const frames: TelemetryFrame[] = [];
  const logLines: string[] = [];
  const mode = disableGravityAndAtmosphere ? "VACUUM" : "MARS";
  logLines.push(
    `ARES CORE mars entry | mode=${mode} | body=Mars | h0=${entry.altitudeM} m | v0=${entry.speedMps} m/s | gamma0=${entry.flightPathDeg} deg | mp=${entry.propellantKg} kg | coast=${analytic ? "analytic" : "numerical"} | end=${endTimeS} s | dt=0.02 s`,
  );

  let capture: KeplerCapture | null = null;
  if (analytic) {
    capture = {
      timeS: 0,
      position: state.position,
      velocity: state.velocity,
      muM3S2: mu,
      propellantKg: state.propellantMassKg,
      totalMassKg: state.totalMassKg,
      thrustIntegratedDeltaVMps: state.thrustIntegratedDeltaVMps,
      elements: keplerElements(state.position, state.velocity, mu),
    };
  }

  for (let n = 0; n <= steps; n++) {
    const timeS = n / STEP_HZ;
    if (capture && timeS > capture.timeS) {
      const propagated = propagateKepler(capture.position, capture.velocity, capture.muM3S2, timeS - capture.timeS);
      state = withTranslation(
        state,
        propagated.position,
        propagated.velocity,
        capture.propellantKg,
        capture.totalMassKg,
        capture.thrustIntegratedDeltaVMps,
      );
    }

    const onAnalyticArc = capture !== null && timeS > capture.timeS;
    if (n % logEvery === 0 || n % FRAME_STRIDE === 0) {
      let frame: TelemetryFrame;
      if (onAnalyticArc && capture) {
        const force = analyticForce(state.position, capture.totalMassKg, mu, env.equatorialRadiusM);
        frame = stampAttitude(
          frameFromForce(
            timeS,
            state.velocity,
            state.position,
            capture.propellantKg,
            force,
            0,
            0,
            timeS,
            specificMechanicalEnergyM2S2(state.position, state.velocity, mu),
            "analytic",
            capture.elements.semiMajorAxisM,
            capture.elements.eccentricity,
            timeS - capture.timeS,
            env.name,
            env.speedOfSoundMps,
          ),
          state,
        );
      } else {
        frame = sampleState(state, timeS, env, propulsion, 0, 0, Vector3d.up, timeS);
        if (capture && timeS === capture.timeS) {
          frame = {
            ...frame,
            semiMajorAxisM: capture.elements.semiMajorAxisM,
            eccentricity: capture.elements.eccentricity,
            timeSinceElementsS: 0,
          };
        }
      }
      if (n % FRAME_STRIDE === 0) frames.push(frame);
      if (n % logEvery === 0) {
        samples.push(frame);
        logLines.push(formatLogLine(frame));
      }
    }

    if (n === steps) break;
    if (capture) {
      state = advanceAttitude(state, 1 / STEP_HZ, substeps);
      continue;
    }
    state = stepRk4(state, 1 / STEP_HZ, substeps, env, propulsion, 0);
  }

  return closeReport(
    state,
    initialVelocity,
    initialMassKg,
    propulsion,
    disableGravityAndAtmosphere,
    substeps,
    samples,
    frames,
    logLines,
    endTimeS,
    analytic ? "verdict=MARS_ENTRY_ANALYTIC" : "verdict=MARS_ENTRY_NUMERICAL",
    { analyticKepler: analytic, keplerCapture: capture },
  );
}

const TERMINAL_FRAME_STRIDE = 50;

/**
 * Mars entry with a torque-driven flip and landing burn.
 * Not called by any Pass 1–5 path. Engines stay off until the 3 km trigger.
 */
export function runMarsTerminalLanding(
  disableGravityAndAtmosphere: boolean,
  substeps = 1,
  config: TerminalSequenceConfig = DEFAULT_TERMINAL_SEQUENCE,
  entry: EntryInterface = MARS_ENTRY_INTERFACE,
  angularVelocityBody: Vector3d = Vector3d.zero,
  gimbalRad = 0,
): SimulationReport {
  if (!Number.isInteger(substeps) || substeps < 1) throw new Error("substeps must be a positive integer");
  const dt = 1 / STEP_HZ;
  const maxSteps = Math.round(TERMINAL_MAX_TIME_S * STEP_HZ);
  const logEvery = LOG_INTERVAL_S * STEP_HZ;

  const env = createMarsEnvironment({
    gravityEnabled: !disableGravityAndAtmosphere,
    atmosphereEnabled: !disableGravityAndAtmosphere,
    includeJ2: false,
  });
  const propulsion = createDefaultPropulsion();
  let state = createEntryState(env, entry, angularVelocityBody, gimbalRad, false);
  const initialVelocity = state.velocity;
  const initialMassKg = state.totalMassKg;
  const sequence = new TerminalSequence(config);
  const samples: TelemetryFrame[] = [];
  const frames: TelemetryFrame[] = [];
  const logLines: string[] = [];
  const mode = disableGravityAndAtmosphere ? "VACUUM" : "MARS";
  const triggerLabel = config.triggerTimeS !== null ? `t:${config.triggerTimeS}` : `h:${config.triggerAltitudeM ?? "none"}`;
  const proportional = config.guidanceMode === "Proportional";
  const rawFraction = config.horizontalFraction;
  const hfSuffix = !proportional && typeof rawFraction === "number" && rawFraction > 0 ? ` | hf=${(rawFraction > 1 ? 1 : rawFraction).toFixed(4)}` : "";
  const guideSuffix = proportional
    ? ` | guide=Proportional | k=${(config.proportionalGain ?? 1).toFixed(4)} | vref=${(config.proportionalSpeedRefMps ?? 500).toFixed(3)} | hf_max=${(config.maxHorizontalFraction ?? 0.75).toFixed(4)}`
    : "";
  logLines.push(
    `ARES CORE mars terminal | mode=${mode} | body=Mars | trigger=${triggerLabel} | flip=${config.flipDurationS} s | flip_throttle=${config.flipThrottle} | landing_throttle=${config.landingThrottle} | dt=0.02 s${hfSuffix}${guideSuffix}`,
  );

  let loggedPhase: string | null = null;
  let peak = state.velocity.magnitude;
  let impact: ImpactAssessment | null = null;
  let endTimeS = 0;

  const pushFrame = (frame: TelemetryFrame, sample: boolean) => {
    frames.push(frame);
    if (!sample) return;
    samples.push(frame);
    logLines.push(formatLogLine(frame) + formatTerminalSuffix(frame));
  };

  for (let n = 0; n <= maxSteps; n++) {
    const timeS = n / STEP_HZ;
    const height = altitudeM(env, state.position);
    const speed = state.velocity.magnitude;
    if (speed > peak) peak = speed;
    const command = sequence.command(
      timeS,
      state.position,
      state.velocity,
      state.propellantMassKg,
      height,
      state.attitude,
      state.angularVelocityBody.z,
    );
    const flipping = command.bodyThrust === true && config.flipControllerEnabled !== false;
    state = {
      ...state,
      controllerEnabled: flipping,
      pitchTargetRad: flipping ? verticalTargetRad(state.position) : 0,
      flipHold: flipping,
    };
    const phaseChanged = command.phase !== loggedPhase;
    const onLog = n % logEvery === 0;
    const onFrame = n % TERMINAL_FRAME_STRIDE === 0;
    if (onFrame || onLog || phaseChanged) {
      pushFrame(decorateTerminal(state, timeS, env, propulsion, command, null, peak), onLog || phaseChanged);
      loggedPhase = command.phase;
    }

    if (height <= 0) {
      impact = assessImpact(state, Math.max(peak, state.velocity.magnitude));
      if (command.phase === "Flip") impact = { ...impact, flag: "RUD" };
      const landed = { ...state, position: state.position.magnitude > 0 ? state.position.normalized.scale(env.equatorialRadiusM) : new Vector3d(0, env.equatorialRadiusM, 0) };
      pushFrame(decorateTerminal(landed, timeS, env, propulsion, impactCommand(config, landed, command), impact, impact.peakSpeedMps), true);
      endTimeS = timeS;
      state = landed;
      break;
    }

    if (n === maxSteps) {
      endTimeS = timeS;
      break;
    }

    const before = cloneState(state);
    state = stepRk4(state, dt, substeps, env, propulsion, command.throttle, command.direction);
    const nextHeight = altitudeM(env, state.position);
    if (nextHeight <= 0 && height > 0) {
      const hit = surfaceState(before, state, env.equatorialRadiusM);
      state = hit.state;
      endTimeS = timeS + hit.u * dt;
      const hitSpeed = state.velocity.magnitude;
      if (hitSpeed > peak) peak = hitSpeed;
      impact = assessImpact(state, peak);
      if (command.phase === "Flip") impact = { ...impact, flag: "RUD" };
      const hitCommand = sequence.command(
        endTimeS,
        state.position,
        state.velocity,
        state.propellantMassKg,
        0,
        state.attitude,
        state.angularVelocityBody.z,
      );
      pushFrame(
        decorateTerminal(state, endTimeS, env, propulsion, impactCommand(config, state, hitCommand), impact, peak),
        true,
      );
      break;
    }
  }

  return closeReport(
    state,
    initialVelocity,
    initialMassKg,
    propulsion,
    disableGravityAndAtmosphere,
    substeps,
    samples,
    frames,
    logLines,
    endTimeS,
    impact ? (impact.flag === "nominal" ? "verdict=TERMINAL_NOMINAL" : "verdict=TERMINAL_RUD") : "verdict=TERMINAL_NO_IMPACT",
    {
      terminal: {
        config,
        triggerTimeS: sequence.triggerTimeS,
        impact,
        peakSpeedMps: peak,
      },
    },
  );
}

function impactCommand(config: TerminalSequenceConfig, state: VehicleState, command: TerminalCommand): TerminalCommand {
  const settled: TerminalCommand = { ...command, phase: "Complete", throttle: 0 };
  if (config.guidanceMode === "Proportional") {
    const fraction = proportionalHorizontalFraction(config, state.position, state.velocity);
    const up = state.position.magnitude > 0 ? state.position.normalized : Vector3d.up;
    const aim = landingThrustDirection(up, state.velocity, fraction > 1 ? 1 : fraction);
    return {
      ...settled,
      direction: aim.direction,
      pitchFromVerticalDeg: aim.pitchFromVerticalDeg,
      horizontalFraction: fraction,
      guidanceMode: "Proportional",
    };
  }
  const fraction = config.horizontalFraction;
  if (!(typeof fraction === "number") || !(fraction > 0)) return settled;
  const clamped = fraction > 1 ? 1 : fraction;
  const up = state.position.magnitude > 0 ? state.position.normalized : Vector3d.up;
  const aim = landingThrustDirection(up, state.velocity, clamped);
  return {
    ...settled,
    direction: aim.direction,
    pitchFromVerticalDeg: aim.pitchFromVerticalDeg,
    horizontalFraction: clamped,
  };
}

function decorateTerminal(
  state: VehicleState,
  timeS: number,
  env: PlanetaryEnvironment,
  propulsion: ReturnType<typeof createDefaultPropulsion>,
  command: TerminalCommand,
  impact: ImpactAssessment | null,
  peakSpeedMps: number,
): TelemetryFrame {
  const frame = sampleState(
    state,
    timeS,
    env,
    propulsion,
    command.throttle,
    inertialPitchFromYDeg(command.direction),
    command.direction,
    0,
  );
  const radial = state.position.magnitude > 0 ? state.velocity.dot(state.position.normalized) : 0;
  return {
    ...frame,
    altitudeM: impact ? 0 : frame.altitudeM,
    sequencePhase: impact ? "Complete" : command.phase,
    thrustPitchFromVerticalDeg: command.pitchFromVerticalDeg,
    radialMps: radial,
    impactFlag: impact?.flag ?? "",
    impactKineticEnergyJ: impact?.kineticEnergyJ,
    impactSpeedMps: impact?.speedMps,
    impactVerticalMps: impact?.verticalMps,
    impactHorizontalMps: impact?.horizontalMps,
    peakSpeedMps,
    ...(command.guidanceMode === "Proportional"
      ? { guidanceMode: "Proportional" as const, horizontalFraction: command.horizontalFraction ?? 0 }
      : command.horizontalFraction !== undefined && command.horizontalFraction > 0
        ? { horizontalFraction: command.horizontalFraction }
        : {}),
  };
}


