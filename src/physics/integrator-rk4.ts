import { DRY_MASS_KG } from "./constants.ts";
import {
  altitudeM,
  atmosphericDensityKgM3,
  gravitationalAcceleration,
  type PlanetaryEnvironment,
} from "./planetary-environment.ts";
import { isFiring, massFlowKgS, thrustMagnitudeN, type PropulsionModel } from "./propulsion.ts";
import { effectiveGimbalRad } from "./attitude-controller.ts";
import { aerodynamicMoment } from "./aero-moment.ts";
import { bodyThrustDirection, gimbalMoment, integrateEulerRk4, integrateEulerSubsteps } from "./cylinder-inertia.ts";
import { QuaternionD } from "./quaternion.ts";
import { cloneState, type VehicleState } from "./vehicle-state.ts";
import { Vector3d } from "./vector3d.ts";

export interface ForceEvaluation {
  altitudeM: number;
  massKg: number;
  acceleration: Vector3d;
  accelerationMagnitudeMps2: number;
  thrustN: number;
  thrustAccelMps2: number;
  dragN: number;
  dragAccel: Vector3d;
  gravityMps2: number;
  gravityAccel: Vector3d;
  densityKgM3: number;
  dynamicPressurePa: number;
  massFlowKgS: number;
}

interface Derivative {
  dr: Vector3d;
  dv: Vector3d;
  dPropellant: number;
  dThrustDeltaV: number;
}

function massFromPropellant(propellantKg: number): number {
  return DRY_MASS_KG + Math.max(propellantKg, 0);
}

/**
 * Translational forces at a state.
 * a = g(r) + T/m + D/m
 * D = −v̂ · (½ ρ v² Cd A), ρ = ρ0 exp(−h/H), no wind, non-rotating atmosphere.
 */
export function evaluateForces(
  position: Vector3d,
  velocity: Vector3d,
  propellantKg: number,
  env: PlanetaryEnvironment,
  propulsion: PropulsionModel,
  throttle: number,
  thrustDirection?: Vector3d,
): ForceEvaluation {
  const massKg = massFromPropellant(propellantKg);
  const height = altitudeM(env, position);
  const gravityAccel = gravitationalAcceleration(env, position);
  const density = atmosphericDensityKgM3(env, position);
  const speed = velocity.magnitude;
  const dynamicPressurePa = 0.5 * density * speed * speed;

  let dragN = 0;
  let dragAccel = Vector3d.zero;
  if (speed > 0 && density > 0 && propulsion.dragCd > 0 && propulsion.dragAreaM2 > 0) {
    dragN = dynamicPressurePa * propulsion.dragCd * propulsion.dragAreaM2;
    dragAccel = velocity.scale(-dragN / (speed * massKg));
  }

  const thrustN = thrustMagnitudeN(propulsion, throttle, propellantKg);
  const direction = thrustDirection ?? propulsion.thrustDirectionInertial;
  const thrustAccel = direction.scale(thrustN / massKg);
  const acceleration = gravityAccel.add(thrustAccel).add(dragAccel);

  return {
    altitudeM: height,
    massKg,
    acceleration,
    accelerationMagnitudeMps2: acceleration.magnitude,
    thrustN,
    thrustAccelMps2: massKg > 0 ? thrustN / massKg : 0,
    dragN,
    dragAccel,
    gravityMps2: gravityAccel.magnitude,
    gravityAccel,
    densityKgM3: density,
    dynamicPressurePa,
    massFlowKgS: massFlowKgS(propulsion, throttle, propellantKg),
  };
}

function derivative(
  state: VehicleState,
  env: PlanetaryEnvironment,
  propulsion: PropulsionModel,
  throttle: number,
  thrustDirection?: Vector3d,
): Derivative {
  const force = evaluateForces(
    state.position,
    state.velocity,
    state.propellantMassKg,
    env,
    propulsion,
    throttle,
    thrustDirection,
  );
  return {
    dr: state.velocity,
    dv: force.acceleration,
    dPropellant: -force.massFlowKgS,
    dThrustDeltaV: force.thrustAccelMps2,
  };
}

