import type { ForceEvaluation } from "./integrator-rk4.ts";
import { eulerRate, gimbalMoment, inertialAngularMomentum, principalMoments } from "./cylinder-inertia.ts";
import { flightPathAngleDeg, horizontalSpeedMps } from "./pitch-program.ts";
import { QuaternionD } from "./quaternion.ts";
import { Vector3d } from "./vector3d.ts";
import type { VehicleState } from "./vehicle-state.ts";

export interface TelemetryFrame {
  timeS: number;
  altitudeM: number;
  speedMps: number;
  verticalMps: number;
  accelMps2: number;
  propellantKg: number;
  totalMassKg: number;
  thrustN: number;
  dynamicPressurePa: number;
  densityKgM3: number;
  dragN: number;
  gravityMps2: number;
  horizontalMps: number;
  flightPathDeg: number;
  thrustPitchDeg: number;
  radiusM: number;
  /** 1 while thrusting, 0 after cutoff. */
  engineState: number;
  /** Seconds after cutoff. 0 while the engine is on, and 0 at the cutoff instant. */
  timeSinceCutoffS: number;
  /** Specific mechanical energy, m²/s². */
  specificEnergyM2S2: number;
  /** Numerical RK4, or analytic Kepler after cutoff. */
  propagationMode: "numerical" | "analytic";
  /** Osculating semi-major axis once a Kepler state is captured. 0 before that. */
  semiMajorAxisM: number;
  eccentricity: number;
  /** Seconds since the Kepler element capture. 0 while still on RK4. */
  timeSinceElementsS: number;
  /** Active primary. Earth on every verified Pass 1–4 frame. */
  body: string;
  /** Speed divided by the body's constant speed of sound. */
  mach: number;
  /** Set only while a terminal sequence is armed. Absent on Pass 1–5 frames. */
  sequencePhase?: "Coast" | "Flip" | "LandingBurn" | "Complete";
  /** Commanded thrust angle from local up. 0 is pure vertical. */
  thrustPitchFromVerticalDeg?: number;
  /** Radial rate, positive outward. Present on terminal-sequence frames. */
  radialMps?: number;
  impactFlag?: "" | "nominal" | "RUD";
  impactKineticEnergyJ?: number;
  impactSpeedMps?: number;
  impactVerticalMps?: number;
  impactHorizontalMps?: number;
  peakSpeedMps?: number;
  /** Landing-burn horizontal fraction. Absent means the Pass 6 vertical burn. */
  horizontalFraction?: number;
  /** Set only while proportional horizontal opposition is commanding the landing burn. */
  guidanceMode?: "Proportional";
  /** Body-to-inertial quaternion, Hamilton scalar last in the name order w,x,y,z. */
  quaternionW: number;
  quaternionX: number;
  quaternionY: number;
  quaternionZ: number;
  /** |ω_body|, rad/s. */
  angularVelocityRadS: number;
  /** Body-frame angular velocity components, rad/s. */
  omegaBodyX: number;
  omegaBodyY: number;
  omegaBodyZ: number;
  /** |L| in the inertial frame, kg·m²/s. Zero when ω is zero. */
  angularMomentumKgM2S: number;
  angularMomentumInertialX: number;
  angularMomentumInertialY: number;
  angularMomentumInertialZ: number;
  /** Cylinder principal moments at this mass, kg·m². */
  inertiaIxx: number;
  inertiaIyy: number;
  inertiaIzz: number;
  /** Constant body gimbal, rad. Zero keeps the thrust line on +Y. */
  gimbalRad: number;
  /** Body-frame moment about the CoM, N·m. */
  momentX: number;
  momentY: number;
  momentZ: number;
  /** Body-frame angular acceleration, rad/s². */
  alphaX: number;
  alphaY: number;
  alphaZ: number;
  /** Rotation angle of the attitude relative to the initial quaternion, rad in [0, 2π). */
  rotationAngleRad: number;
}

export function frameFromForce(
  timeS: number,
  velocity: Vector3d,
  position: Vector3d,
  propellantKg: number,
  force: ForceEvaluation,
  thrustPitchDeg: number,
  engineState = 1,
  timeSinceCutoffS = 0,
  specificEnergyM2S2 = 0,
  propagationMode: "numerical" | "analytic" = "numerical",
  semiMajorAxisM = 0,
  eccentricity = 0,
  timeSinceElementsS = 0,
  body = "Earth",
  speedOfSoundMps = 340,
): TelemetryFrame {
  return {
    timeS,
    altitudeM: force.altitudeM,
    speedMps: velocity.magnitude,
    verticalMps: velocity.y,
    accelMps2: force.accelerationMagnitudeMps2,
    propellantKg,
    totalMassKg: force.massKg,
    thrustN: force.thrustN,
    dynamicPressurePa: force.dynamicPressurePa,
    densityKgM3: force.densityKgM3,
    dragN: force.dragN,
    gravityMps2: force.gravityMps2,
    horizontalMps: horizontalSpeedMps(position, velocity),
    flightPathDeg: flightPathAngleDeg(position, velocity),
    thrustPitchDeg,
    radiusM: position.magnitude,
    engineState,
    timeSinceCutoffS,
    specificEnergyM2S2,
    propagationMode,
    semiMajorAxisM,
    eccentricity,
    timeSinceElementsS,
    body,
    mach: speedOfSoundMps > 0 ? velocity.magnitude / speedOfSoundMps : 0,
    quaternionW: 1,
    quaternionX: 0,
    quaternionY: 0,
    quaternionZ: 0,
    angularVelocityRadS: 0,
    omegaBodyX: 0,
    omegaBodyY: 0,
    omegaBodyZ: 0,
    angularMomentumKgM2S: 0,
    angularMomentumInertialX: 0,
    angularMomentumInertialY: 0,
    angularMomentumInertialZ: 0,
    inertiaIxx: 0,
    inertiaIyy: 0,
    inertiaIzz: 0,
    gimbalRad: 0,
    momentX: 0,
    momentY: 0,
    momentZ: 0,
    alphaX: 0,
    alphaY: 0,
    alphaZ: 0,
    rotationAngleRad: 0,
  };
}

