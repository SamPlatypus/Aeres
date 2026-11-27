import { DRY_MASS_KG, INITIAL_PROPELLANT_KG, MARS_ENTRY_ALTITUDE_M, MARS_ENTRY_FLIGHT_PATH_DEG, MARS_ENTRY_PROPELLANT_KG, MARS_ENTRY_SPEED_MPS } from "./constants.ts";
import { QuaternionD } from "./quaternion.ts";
import { Vector3d } from "./vector3d.ts";
import type { PlanetaryEnvironment } from "./planetary-environment.ts";

export interface VehicleState {
  position: Vector3d;
  velocity: Vector3d;
  totalMassKg: number;
  propellantMassKg: number;
  /** ∫ |a_thrust| dt accumulated by the same RK4 weights as velocity. */
  thrustIntegratedDeltaVMps: number;
  /** Body-to-inertial attitude. Identity unless overridden. */
  attitude: QuaternionD;
  /** Attitude at initialization. The integrator does not change it. */
  initialAttitude: QuaternionD;
  /** Body-frame angular velocity, rad/s. Torque-free Euler when non-zero and the gimbal is zero. */
  angularVelocityBody: Vector3d;
  /** Constant deflection of thrust from body +Y toward +X, radians. Zero keeps Pass 10. Ignored while the attitude controller is on. */
  gimbalRad: number;
  /** Pitch PD commands the gimbal. Off leaves gimbalRad as the open-loop deflection. */
  controllerEnabled: boolean;
  /** Inertial pitch the PD holds. Zero is body +Y along inertial +Y. */
  pitchTargetRad: number;
  /** Flip only. Rotational torque is the gimbal moment; aerodynamic moment stays on every other path. */
  flipHold: boolean;
}

function kinematicRest(angularVelocityBody: Vector3d = Vector3d.zero, gimbalRad = 0, controllerEnabled = true) {
  return {
    attitude: QuaternionD.identity,
    initialAttitude: QuaternionD.identity,
    angularVelocityBody,
    gimbalRad,
    controllerEnabled,
    pitchTargetRad: 0,
    flipHold: false,
  };
}

export function createSeaLevelState(
  env: PlanetaryEnvironment,
  angularVelocityBody: Vector3d = Vector3d.zero,
  gimbalRad = 0,
  controllerEnabled = true,
): VehicleState {
  return {
    position: new Vector3d(0, env.equatorialRadiusM, 0),
    velocity: Vector3d.zero,
    totalMassKg: DRY_MASS_KG + INITIAL_PROPELLANT_KG,
    propellantMassKg: INITIAL_PROPELLANT_KG,
    thrustIntegratedDeltaVMps: 0,
    ...kinematicRest(angularVelocityBody, gimbalRad, controllerEnabled),
  };
}

export interface EntryInterface {
  altitudeM: number;
  speedMps: number;
  flightPathDeg: number;
  propellantKg: number;
}

/** 125 km, 6000 m/s, −12°. Engines are not part of the state. */
export const MARS_ENTRY_INTERFACE: EntryInterface = {
  altitudeM: MARS_ENTRY_ALTITUDE_M,
  speedMps: MARS_ENTRY_SPEED_MPS,
  flightPathDeg: MARS_ENTRY_FLIGHT_PATH_DEG,
  propellantKg: MARS_ENTRY_PROPELLANT_KG,
};

/** Same object as the verified interface when the three knobs are at their defaults. */
export function marsEntryOrDefault(speedMps: number, propellantKg: number, flightPathDeg: number): EntryInterface {
  if (
    speedMps === MARS_ENTRY_SPEED_MPS &&
    propellantKg === MARS_ENTRY_PROPELLANT_KG &&
    flightPathDeg === MARS_ENTRY_FLIGHT_PATH_DEG
  ) {
    return MARS_ENTRY_INTERFACE;
  }
  return {
    altitudeM: MARS_ENTRY_ALTITUDE_M,
    speedMps,
    flightPathDeg,
    propellantKg,
  };
}

/**
 * Inertial entry state on the active body.
 * Position is along +Y at R + h. Velocity is in the XY plane.
 * Flight-path angle is from the local horizontal, negative downward.
 * Attitude starts at identity unless a body rate is supplied; the quaternion stays identity.
 */
export function createEntryState(
  env: PlanetaryEnvironment,
  entry: EntryInterface = MARS_ENTRY_INTERFACE,
  angularVelocityBody: Vector3d = Vector3d.zero,
  gimbalRad = 0,
  controllerEnabled = true,
): VehicleState {
  const radius = env.equatorialRadiusM + entry.altitudeM;
  const gamma = (entry.flightPathDeg * Math.PI) / 180;
  return {
    position: new Vector3d(0, radius, 0),
    velocity: new Vector3d(entry.speedMps * Math.cos(gamma), entry.speedMps * Math.sin(gamma), 0),
    totalMassKg: DRY_MASS_KG + entry.propellantKg,
    propellantMassKg: entry.propellantKg,
    thrustIntegratedDeltaVMps: 0,
    ...kinematicRest(angularVelocityBody, gimbalRad, controllerEnabled),
  };
}

export function cloneState(state: VehicleState): VehicleState {
  return {
    position: state.position,
    velocity: state.velocity,
    totalMassKg: state.totalMassKg,
    propellantMassKg: state.propellantMassKg,
    thrustIntegratedDeltaVMps: state.thrustIntegratedDeltaVMps,
    attitude: state.attitude,
    initialAttitude: state.initialAttitude,
    angularVelocityBody: state.angularVelocityBody,
    gimbalRad: state.gimbalRad,
    controllerEnabled: state.controllerEnabled,
    pitchTargetRad: state.pitchTargetRad,
    flipHold: state.flipHold,
  };
}

/** Keep attitude and the constant body rate while replacing the translational state. */
export function withTranslation(
  state: VehicleState,
  position: Vector3d,
  velocity: Vector3d,
  propellantMassKg: number,
  totalMassKg: number,
  thrustIntegratedDeltaVMps: number,
): VehicleState {
  return {
    position,
    velocity,
    propellantMassKg,
    totalMassKg,
    thrustIntegratedDeltaVMps,
    attitude: state.attitude,
    initialAttitude: state.initialAttitude,
    angularVelocityBody: state.angularVelocityBody,
    gimbalRad: state.gimbalRad,
    controllerEnabled: state.controllerEnabled,
    pitchTargetRad: state.pitchTargetRad,
    flipHold: state.flipHold,
  };
}