function advance(state: VehicleState, deriv: Derivative, h: number): VehicleState {
  const propellant = state.propellantMassKg + deriv.dPropellant * h;
  return {
    position: state.position.add(deriv.dr.scale(h)),
    velocity: state.velocity.add(deriv.dv.scale(h)),
    propellantMassKg: propellant,
    totalMassKg: massFromPropellant(propellant),
    thrustIntegratedDeltaVMps: state.thrustIntegratedDeltaVMps + deriv.dThrustDeltaV * h,
    attitude: state.attitude,
    initialAttitude: state.initialAttitude,
    angularVelocityBody: state.angularVelocityBody,
    gimbalRad: state.gimbalRad,
    controllerEnabled: state.controllerEnabled,
    pitchTargetRad: state.pitchTargetRad,
    flipHold: state.flipHold,
  };
}

function sumDeriv(a: Derivative, b: Derivative): Derivative {
  return {
    dr: a.dr.add(b.dr),
    dv: a.dv.add(b.dv),
    dPropellant: a.dPropellant + b.dPropellant,
    dThrustDeltaV: a.dThrustDeltaV + b.dThrustDeltaV,
  };
}

function scaleDeriv(d: Derivative, s: number): Derivative {
  return {
    dr: d.dr.scale(s),
    dv: d.dv.scale(s),
    dPropellant: d.dPropellant * s,
    dThrustDeltaV: d.dThrustDeltaV * s,
  };
}

function rk4(
  state: VehicleState,
  dt: number,
  env: PlanetaryEnvironment,
  propulsion: PropulsionModel,
  throttle: number,
  thrustDirection?: Vector3d,
): VehicleState {
  const gimbal = effectiveGimbalRad(state);
  if (gimbal !== 0 && throttle > 0) {
    thrustDirection = state.attitude.rotate(bodyThrustDirection(gimbal));
  }
  const k1 = derivative(state, env, propulsion, throttle, thrustDirection);
  const k2 = derivative(advance(state, k1, dt * 0.5), env, propulsion, throttle, thrustDirection);
  const k3 = derivative(advance(state, k2, dt * 0.5), env, propulsion, throttle, thrustDirection);
  const k4 = derivative(advance(state, k3, dt), env, propulsion, throttle, thrustDirection);
  const combined = scaleDeriv(sumDeriv(k1, sumDeriv(scaleDeriv(k2, 2), sumDeriv(scaleDeriv(k3, 2), k4))), 1 / 6);
  const next = advance(state, combined, dt);
  if (next.propellantMassKg < 0) {
    next.propellantMassKg = 0;
    next.totalMassKg = DRY_MASS_KG;
  } else {
    next.totalMassKg = massFromPropellant(next.propellantMassKg);
  }
  const aero = state.flipHold
    ? Vector3d.zero
    : aerodynamicMoment(state.attitude, state.velocity, atmosphericDensityKgM3(env, state.position));
  const aeroOn = aero.x !== 0 || aero.y !== 0 || aero.z !== 0;
  if (!aeroOn) {
    if (gimbal !== 0) {
      const moment = gimbalMoment(thrustMagnitudeN(propulsion, throttle, next.propellantMassKg), gimbal);
      if (moment.x !== 0 || moment.y !== 0 || moment.z !== 0 || !QuaternionD.angularVelocityIsZero(state.angularVelocityBody)) {
        const rotation = integrateEulerRk4(state.attitude, state.angularVelocityBody, next.totalMassKg, dt, moment);
        next.attitude = rotation.attitude;
        next.angularVelocityBody = rotation.omega;
      }
    } else if (!QuaternionD.angularVelocityIsZero(state.angularVelocityBody)) {
      const rotation = integrateEulerRk4(state.attitude, state.angularVelocityBody, next.totalMassKg, dt);
      next.attitude = rotation.attitude;
      next.angularVelocityBody = rotation.omega;
    }
  } else {
    let moment = aero;
    if (gimbal !== 0) {
      const thrustMoment = gimbalMoment(thrustMagnitudeN(propulsion, throttle, next.propellantMassKg), gimbal);
      moment = new Vector3d(thrustMoment.x + aero.x, thrustMoment.y + aero.y, thrustMoment.z + aero.z);
    }
    const rotation = integrateEulerRk4(state.attitude, state.angularVelocityBody, next.totalMassKg, dt, moment);
    next.attitude = rotation.attitude;
    next.angularVelocityBody = rotation.omega;
  }
  return next;
}