export function stampAttitude(frame: TelemetryFrame, state: VehicleState): TelemetryFrame {
  const inertia = principalMoments(state.totalMassKg);
  const angularMomentum = inertialAngularMomentum(state.attitude, state.angularVelocityBody, state.totalMassKg);
  frame.quaternionW = state.attitude.w;
  frame.quaternionX = state.attitude.x;
  frame.quaternionY = state.attitude.y;
  frame.quaternionZ = state.attitude.z;
  frame.angularVelocityRadS = state.angularVelocityBody.magnitude;
  frame.omegaBodyX = state.angularVelocityBody.x;
  frame.omegaBodyY = state.angularVelocityBody.y;
  frame.omegaBodyZ = state.angularVelocityBody.z;
  frame.angularMomentumKgM2S = angularMomentum.magnitude;
  frame.angularMomentumInertialX = angularMomentum.x;
  frame.angularMomentumInertialY = angularMomentum.y;
  frame.angularMomentumInertialZ = angularMomentum.z;
  frame.inertiaIxx = inertia.ixx;
  frame.inertiaIyy = inertia.iyy;
  frame.inertiaIzz = inertia.izz;
  frame.rotationAngleRad = QuaternionD.rotationAngleBetween(state.initialAttitude, state.attitude);
  const moment = gimbalMoment(frame.thrustN, state.gimbalRad);
  const alpha = eulerRate(state.angularVelocityBody, inertia, moment);
  frame.gimbalRad = state.gimbalRad;
  frame.momentX = moment.x;
  frame.momentY = moment.y;
  frame.momentZ = moment.z;
  frame.alphaX = alpha.x;
  frame.alphaY = alpha.y;
  frame.alphaZ = alpha.z;
  return frame;
}

export function formatLogLine(frame: TelemetryFrame): string {
  return [
    `t=${frame.timeS.toFixed(3)} s`,
    `alt=${frame.altitudeM.toFixed(3)} m`,
    `v=${frame.speedMps.toFixed(4)} m/s`,
    `vy=${frame.verticalMps.toFixed(4)} m/s`,
    `a=${frame.accelMps2.toFixed(6)} m/s^2`,
    `mp=${frame.propellantKg.toFixed(3)} kg`,
    `m=${frame.totalMassKg.toFixed(3)} kg`,
    `T=${frame.thrustN.toFixed(1)} N`,
    `Q=${frame.dynamicPressurePa.toFixed(3)} Pa`,
    `rho=${frame.densityKgM3.toFixed(8)} kg/m^3`,
    `D=${frame.dragN.toFixed(3)} N`,
    `g=${frame.gravityMps2.toFixed(6)} m/s^2`,
    `vh=${frame.horizontalMps.toFixed(4)} m/s`,
    `gamma=${frame.flightPathDeg.toFixed(4)} deg`,
    `pitch=${frame.thrustPitchDeg.toFixed(4)} deg`,
    `r=${frame.radiusM.toFixed(3)} m`,
    `eng=${frame.engineState.toFixed(0)}`,
    `tco=${frame.timeSinceCutoffS.toFixed(3)} s`,
    `eps=${frame.specificEnergyM2S2.toExponential(6)} m^2/s^2`,
    `prop=${frame.propagationMode}`,
    `a=${Number.isFinite(frame.semiMajorAxisM) ? frame.semiMajorAxisM.toFixed(3) : "inf"} m`,
    `e=${frame.eccentricity.toFixed(8)}`,
    `tke=${frame.timeSinceElementsS.toFixed(3)} s`,
    `body=${frame.body}`,
    `M=${frame.mach.toFixed(4)}`,
    `qw=${frame.quaternionW.toFixed(9)}`,
    `qx=${frame.quaternionX.toFixed(9)}`,
    `qy=${frame.quaternionY.toFixed(9)}`,
    `qz=${frame.quaternionZ.toFixed(9)}`,
    `|w|=${frame.angularVelocityRadS.toFixed(6)} rad/s`,
    `theta=${frame.rotationAngleRad.toFixed(9)} rad`,
    `wx=${frame.omegaBodyX.toFixed(9)}`,
    `wy=${frame.omegaBodyY.toFixed(9)}`,
    `wz=${frame.omegaBodyZ.toFixed(9)}`,
    `|L|=${frame.angularMomentumKgM2S.toFixed(6)} kg*m^2/s`,
    `Lix=${frame.angularMomentumInertialX.toFixed(6)}`,
    `Liy=${frame.angularMomentumInertialY.toFixed(6)}`,
    `Liz=${frame.angularMomentumInertialZ.toFixed(6)}`,
    `Ixx=${frame.inertiaIxx.toFixed(3)}`,
    `Iyy=${frame.inertiaIyy.toFixed(3)}`,
    `Izz=${frame.inertiaIzz.toFixed(3)}`,
    `gimbal=${frame.gimbalRad.toFixed(9)} rad`,
    `Mx=${frame.momentX.toFixed(3)}`,
    `My=${frame.momentY.toFixed(3)}`,
    `Mz=${frame.momentZ.toFixed(3)}`,
    `ax=${frame.alphaX.toFixed(9)}`,
    `ay=${frame.alphaY.toFixed(9)}`,
    `az=${frame.alphaZ.toFixed(9)}`,
  ].join(" | ");
}