function stepOne(
  state: VehicleState,
  dt: number,
  env: PlanetaryEnvironment,
  propulsion: PropulsionModel,
  throttle: number,
  thrustDirection?: Vector3d,
): VehicleState {
  if (!(dt > 0)) return state;

  if (state.propellantMassKg <= 0 || !(throttle > 0)) {
    const coast = cloneState(state);
    coast.propellantMassKg = Math.max(0, coast.propellantMassKg);
    coast.totalMassKg = massFromPropellant(coast.propellantMassKg);
    return rk4(coast, dt, env, propulsion, 0, thrustDirection);
  }

  const mdot = massFlowKgS(propulsion, throttle, state.propellantMassKg);
  if (mdot > 0 && state.propellantMassKg < mdot * dt) {
    const dtBurn = state.propellantMassKg / mdot;
    let burned = state;
    if (dtBurn > 0) burned = rk4(state, dtBurn, env, propulsion, throttle, thrustDirection);
    burned.propellantMassKg = 0;
    burned.totalMassKg = DRY_MASS_KG;
    const dtCoast = dt - dtBurn;
    if (dtCoast > 1e-12) return rk4(burned, dtCoast, env, propulsion, 0, thrustDirection);
    return burned;
  }

  return rk4(state, dt, env, propulsion, throttle, thrustDirection);
}

/**
 * Advance the vehicle by `dt` seconds using `substeps` equal RK4 sub-steps.
 * Attitude and body rate advance on the same sub-steps.
 * A zero gimbal and a zero aerodynamic moment leave the thrust line on the body axis, so this
 * step is the Pass 10 integrator. A non-zero gimbal holds the thrust vector off +Y in the
 * body frame, points the translational thrust along it, and applies M = r × F.
 * Aerodynamic moment is added only when density and angle of attack are both non-zero.
 * It does not enter the translational force sum. Identically zero ω, zero gimbal, and zero
 * aero moment leave the quaternion untouched.
 * Mutates nothing: returns the next state.
 */
export function stepRk4(
  state: VehicleState,
  dt: number,
  substeps: number,
  env: PlanetaryEnvironment,
  propulsion: PropulsionModel,
  throttle: number,
  thrustDirection?: Vector3d,
): VehicleState {
  if (!Number.isInteger(substeps) || substeps < 1) {
    throw new Error("substeps must be a positive integer");
  }
  const h = dt / substeps;
  let next = state;
  for (let i = 0; i < substeps; i++) {
    next = stepOne(next, h, env, propulsion, isFiring(throttle, next.propellantMassKg) ? throttle : 0, thrustDirection);
  }
  return next;
}

/**
 * Torque-free attitude on an analytic coast. Translation is not touched.
 * Identically zero ω returns the same state object.
 */
export function advanceAttitude(state: VehicleState, dt: number, substeps: number): VehicleState {
  if (QuaternionD.angularVelocityIsZero(state.angularVelocityBody)) return state;
  const rotation = integrateEulerSubsteps(state.attitude, state.angularVelocityBody, state.totalMassKg, dt, substeps);
  return {
    ...state,
    attitude: rotation.attitude,
    angularVelocityBody: rotation.omega,
  };
}
