import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DRY_MASS_KG,
  EARTH_MU_M3_S2,
  EARTH_RADIUS_M,
  EARTH_SPEED_OF_SOUND_MPS,
  G0_MPS2,
  INITIAL_MASS_KG,
  INITIAL_PROPELLANT_KG,
  MARS_ENTRY_ALTITUDE_M,
  MARS_ENTRY_FLIGHT_PATH_DEG,
  MARS_ENTRY_PROPELLANT_KG,
  MARS_ENTRY_SPEED_MPS,
  MARS_MU_M3_S2,
  MARS_RADIUS_M,
  MARS_RHO0_KG_M3,
  MARS_SCALE_HEIGHT_M,
  MARS_SPEED_OF_SOUND_MPS,
  MAX_VACUUM_THRUST_N,
  STEP_HZ,
  VACUUM_ISP_S,
} from "./constants.ts";
import { CYLINDER_HEIGHT_M, CYLINDER_RADIUS_M, eulerRate, gimbalMoment, inertialAngularMomentum, principalMoments, THRUST_AXIAL_OFFSET_M } from "./cylinder-inertia.ts";
import { evaluateForces, stepRk4 } from "./integrator-rk4.ts";
import { keplerElements, propagateKepler } from "./kepler.ts";
import { createEarthEnvironment, createMarsEnvironment, atmosphericDensityKgM3, gravitationalAcceleration } from "./planetary-environment.ts";
import { createDefaultPropulsion, massFlowKgS, thrustMagnitudeN } from "./propulsion.ts";
import { QuaternionD } from "./quaternion.ts";
import { DEFAULT_PITCH_PROGRAM, pitchAngleDeg, PURE_VERTICAL_PROGRAM } from "./pitch-program.ts";
import { runCoastBurn, runKeplerCoast, runMarsEntry, runMarsTerminalLanding, runMarsVerticalBurn, runPitchedBurn, runVerticalBurn } from "./simulation-harness.ts";
import { TerminalSequence, touchdownFlag, EARLY_TERMINAL_SEQUENCE, DEFAULT_TERMINAL_SEQUENCE, landingThrustDirection, proportionalHorizontalFraction } from "./terminal-sequence.ts";
import { CUTOFF_AT_60_S, COAST_END_S, NO_CUTOFF } from "./cutoff.ts";
import type { TelemetryFrame } from "./telemetry.ts";
import { MARS_ENTRY_INTERFACE, marsEntryOrDefault, createSeaLevelState } from "./vehicle-state.ts";
import { Vector3d } from "./vector3d.ts";

describe("Vector3d", () => {
  it("implements dot, cross, and normalize", () => {
    const i = new Vector3d(1, 0, 0);
    const j = new Vector3d(0, 1, 0);
    const k = i.cross(j);
    assert.equal(k.x, 0);
    assert.equal(k.y, 0);
    assert.equal(k.z, 1);
    assert.equal(i.dot(j), 0);
    assert.equal(i.add(j).magnitude, Math.sqrt(2));
    const scaled = new Vector3d(0, 4, 0).normalized;
    assert.equal(scaled.y, 1);
    assert.equal(Vector3d.zero.normalized.magnitude, 0);
  });
});

describe("forces", () => {
  it("matches the sea-level drag identity and point-mass gravity", () => {
    const env = createEarthEnvironment();
    const propulsion = createDefaultPropulsion();
    const position = new Vector3d(0, EARTH_RADIUS_M, 0);
    const velocity = new Vector3d(0, 100, 0);
    const force = evaluateForces(position, velocity, INITIAL_PROPELLANT_KG, env, propulsion, 1);
    const expectedQ = 0.5 * 1.225 * 100 * 100;
    const expectedDrag = expectedQ * 0.5 * 60;
    assert.ok(Math.abs(force.dynamicPressurePa - expectedQ) < 1e-9);
    assert.ok(Math.abs(force.dragN - expectedDrag) < 1e-6);
    const g = EARTH_MU_M3_S2 / (EARTH_RADIUS_M * EARTH_RADIUS_M);
    assert.ok(Math.abs(force.gravityMps2 - g) < 1e-9);
    assert.equal(force.thrustN, MAX_VACUUM_THRUST_N);
    assert.ok(force.dragAccel.y < 0);
    assert.ok(force.gravityAccel.y < 0);
    assert.ok(force.acceleration.y > 0);
  });

  it("puts the J2 equatorial perturbation inward and the polar perturbation outward", () => {
    const env = createEarthEnvironment({ includeJ2: true });
    const point = createEarthEnvironment({ includeJ2: false });
    const equator = new Vector3d(EARTH_RADIUS_M, 0, 0);
    const pole = new Vector3d(0, 0, EARTH_RADIUS_M);
    const gEq = gravitationalAcceleration(env, equator);
    const gEq0 = gravitationalAcceleration(point, equator);
    const gPole = gravitationalAcceleration(env, pole);
    const gPole0 = gravitationalAcceleration(point, pole);
    assert.ok(gEq.magnitude > gEq0.magnitude);
    assert.ok(gPole.magnitude < gPole0.magnitude);
    assert.ok(Math.abs(gEq.y) < 1e-6);
    assert.ok(Math.abs(gEq.z) < 1e-6);
  });
});

describe("vertical burn", () => {
  it("matches the ideal rocket equation in vacuum within 0.1%", () => {
    const report = runVerticalBurn(true, 1);
    assert.equal(report.samples.length, 19);
    assert.equal(report.samples[0].timeS, 0);
    assert.equal(report.samples[18].timeS, 90);
    assert.ok(report.relativeError < 0.001, `relative error ${report.relativeError}`);
    assert.equal(report.vacuumCheckPassed, true);

    const ve = VACUUM_ISP_S * G0_MPS2;
    const mdot = MAX_VACUUM_THRUST_N / ve;
    const mf = INITIAL_MASS_KG - mdot * 90;
    assert.ok(Math.abs(report.finalMassKg - mf) < 1e-4, `mf ${report.finalMassKg} expected ${mf}`);
    assert.ok(Math.abs(report.finalMassKg - (DRY_MASS_KG + report.samples[18].propellantKg)) < 1e-6);
    assert.ok(report.samples[18].propellantKg < INITIAL_PROPELLANT_KG);
    assert.equal(report.samples[18].densityKgM3, 0);
    assert.equal(report.samples[18].dragN, 0);
    assert.equal(report.samples[18].gravityMps2, 0);
    assert.ok(Math.abs(report.thrustIntegratedDeltaVMps - report.idealDeltaVMps) / report.idealDeltaVMps < 0.001);
    assert.ok(Math.abs(report.finalPosition.x) < 1e-6);
    assert.ok(Math.abs(report.finalPosition.z) < 1e-6);
    assert.ok(report.finalVelocity.y > 0);

    const analytical = ve * Math.log(INITIAL_MASS_KG / mf);
    assert.ok(Math.abs(report.idealDeltaVMps - analytical) < 1e-6);
  });

  it("keeps the vacuum agreement with sub-stepping", () => {
    const report = runVerticalBurn(true, 4);
    assert.ok(report.relativeError < 0.001, `relative error ${report.relativeError}`);
  });

  it("shows gravity and drag losses on the Earth burn", () => {
    const report = runVerticalBurn(false, 1);
    const g = EARTH_MU_M3_S2 / (EARTH_RADIUS_M * EARTH_RADIUS_M);
    assert.ok(Math.abs(report.samples[0].gravityMps2 - g) < 1e-9);
    assert.equal(report.samples[0].altitudeM, 0);
    assert.equal(report.samples[0].speedMps, 0);
    assert.equal(report.samples[0].dynamicPressurePa, 0);
    assert.equal(report.samples[0].thrustN, MAX_VACUUM_THRUST_N);
    assert.ok(report.achievedDeltaVMps < report.idealDeltaVMps);
    assert.ok(report.differenceMps > 0);
    assert.equal(report.vacuumCheckApplies, false);

    for (let i = 1; i < report.samples.length; i++) {
      assert.ok(report.samples[i].altitudeM > report.samples[i - 1].altitudeM);
      assert.ok(Number.isFinite(report.samples[i].accelMps2));
    }
    const last = report.samples[18];
    assert.ok(last.dragN > 0);
    assert.ok(last.densityKgM3 < 1.225);
    assert.ok(last.densityKgM3 > 0);
    assert.ok(last.verticalMps > 0);
    assert.ok(last.propellantKg > 0);
    assert.ok(Math.abs(report.achievedDeltaVMps - 296.123035) < 1e-4);
    assert.ok(Math.abs(report.idealDeltaVMps - 1195.539215) < 1e-4);
    assert.ok(Math.abs(last.altitudeM - 10800.316) < 1e-2);
    assert.ok(Math.abs(last.propellantKg - 837732.398) < 1e-2);
    assert.equal(last.horizontalMps, 0);
    assert.equal(last.thrustPitchDeg, 0);
    assert.ok(Math.abs(last.flightPathDeg - 90) < 1e-9);
  });
});

describe("pitch program", () => {
  it("rate 0 reproduces the Pass 1 Earth and vacuum burns", () => {
    const verticalProgram = { tVerticalS: 20, pitchRateDegPerS: 0, holdPitchDeg: null };
    for (const vacuum of [false, true]) {
      const vertical = runVerticalBurn(vacuum, 1);
      const pitched = runPitchedBurn(vacuum, 1, verticalProgram);
      assert.equal(pitched.achievedDeltaVMps, vertical.achievedDeltaVMps);
      assert.equal(pitched.idealDeltaVMps, vertical.idealDeltaVMps);
      assert.equal(pitched.thrustIntegratedDeltaVMps, vertical.thrustIntegratedDeltaVMps);
      assert.equal(pitched.finalMassKg, vertical.finalMassKg);
      assert.equal(pitched.samples.length, vertical.samples.length);
      for (let i = 0; i < vertical.samples.length; i++) {
        const a = vertical.samples[i];
        const b = pitched.samples[i];
        assert.equal(b.altitudeM, a.altitudeM);
        assert.equal(b.speedMps, a.speedMps);
        assert.equal(b.verticalMps, a.verticalMps);
        assert.equal(b.accelMps2, a.accelMps2);
        assert.equal(b.propellantKg, a.propellantKg);
        assert.equal(b.dragN, a.dragN);
        assert.equal(b.gravityMps2, a.gravityMps2);
        assert.equal(b.horizontalMps, a.horizontalMps);
        assert.equal(b.thrustPitchDeg, 0);
      }
    }
  });

  it("pitches over after 20 s on the Earth burn", () => {
    const vertical = runVerticalBurn(false, 1);
    const pitched = runPitchedBurn(false, 1, DEFAULT_PITCH_PROGRAM);
    const at20 = pitched.samples[4];
    const at25 = pitched.samples[5];
    const at90 = pitched.samples[18];

    assert.equal(at20.timeS, 20);
    assert.equal(at25.timeS, 25);
    assert.equal(at20.thrustPitchDeg, 0);
    assert.equal(at20.altitudeM, vertical.samples[4].altitudeM);
    assert.equal(at20.speedMps, vertical.samples[4].speedMps);
    assert.equal(at20.horizontalMps, 0);
    assert.ok(Math.abs(at25.thrustPitchDeg - 5) < 1e-12);
    assert.equal(pitchAngleDeg(90, DEFAULT_PITCH_PROGRAM), 70);
    assert.ok(Math.abs(at90.thrustPitchDeg - 70) < 1e-12);
    assert.ok(at90.horizontalMps > 1);
    assert.ok(at90.flightPathDeg < 89);
    assert.ok(at90.flightPathDeg > 0);
    assert.ok(at90.radiusM > at90.altitudeM);
    assert.ok(pitched.logText.includes("vh="));
    assert.ok(pitched.logText.includes("gamma="));
    assert.ok(pitched.logText.includes("pitch="));
    assert.ok(pitched.logText.includes("r="));
  });

  it("holds a fixed inertial pitch after the vertical segment", () => {
    const held = runPitchedBurn(false, 1, { tVerticalS: 10, pitchRateDegPerS: 99, holdPitchDeg: 30 });
    assert.equal(held.samples[2].timeS, 10);
    assert.equal(held.samples[2].thrustPitchDeg, 0);
    assert.equal(held.samples[3].thrustPitchDeg, 30);
    assert.equal(held.samples[18].thrustPitchDeg, 30);
  });
});

function assertSameBurnSample(
  actual: ReturnType<typeof runVerticalBurn>["samples"][number],
  expected: ReturnType<typeof runVerticalBurn>["samples"][number],
) {
  assert.equal(actual.timeS, expected.timeS);
  assert.equal(actual.altitudeM, expected.altitudeM);
  assert.equal(actual.speedMps, expected.speedMps);
  assert.equal(actual.verticalMps, expected.verticalMps);
  assert.equal(actual.accelMps2, expected.accelMps2);
  assert.equal(actual.propellantKg, expected.propellantKg);
  assert.equal(actual.totalMassKg, expected.totalMassKg);
  assert.equal(actual.thrustN, expected.thrustN);
  assert.equal(actual.dragN, expected.dragN);
  assert.equal(actual.gravityMps2, expected.gravityMps2);
  assert.equal(actual.horizontalMps, expected.horizontalMps);
  assert.equal(actual.flightPathDeg, expected.flightPathDeg);
  assert.equal(actual.thrustPitchDeg, expected.thrustPitchDeg);
  assert.equal(actual.radiusM, expected.radiusM);
}

describe("cutoff and coast", () => {
  it("leaves the verified burns untouched when cutoff cannot engage", () => {
    const later = { tCutoffS: 120, propellantRemainingKg: null };
    for (const vacuum of [false, true]) {
      const vertical = runVerticalBurn(vacuum, 1);
      const coast = runCoastBurn(vacuum, 1, PURE_VERTICAL_PROGRAM, later, 90);
      assert.equal(coast.logText, vertical.logText);
      assert.equal(coast.achievedDeltaVMps, vertical.achievedDeltaVMps);
      assert.equal(coast.cutoff, null);

      const pitched = runPitchedBurn(vacuum, 1, DEFAULT_PITCH_PROGRAM);
      const pitchedAgain = runCoastBurn(vacuum, 1, DEFAULT_PITCH_PROGRAM, NO_CUTOFF, 90);
      assert.equal(pitchedAgain.logText, pitched.logText);
      assert.equal(pitchedAgain.achievedDeltaVMps, pitched.achievedDeltaVMps);
    }

    const burn = runVerticalBurn(false, 1);
    const longer = runCoastBurn(false, 1, PURE_VERTICAL_PROGRAM, NO_CUTOFF, COAST_END_S);
    for (let i = 0; i < burn.samples.length; i++) assertSameBurnSample(longer.samples[i], burn.samples[i]);
    assert.equal(longer.samples[18].horizontalMps, 0);
    assert.ok(Math.abs(longer.samples[18].altitudeM - 10800.316) < 1e-2);
    assert.equal(burn.samples[0].engineState, 1);
    assert.equal(burn.samples[18].timeSinceCutoffS, 0);
    assert.ok(Math.abs(burn.samples[0].specificEnergyM2S2 + EARTH_MU_M3_S2 / EARTH_RADIUS_M) < 1);
    assert.ok(burn.logText.includes("eng="));
    assert.ok(burn.logText.includes("eps="));
  });

  it("cuts a vertical Earth burn at 60 s and coasts to 120 s", () => {
    const burn = runVerticalBurn(false, 1);
    const coast = runCoastBurn(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    assert.equal(coast.samples.length, 25);
    assert.equal(coast.samples[24].timeS, 120);

    for (let i = 0; i < 12; i++) {
      assertSameBurnSample(coast.samples[i], burn.samples[i]);
      assert.equal(coast.samples[i].engineState, 1);
      assert.equal(coast.samples[i].timeSinceCutoffS, 0);
    }

    const at60 = coast.samples[12];
    assert.equal(at60.timeS, 60);
    assert.equal(at60.altitudeM, burn.samples[12].altitudeM);
    assert.equal(at60.speedMps, burn.samples[12].speedMps);
    assert.equal(at60.verticalMps, burn.samples[12].verticalMps);
    assert.equal(at60.propellantKg, burn.samples[12].propellantKg);
    assert.equal(at60.totalMassKg, burn.samples[12].totalMassKg);
    assert.equal(at60.horizontalMps, 0);
    assert.equal(at60.thrustN, 0);
    assert.equal(burn.samples[12].thrustN, MAX_VACUUM_THRUST_N);
    assert.equal(at60.engineState, 0);
    assert.equal(at60.timeSinceCutoffS, 0);

    for (const timeS of [65, 90, 120]) {
      const sample = coast.samples[timeS / 5];
      assert.equal(sample.propellantKg, at60.propellantKg);
      assert.equal(sample.totalMassKg, at60.totalMassKg);
      assert.equal(sample.thrustN, 0);
      assert.equal(sample.engineState, 0);
      assert.equal(sample.timeSinceCutoffS, timeS - 60);
      assert.ok(sample.horizontalMps < 1e-9);
    }

    assert.notEqual(coast.samples[13].altitudeM, burn.samples[13].altitudeM);
    assert.notEqual(coast.samples[24].speedMps, at60.speedMps);
    assert.ok(coast.samples[13].dragN > 0);
    assert.ok(coast.samples[24].gravityMps2 > 0);
    assert.ok(Math.abs(coast.thrustIntegratedDeltaVMps - coast.idealDeltaVMps) / coast.idealDeltaVMps < 1e-9);
    assert.ok(coast.logText.includes("t=120.000 s"));
    assert.ok(coast.logText.includes("verdict=CUTOFF_AND_COAST"));
    assert.ok(coast.logText.includes("tco="));
  });

  it("keeps horizontal speed after a pitched cutoff", () => {
    const pitched = runPitchedBurn(false, 1, DEFAULT_PITCH_PROGRAM);
    const coast = runCoastBurn(false, 1, DEFAULT_PITCH_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    const vertical = runVerticalBurn(false, 1);

    assert.equal(coast.samples[4].timeS, 20);
    assert.equal(coast.samples[4].altitudeM, vertical.samples[4].altitudeM);
    assert.equal(coast.samples[4].horizontalMps, 0);
    assert.equal(coast.samples[4].thrustPitchDeg, 0);

    for (let i = 0; i < 12; i++) assertSameBurnSample(coast.samples[i], pitched.samples[i]);

    const at60 = coast.samples[12];
    assert.equal(at60.altitudeM, pitched.samples[12].altitudeM);
    assert.equal(at60.speedMps, pitched.samples[12].speedMps);
    assert.equal(at60.horizontalMps, pitched.samples[12].horizontalMps);
    assert.equal(at60.flightPathDeg, pitched.samples[12].flightPathDeg);
    assert.equal(at60.propellantKg, pitched.samples[12].propellantKg);
    assert.equal(at60.thrustN, 0);
    assert.ok(at60.horizontalMps > 1);

    const at120 = coast.samples[24];
    assert.ok(at120.horizontalMps > 1);
    assert.equal(at120.propellantKg, at60.propellantKg);
    assert.equal(at120.thrustN, 0);
    assert.equal(at120.engineState, 0);
    assert.ok(Math.abs(at120.flightPathDeg - at60.flightPathDeg) > 0.1);
    assert.equal(coast.samples[18].thrustPitchDeg, 70);
    assert.equal(coast.samples[18].engineState, 0);
    assert.equal(pitchAngleDeg(70, DEFAULT_PITCH_PROGRAM), 50);
  });

  it("freezes mass at a propellant threshold and coasts in vacuum at constant speed", () => {
    const mdot = MAX_VACUUM_THRUST_N / (VACUUM_ISP_S * G0_MPS2);
    const threshold = INITIAL_PROPELLANT_KG - mdot * 30;
    const coast = runCoastBurn(
      false,
      1,
      PURE_VERTICAL_PROGRAM,
      { tCutoffS: null, propellantRemainingKg: threshold },
      90,
    );
    assert.equal(coast.samples[6].timeS, 30);
    assert.ok(coast.samples[6].propellantKg > threshold);
    assert.ok(coast.samples[6].propellantKg - threshold < mdot / STEP_HZ);
    assert.equal(coast.samples[6].engineState, 1);
    assert.equal(coast.samples[7].timeS, 35);
    assert.equal(coast.samples[7].engineState, 0);
    assert.equal(coast.samples[7].propellantKg, threshold);
    assert.equal(coast.samples[7].thrustN, 0);
    for (let i = 7; i < coast.samples.length; i++) {
      assert.equal(coast.samples[i].propellantKg, threshold);
      assert.equal(coast.samples[i].thrustN, 0);
      assert.equal(coast.samples[i].totalMassKg, DRY_MASS_KG + threshold);
      assert.equal(coast.samples[i].engineState, 0);
    }
    assert.equal(coast.samples[5].engineState, 1);

    const vacuum = runCoastBurn(true, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    assert.equal(vacuum.samples[24].speedMps, vacuum.samples[12].speedMps);
    assert.equal(vacuum.samples[24].propellantKg, vacuum.samples[12].propellantKg);
    assert.equal(vacuum.samples[24].thrustN, 0);
    assert.ok(Math.abs(vacuum.thrustIntegratedDeltaVMps - vacuum.idealDeltaVMps) / vacuum.idealDeltaVMps < 1e-9);
    assert.equal(vacuum.samples[12].altitudeM, runVerticalBurn(true, 1).samples[12].altitudeM);
  });
});

function vacuumNumericalCoast(position: Vector3d, velocity: Vector3d, seconds: number) {
  const env = createEarthEnvironment({ gravityEnabled: true, atmosphereEnabled: false, includeJ2: false });
  const propulsion = createDefaultPropulsion();
  let state = {
    position,
    velocity,
    propellantMassKg: 1,
    totalMassKg: DRY_MASS_KG + 1,
    thrustIntegratedDeltaVMps: 0,
    attitude: QuaternionD.identity,
    initialAttitude: QuaternionD.identity,
    angularVelocityBody: Vector3d.zero,
    gimbalRad: 0,
  };
  const steps = Math.round(seconds * STEP_HZ);
  for (let i = 0; i < steps; i++) state = stepRk4(state, 1 / STEP_HZ, 1, env, propulsion, 0);
  return state;
}

describe("analytic kepler coast", () => {
  it("stays on the verified burns when analytic mode cannot engage", () => {
    const vertical = runVerticalBurn(false, 1);
    const delegated = runKeplerCoast(false, 1, PURE_VERTICAL_PROGRAM, NO_CUTOFF, 90);
    assert.equal(delegated.logText, vertical.logText);
    assert.equal(delegated.achievedDeltaVMps, vertical.achievedDeltaVMps);
    assert.equal(delegated.analyticKepler, undefined);

    const pitched = runPitchedBurn(false, 1, DEFAULT_PITCH_PROGRAM);
    const pitchedAgain = runKeplerCoast(false, 1, DEFAULT_PITCH_PROGRAM, { tCutoffS: 120, propellantRemainingKg: null }, 90);
    assert.equal(pitchedAgain.logText, pitched.logText);
    assert.equal(pitchedAgain.samples[18].horizontalMps, pitched.samples[18].horizontalMps);
  });

  it("propagates a vertical Earth cutoff on a drag-free Kepler arc", () => {
    const numerical = runCoastBurn(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    const analytic = runKeplerCoast(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    for (let i = 0; i <= 12; i++) assertSameBurnSample(analytic.samples[i], numerical.samples[i]);
    const capture = analytic.keplerCapture;
    assert.ok(capture);
    assert.equal(capture.timeS, 60);
    assert.equal(analytic.samples[12].timeSinceElementsS, 0);
    assert.ok(capture.elements.semiMajorAxisM > 0);
    assert.ok(capture.elements.specificEnergyM2S2 < 0);
    // Pure vertical flight is a rectilinear ellipse: h = 0, so e = 1 while a stays positive.
    assert.ok(Math.abs(capture.elements.eccentricity - 1) < 1e-9);
    assert.equal(analytic.thrustIntegratedDeltaVMps, numerical.thrustIntegratedDeltaVMps);

    for (const timeS of [90, 120]) {
      const sample = analytic.samples[timeS / 5];
      const coasted = vacuumNumericalCoast(capture.position, capture.velocity, timeS - 60);
      assert.equal(sample.propagationMode, "analytic");
      assert.equal(sample.dragN, 0);
      assert.equal(sample.densityKgM3, 0);
      assert.equal(sample.thrustN, 0);
      assert.equal(sample.propellantKg, capture.propellantKg);
      assert.equal(sample.engineState, 0);
      assert.equal(sample.timeSinceCutoffS, timeS - 60);
      assert.equal(sample.timeSinceElementsS, timeS - 60);
      assert.equal(sample.semiMajorAxisM, capture.elements.semiMajorAxisM);
      assert.equal(sample.eccentricity, capture.elements.eccentricity);
      const predicted = propagateKepler(capture.position, capture.velocity, capture.muM3S2, timeS - 60);
      assert.ok(predicted.position.sub(coasted.position).magnitude < 1);
      assert.ok(predicted.velocity.sub(coasted.velocity).magnitude < 0.01);
      assert.ok(Math.abs(sample.altitudeM - (predicted.position.magnitude - EARTH_RADIUS_M)) < 1e-6);
      assert.ok(Math.abs(sample.speedMps - predicted.velocity.magnitude) < 1e-8);
      assert.ok(
        Math.abs(sample.specificEnergyM2S2 - capture.elements.specificEnergyM2S2) <
          1e-6 * Math.abs(capture.elements.specificEnergyM2S2),
      );
    }
    assert.notEqual(analytic.samples[24].altitudeM, numerical.samples[24].altitudeM);
    assert.ok(analytic.samples[24].horizontalMps < 1e-6);
    assert.ok(analytic.logText.includes("prop=analytic"));
    assert.ok(analytic.logText.includes("verdict=ANALYTIC_KEPLER"));
  });

  it("keeps a pitched cutoff on a constant-energy Kepler arc", () => {
    const numerical = runCoastBurn(false, 1, DEFAULT_PITCH_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    const analytic = runKeplerCoast(false, 1, DEFAULT_PITCH_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    for (let i = 0; i <= 12; i++) assertSameBurnSample(analytic.samples[i], numerical.samples[i]);
    const at60 = analytic.samples[12];
    const at120 = analytic.samples[24];
    assert.ok(at60.horizontalMps > 1);
    assert.equal(at120.horizontalMps > 1, true);
    assert.equal(at120.dragN, 0);
    assert.equal(at120.propagationMode, "analytic");
    assert.equal(at120.propellantKg, at60.propellantKg);
    assert.ok(Math.abs(at120.flightPathDeg - at60.flightPathDeg) > 0.1);
    assert.ok(
      Math.abs(at120.specificEnergyM2S2 - analytic.samples[18].specificEnergyM2S2) <
        1e-6 * Math.abs(at120.specificEnergyM2S2),
    );
    const capture = analytic.keplerCapture;
    assert.ok(capture);
    const coasted = vacuumNumericalCoast(capture.position, capture.velocity, 60);
    const predicted = propagateKepler(capture.position, capture.velocity, capture.muM3S2, 60);
    assert.ok(predicted.position.sub(coasted.position).magnitude < 1);
    assert.ok(at120.horizontalMps > 1);
  });

  it("closes a circular orbit and a hyperbola", () => {
    const radius = EARTH_RADIUS_M + 200_000;
    const speed = Math.sqrt(EARTH_MU_M3_S2 / radius);
    const position = new Vector3d(radius, 0, 0);
    const velocity = new Vector3d(0, speed, 0);
    const elements = keplerElements(position, velocity, EARTH_MU_M3_S2);
    assert.ok(Math.abs(elements.semiMajorAxisM - radius) < 1e-6);
    assert.ok(elements.eccentricity < 1e-12);
    const period = 2 * Math.PI * Math.sqrt(radius ** 3 / EARTH_MU_M3_S2);
    const back = propagateKepler(position, velocity, EARTH_MU_M3_S2, period);
    assert.ok(back.position.sub(position).magnitude < 1e-4);
    assert.ok(back.velocity.sub(velocity).magnitude < 1e-7);

    const hyperbolic = new Vector3d(0, speed * 1.5, 0);
    const start = keplerElements(position, hyperbolic, EARTH_MU_M3_S2);
    assert.ok(start.eccentricity > 1);
    assert.ok(start.semiMajorAxisM < 0);
    const later = propagateKepler(position, hyperbolic, EARTH_MU_M3_S2, 200);
    const end = keplerElements(later.position, later.velocity, EARTH_MU_M3_S2);
    assert.ok(Math.abs(end.specificEnergyM2S2 - start.specificEnergyM2S2) < 1e-4);
    assert.ok(later.position.magnitude > position.magnitude);
  });
});

describe("mars body and entry", () => {
  it("leaves the verified Earth burns unchanged", () => {
    const earth = runVerticalBurn(false, 1);
    const vacuum = runVerticalBurn(true, 1);
    const pitched = runPitchedBurn(false, 1, DEFAULT_PITCH_PROGRAM);
    assert.ok(Math.abs(vacuum.idealDeltaVMps - 1195.539215) < 1e-4);
    assert.ok(Math.abs(earth.achievedDeltaVMps - 296.123035) < 1e-4);
    assert.ok(Math.abs(earth.samples[18].altitudeM - 10800.316) < 1e-2);
    assert.equal(earth.samples[18].horizontalMps, 0);
    assert.equal(earth.samples[18].body, "Earth");
    assert.ok(Math.abs(earth.samples[18].mach - earth.samples[18].speedMps / EARTH_SPEED_OF_SOUND_MPS) < 1e-12);
    assert.ok(earth.logText.includes("body=Earth"));
    assert.ok(Math.abs(pitched.samples[18].horizontalMps - 498.995459) < 1e-3);
    assert.ok(Math.abs(pitched.samples[18].flightPathDeg - 7.164388) < 1e-3);
    assert.ok(Math.abs(pitched.samples[18].altitudeM - 6753.943) < 0.1);
    const coast = runCoastBurn(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    assert.ok(Math.abs(coast.samples[12].propellantKg - 958488.265) < 1e-2);
    const kepler = runKeplerCoast(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    assert.equal(kepler.samples[12].altitudeM, coast.samples[12].altitudeM);
    assert.equal(kepler.samples[18].dragN, 0);
    assert.equal(kepler.samples[18].body, "Earth");
  });

  it("flies a 60 s vertical Mars burn with the exponential atmosphere", () => {
    const mars = createMarsEnvironment();
    const surface = new Vector3d(0, MARS_RADIUS_M, 0);
    const g = gravitationalAcceleration(mars, surface).magnitude;
    const muOverR2 = MARS_MU_M3_S2 / (MARS_RADIUS_M * MARS_RADIUS_M);
    assert.ok(Math.abs(g - muOverR2) < 1e-9);
    assert.ok(Math.abs(g - 3.71) < 0.03);

    const scale = atmosphericDensityKgM3(mars, new Vector3d(0, MARS_RADIUS_M + MARS_SCALE_HEIGHT_M, 0));
    assert.ok(Math.abs(scale / MARS_RHO0_KG_M3 - Math.exp(-1)) < 1e-12);

    const burn = runMarsVerticalBurn(false, 1);
    assert.equal(burn.samples.length, 13);
    assert.equal(burn.samples[0].timeS, 0);
    assert.equal(burn.samples[12].timeS, 60);
    assert.equal(burn.samples[0].altitudeM, 0);
    assert.equal(burn.samples[0].body, "Mars");
    assert.ok(Math.abs(burn.samples[0].gravityMps2 - g) < 1e-6);
    assert.ok(Math.abs(burn.samples[0].densityKgM3 - MARS_RHO0_KG_M3) < 1e-12);
    assert.equal(burn.samples[0].dynamicPressurePa, 0);
    assert.ok(burn.samples[12].altitudeM > burn.samples[6].altitudeM);
    assert.ok(burn.samples[12].speedMps > burn.samples[6].speedMps);
    assert.ok(burn.samples[12].densityKgM3 < burn.samples[6].densityKgM3);
    assert.ok(burn.samples[12].densityKgM3 > 0);
    assert.ok(burn.samples[6].dynamicPressurePa > 0);
    const expectedRho = MARS_RHO0_KG_M3 * Math.exp(-burn.samples[12].altitudeM / MARS_SCALE_HEIGHT_M);
    assert.ok(Math.abs(burn.samples[12].densityKgM3 - expectedRho) / expectedRho < 1e-6);
    assert.ok(Math.abs(burn.samples[12].mach - burn.samples[12].speedMps / MARS_SPEED_OF_SOUND_MPS) < 1e-12);
    assert.ok(burn.logText.includes("body=Mars"));
    assert.ok(burn.logText.includes("verdict=MARS_SURFACE_BURN"));
    assert.equal(burn.samples[12].horizontalMps, 0);

    const vacuum = runMarsVerticalBurn(true, 1);
    assert.equal(vacuum.samples[12].densityKgM3, 0);
    assert.equal(vacuum.samples[12].dragN, 0);
    assert.equal(vacuum.samples[12].gravityMps2, 0);
  });

  it("enters from the Mars interface under numerical and analytic coasts", () => {
    const numerical = runMarsEntry(false, 1, false, 300);
    assert.equal(numerical.samples.length, 61);
    assert.equal(numerical.samples[60].timeS, 300);
    const start = numerical.samples[0];
    assert.equal(start.altitudeM, MARS_ENTRY_ALTITUDE_M);
    assert.ok(Math.abs(start.speedMps - MARS_ENTRY_SPEED_MPS) < 1e-6);
    assert.ok(Math.abs(start.flightPathDeg - MARS_ENTRY_FLIGHT_PATH_DEG) < 1e-6);
    assert.equal(start.propellantKg, MARS_ENTRY_PROPELLANT_KG);
    assert.equal(start.totalMassKg, DRY_MASS_KG + MARS_ENTRY_PROPELLANT_KG);
    assert.equal(start.thrustN, 0);
    assert.equal(start.engineState, 0);
    assert.equal(start.body, "Mars");
    assert.ok(Math.abs(start.mach - MARS_ENTRY_SPEED_MPS / MARS_SPEED_OF_SOUND_MPS) < 1e-9);
    assert.ok(start.densityKgM3 > 0);
    assert.ok(start.densityKgM3 < MARS_RHO0_KG_M3);
    assert.ok(numerical.samples[1].altitudeM < start.altitudeM);
    assert.notEqual(numerical.samples[6].speedMps, start.speedMps);

    let densityRose = false;
    for (let i = 1; i < numerical.samples.length; i++) {
      const prev = numerical.samples[i - 1];
      const next = numerical.samples[i];
      if (next.altitudeM > 0 && next.altitudeM < prev.altitudeM && next.densityKgM3 > prev.densityKgM3) densityRose = true;
      assert.equal(next.propellantKg, MARS_ENTRY_PROPELLANT_KG);
      assert.equal(next.thrustN, 0);
    }
    assert.equal(densityRose, true);
    assert.ok(numerical.logText.includes("body=Mars"));
    assert.ok(numerical.logText.includes("verdict=MARS_ENTRY_NUMERICAL"));

    const analytic = runMarsEntry(false, 1, true, 300);
    assert.equal(analytic.analyticKepler, true);
    assert.equal(analytic.samples[0].propagationMode, "numerical");
    assert.equal(analytic.samples[0].altitudeM, start.altitudeM);
    assert.equal(analytic.samples[0].speedMps, start.speedMps);
    assert.equal(analytic.samples[1].propagationMode, "analytic");
    assert.equal(analytic.samples[1].dragN, 0);
    assert.equal(analytic.samples[1].densityKgM3, 0);
    assert.ok(analytic.samples[6].altitudeM < analytic.samples[0].altitudeM);
    assert.notEqual(analytic.samples[6].speedMps, analytic.samples[0].speedMps);
    const energy = analytic.samples[1].specificEnergyM2S2;
    assert.ok(Math.abs(analytic.samples[60].specificEnergyM2S2 - energy) < 1e-6 * Math.abs(energy));
    assert.ok(analytic.keplerCapture);
    assert.ok(analytic.keplerCapture.elements.semiMajorAxisM !== 0);
    assert.ok(analytic.logText.includes("verdict=MARS_ENTRY_ANALYTIC"));

    const straight = runMarsEntry(true, 1, false, 60);
    assert.equal(straight.samples[12].speedMps, straight.samples[0].speedMps);
    assert.equal(straight.samples[12].densityKgM3, 0);
    assert.ok(straight.samples[12].altitudeM < straight.samples[0].altitudeM);
  });
});

describe("terminal flip and landing", () => {
  it("rates a touchdown by vertical and horizontal speed", () => {
    assert.equal(touchdownFlag(-2, 0.5), "nominal");
    assert.equal(touchdownFlag(2, 0), "nominal");
    assert.equal(touchdownFlag(-2.01, 0), "RUD");
    assert.equal(touchdownFlag(0, 0.51), "RUD");
  });

  it("leaves Pass 1–5 runs unchanged when the sequence is not armed", () => {
    const earth = runVerticalBurn(false, 1);
    const pitched = runPitchedBurn(false, 1, DEFAULT_PITCH_PROGRAM);
    const coast = runCoastBurn(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    const kepler = runKeplerCoast(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    const mars = runMarsVerticalBurn(false, 1);
    const entry = runMarsEntry(false, 1, false, 300);
    assert.ok(Math.abs(earth.achievedDeltaVMps - 296.123035) < 1e-4);
    assert.ok(Math.abs(earth.samples[18].altitudeM - 10800.316) < 1e-2);
    assert.equal(earth.samples[18].horizontalMps, 0);
    assert.equal(earth.terminal ?? null, null);
    assert.equal(earth.samples[18].sequencePhase, undefined);
    assert.ok(Math.abs(pitched.samples[18].horizontalMps - 498.995459) < 1e-3);
    assert.ok(Math.abs(coast.samples[12].propellantKg - 958488.265) < 1e-2);
    assert.equal(kepler.samples[18].dragN, 0);
    assert.equal(mars.samples[12].horizontalMps, 0);
    assert.ok(mars.samples[12].altitudeM > 0);
    assert.equal(entry.samples[0].altitudeM, MARS_ENTRY_ALTITUDE_M);
    assert.equal(entry.samples[60].timeS, 300);
    assert.equal(entry.terminal ?? null, null);
    assert.equal(entry.samples[60].sequencePhase, undefined);
    assert.ok(!entry.logText.includes("phase="));
  });

  it("flips to vertical thrust from the 3 km gate and scores the impact", () => {
    const landed = runMarsTerminalLanding(false, 1, DEFAULT_TERMINAL_SEQUENCE);
    assert.ok(landed.terminal);
    assert.ok(landed.terminal.impact);
    const phases = landed.samples.map((sample) => sample.sequencePhase);
    assert.equal(phases[0], "Coast");
    const flipAt = landed.samples.findIndex((sample) => sample.sequencePhase === "Flip");
    const burnAt = landed.samples.findIndex((sample) => sample.sequencePhase === "LandingBurn");
    const doneAt = landed.samples.findIndex((sample) => sample.sequencePhase === "Complete" && sample.impactFlag);
    assert.ok(flipAt > 0);
    assert.ok(burnAt > flipAt);
    assert.ok(doneAt > burnAt);
    const flip = landed.samples[flipAt];
    assert.ok(flip.altitudeM <= 3_000);
    assert.ok(flip.altitudeM > 2_500);
    assert.ok((flip.thrustPitchFromVerticalDeg ?? 0) > 45);
    const burn = landed.samples[burnAt];
    assert.ok(Math.abs(burn.thrustN - 0.6 * MAX_VACUUM_THRUST_N) < 1);
    assert.ok((burn.thrustPitchFromVerticalDeg ?? 90) < 1);
    assert.equal(burn.engineState, 1);
    const impact = landed.samples[doneAt];
    assert.equal(impact.altitudeM, 0);
    assert.equal(impact.sequencePhase, "Complete");
    assert.equal(impact.impactFlag, landed.terminal.impact.flag);
    assert.ok(impact.impactFlag === "nominal" || impact.impactFlag === "RUD");
    const expectedFlag = touchdownFlag(landed.terminal.impact.verticalMps, landed.terminal.impact.horizontalMps);
    assert.equal(landed.terminal.impact.flag, expectedFlag);
    const ke = 0.5 * impact.totalMassKg * landed.terminal.impact.speedMps ** 2;
    assert.ok(Math.abs(landed.terminal.impact.kineticEnergyJ - ke) / ke < 1e-9);
    assert.ok(landed.terminal.peakSpeedMps >= impact.speedMps - 1e-6);
    assert.ok(landed.logText.includes("phase=Flip"));
    assert.ok(landed.logText.includes("phase=LandingBurn"));
    assert.ok(landed.logText.includes(`impact=${impact.impactFlag}`));
    assert.ok(landed.logText.includes("verdict=TERMINAL_"));
    assert.ok(landed.samples.some((sample) => sample.sequencePhase === "Coast" && sample.altitudeM > 3_000));
  });

  it("arms earlier with full thrust and still reports the touchdown path", () => {
    const baseline = runMarsTerminalLanding(false, 1, DEFAULT_TERMINAL_SEQUENCE);
    const early = runMarsTerminalLanding(false, 1, EARLY_TERMINAL_SEQUENCE);
    const baseFlip = baseline.samples.find((sample) => sample.sequencePhase === "Flip");
    const earlyFlip = early.samples.find((sample) => sample.sequencePhase === "Flip");
    assert.ok(baseFlip && earlyFlip);
    assert.ok(earlyFlip.timeS < baseFlip.timeS);
    assert.ok(earlyFlip.altitudeM <= 5_000);
    assert.ok(earlyFlip.altitudeM > 4_500);
    const burn = early.samples.find((sample) => sample.sequencePhase === "LandingBurn");
    assert.ok(burn);
    assert.ok(Math.abs(burn.thrustN - MAX_VACUUM_THRUST_N) < 1);
    assert.ok((burn.thrustPitchFromVerticalDeg ?? 90) < 1);
    assert.ok(early.terminal?.impact);
    assert.equal(early.samples[early.samples.length - 1].altitudeM, 0);
    assert.equal(early.samples[early.samples.length - 1].impactFlag, early.terminal.impact.flag);
    assert.ok(early.logText.includes("phase=Coast"));
    assert.ok(early.logText.includes("phase=Flip"));
    assert.ok(early.logText.includes("phase=LandingBurn"));
    assert.ok(early.logText.includes("phase=Complete"));
    const sequence = new TerminalSequence({
      triggerAltitudeM: null,
      triggerTimeS: 10,
      flipDurationS: 8,
      flipThrottle: 0,
      landingThrottle: 0.6,
      manualCutoffS: 20,
    });
    const position = new Vector3d(0, MARS_RADIUS_M + 10_000, 0);
    const velocity = new Vector3d(500, -20, 0);
    assert.equal(sequence.command(0, position, velocity, 50_000, 10_000).phase, "Coast");
    const flip = sequence.command(10, position, velocity, 50_000, 10_000);
    assert.equal(flip.phase, "Flip");
    assert.ok(flip.pitchFromVerticalDeg > 45);
    const cut = sequence.command(20, position, velocity, 50_000, 10_000);
    assert.equal(cut.phase, "Complete");
    assert.equal(cut.throttle, 0);
  });
});

describe("landing burn horizontal fraction", () => {
  const pass6Horizontal = 1956.3151582366004;
  const pass6Radial = -991.4807094390666;
  const pass6ImpactTime = 1403.3994296857827;
  const heading = (fraction: number) => (Math.atan2(fraction, 1 - fraction) * 180) / Math.PI;

  it("keeps the Pass 6 RUD when the fraction is zero", () => {
    const plain = runMarsTerminalLanding(false, 1, DEFAULT_TERMINAL_SEQUENCE);
    const zero = runMarsTerminalLanding(false, 1, { ...DEFAULT_TERMINAL_SEQUENCE, horizontalFraction: 0 });
    assert.equal(zero.logText, plain.logText);
    assert.equal(zero.endTimeS, plain.endTimeS);
    const impact = plain.terminal?.impact;
    assert.ok(impact);
    assert.equal(impact.flag, "RUD");
    assert.ok(Math.abs(impact.horizontalMps - pass6Horizontal) < 1e-6);
    assert.ok(Math.abs(impact.verticalMps - pass6Radial) < 1e-6);
    assert.ok(Math.abs(plain.endTimeS - pass6ImpactTime) < 1e-9);
    assert.equal(plain.logText.includes("hf="), false);
    assert.equal(plain.samples.find((sample) => sample.sequencePhase === "LandingBurn")?.horizontalFraction, undefined);
  });

  it("points the burn between vertical and anti-horizontal", () => {
    const position = new Vector3d(0, MARS_RADIUS_M + 1_000, 0);
    const velocity = new Vector3d(400, -30, 0);
    const up = position.normalized;
    const aim = landingThrustDirection(up, velocity, 0.3);
    assert.ok(Math.abs(aim.pitchFromVerticalDeg - heading(0.3)) < 1e-9);
    assert.ok(aim.direction.x < 0);
    const none = landingThrustDirection(up, velocity, 0);
    assert.equal(none.direction, up);
    assert.equal(none.pitchFromVerticalDeg, 0);
    const still = landingThrustDirection(up, new Vector3d(0, -10, 0), 0.6);
    assert.equal(still.direction, up);

    const pure = new TerminalSequence({ ...DEFAULT_TERMINAL_SEQUENCE, triggerAltitudeM: null, triggerTimeS: 0 });
    pure.command(0, position, velocity, 50_000, 1_000);
    const verticalBurn = pure.command(8, position, velocity, 50_000, 1_000);
    assert.equal(verticalBurn.phase, "LandingBurn");
    assert.equal(verticalBurn.pitchFromVerticalDeg, 0);
    assert.equal(verticalBurn.horizontalFraction, undefined);
    assert.equal(verticalBurn.direction.x, up.x);
    assert.equal(verticalBurn.direction.y, up.y);

    const tilted = new TerminalSequence({
      ...DEFAULT_TERMINAL_SEQUENCE,
      triggerAltitudeM: null,
      triggerTimeS: 0,
      horizontalFraction: 0.6,
    });
    tilted.command(0, position, velocity, 50_000, 1_000);
    const burn = tilted.command(8, position, velocity, 50_000, 1_000);
    assert.equal(burn.horizontalFraction, 0.6);
    assert.ok(Math.abs(burn.pitchFromVerticalDeg - heading(0.6)) < 1e-9);
    assert.equal(burn.throttle, 0.6);
  });

  it("lowers impact horizontal speed at fraction 0.3 and further at 0.6", () => {
    const vertical = runMarsTerminalLanding(false, 1, DEFAULT_TERMINAL_SEQUENCE);
    const third = runMarsTerminalLanding(false, 1, { ...DEFAULT_TERMINAL_SEQUENCE, horizontalFraction: 0.3 });
    const sixth = runMarsTerminalLanding(false, 1, { ...DEFAULT_TERMINAL_SEQUENCE, horizontalFraction: 0.6 });
    const base = vertical.terminal?.impact;
    const mid = third.terminal?.impact;
    const wide = sixth.terminal?.impact;
    assert.ok(base && mid && wide);
    assert.ok(mid.horizontalMps < base.horizontalMps, `0.3 vh ${mid.horizontalMps} vs ${base.horizontalMps}`);
    assert.ok(
      wide.horizontalMps < mid.horizontalMps,
      `0.6 vh ${wide.horizontalMps} flag ${wide.flag} ke ${wide.kineticEnergyJ} mass ${sixth.finalMassKg}`,
    );
    const burn = third.samples.find((sample) => sample.sequencePhase === "LandingBurn" && sample.thrustN > 1);
    assert.ok(burn);
    assert.ok(Math.abs(burn.thrustN - 0.6 * MAX_VACUUM_THRUST_N) < 1);
    assert.ok(Math.abs((burn.thrustPitchFromVerticalDeg ?? 0) - heading(0.3)) < 1e-6);
    assert.equal(burn.horizontalFraction, 0.3);
    assert.ok(third.logText.includes("hf=0.3000"));
    assert.ok(third.logText.includes("herr="));
    assert.ok(sixth.logText.includes("hf=0.6000"));
    const impactLine = third.logLines.find((line) => line.includes("impact="));
    assert.ok(impactLine);
    assert.ok(impactLine.includes("hf=0.3000"));
    assert.ok(impactLine.includes("herr="));
    assert.equal(mid.flag === "nominal" || mid.flag === "RUD", true);
    assert.equal(wide.flag === "nominal" || wide.flag === "RUD", true);
    assert.ok(sixth.finalMassKg >= DRY_MASS_KG - 1e-6);
  });
});

describe("proportional landing and entry interface", () => {
  it("keeps Pass 1–7 when guidance stays fixed and the fraction is zero", () => {
    const plain = runMarsTerminalLanding(false, 1, DEFAULT_TERMINAL_SEQUENCE);
    const tagged = runMarsTerminalLanding(false, 1, { ...DEFAULT_TERMINAL_SEQUENCE, guidanceMode: "FixedFraction", horizontalFraction: 0 });
    const tilted = runMarsTerminalLanding(false, 1, { ...DEFAULT_TERMINAL_SEQUENCE, horizontalFraction: 0.3 });
    const tiltedTagged = runMarsTerminalLanding(false, 1, { ...DEFAULT_TERMINAL_SEQUENCE, guidanceMode: "FixedFraction", horizontalFraction: 0.3 });
    assert.equal(tagged.logText, plain.logText);
    assert.equal(tiltedTagged.logText, tilted.logText);
    assert.equal(plain.terminal?.impact?.flag, "RUD");
    assert.ok(Math.abs((plain.terminal?.impact?.horizontalMps ?? 0) - 1956.3151582366004) < 1e-6);
    assert.ok(Math.abs((plain.terminal?.impact?.verticalMps ?? 0) - -991.4807094390666) < 1e-6);
    assert.ok(!plain.logText.includes("guide="));
    const earth = runVerticalBurn(false, 1);
    assert.ok(Math.abs(earth.achievedDeltaVMps - 296.123035) < 1e-4);
    assert.ok(Math.abs(earth.samples[18].altitudeM - 10800.316) < 1e-2);
    const sameEntry = runMarsEntry(false, 1, false, 300, {
      altitudeM: MARS_ENTRY_INTERFACE.altitudeM,
      speedMps: MARS_ENTRY_INTERFACE.speedMps,
      flightPathDeg: MARS_ENTRY_INTERFACE.flightPathDeg,
      propellantKg: MARS_ENTRY_INTERFACE.propellantKg,
    });
    const stockEntry = runMarsEntry(false, 1, false, 300);
    assert.equal(marsEntryOrDefault(6000, 50_000, -12), MARS_ENTRY_INTERFACE);
    assert.equal(sameEntry.logText, stockEntry.logText);
  });

  it("commands clamp(k * vh / vref, 0, max)", () => {
    const config = {
      ...DEFAULT_TERMINAL_SEQUENCE,
      guidanceMode: "Proportional" as const,
    };
    const position = new Vector3d(0, MARS_RADIUS_M + 1_000, 0);
    assert.equal(proportionalHorizontalFraction(config, position, new Vector3d(1_000, 0, 0)), 0.75);
    assert.ok(Math.abs(proportionalHorizontalFraction(config, position, new Vector3d(100, 0, 0)) - 0.2) < 1e-12);
    assert.equal(proportionalHorizontalFraction(config, position, new Vector3d(0, -20, 0)), 0);
    const sequence = new TerminalSequence({ ...config, triggerAltitudeM: null, triggerTimeS: 0 });
    sequence.command(0, position, new Vector3d(800, -10, 0), 50_000, 1_000);
    const burn = sequence.command(8, position, new Vector3d(800, -10, 0), 50_000, 1_000);
    assert.equal(burn.phase, "LandingBurn");
    assert.equal(burn.guidanceMode, "Proportional");
    assert.equal(burn.horizontalFraction, 0.75);
    assert.ok(Math.abs(burn.pitchFromVerticalDeg - (Math.atan2(0.75, 0.25) * 180) / Math.PI) < 1e-9);
  });

  it("logs a saturated proportional burn on the default Mars entry", () => {
    const report = runMarsTerminalLanding(false, 1, { ...DEFAULT_TERMINAL_SEQUENCE, guidanceMode: "Proportional" });
    const burns = report.samples.filter((sample) => sample.sequencePhase === "LandingBurn");
    assert.ok(burns.length > 3);
    for (const sample of burns) {
      assert.equal(sample.guidanceMode, "Proportional");
      assert.equal(sample.horizontalFraction, 0.75);
    }
    assert.ok(report.logText.includes("guide=Proportional"));
    assert.ok(report.logText.includes("k=1.0000"));
    assert.ok(report.logText.includes("hf=0.7500"));
    const impact = report.terminal?.impact;
    assert.ok(impact);
    assert.equal(impact.flag, "RUD");
    assert.ok(Math.abs(impact.horizontalMps - 806.7993340011571) < 1e-6);
    assert.ok(Math.abs(impact.verticalMps - -196.874209660856) < 1e-6);
    assert.ok(Math.abs(impact.kineticEnergyJ - 41381077186.45784) < 1e-3);
    assert.ok(Math.abs(report.endTimeS - 602.6173251980908) < 1e-9);
    const impactLine = report.logLines.find((line) => line.includes("impact="));
    assert.ok(impactLine?.includes("guide=Proportional"));
    assert.ok(impactLine?.includes("hf=0.7500"));
  });

  it("reports the 3.5 km/s, 200 t, 5 km proportional case as a flip impact", () => {
    const entry = { altitudeM: 125_000, speedMps: 3500, flightPathDeg: -12, propellantKg: 200_000 };
    const report = runMarsTerminalLanding(false, 1, { ...EARLY_TERMINAL_SEQUENCE, guidanceMode: "Proportional" }, entry);
    const impact = report.terminal?.impact;
    assert.ok(impact);
    assert.equal(impact.flag, "RUD");
    assert.equal(report.samples.some((sample) => sample.sequencePhase === "LandingBurn"), false);
    assert.ok(Math.abs((report.terminal?.triggerTimeS ?? 0) - 163.58) < 1e-6);
    assert.ok(Math.abs(report.endTimeS - 170.56024781261095) < 1e-9);
    assert.ok(Math.abs(impact.horizontalMps - 3374.4447727253787) < 1e-6);
    assert.ok(Math.abs(impact.verticalMps - -709.1341815566301) < 1e-6);
    assert.ok(Math.abs(impact.kineticEnergyJ - 1902359809860.1) < 1);
    assert.equal(report.finalMassKg, 320_000);
    const impactLine = report.logLines.find((line) => line.includes("impact="));
    assert.ok(impactLine?.includes("guide=Proportional"));
    assert.ok(impactLine?.includes("hf=0.7500"));
  });
});

const TRANSLATION_KEYS = [
  "altitudeM",
  "speedMps",
  "verticalMps",
  "accelMps2",
  "propellantKg",
  "totalMassKg",
  "thrustN",
  "dynamicPressurePa",
  "densityKgM3",
  "dragN",
  "gravityMps2",
  "horizontalMps",
  "flightPathDeg",
  "thrustPitchDeg",
  "radiusM",
  "engineState",
  "timeSinceCutoffS",
  "specificEnergyM2S2",
  "propagationMode",
  "semiMajorAxisM",
  "eccentricity",
  "timeSinceElementsS",
  "body",
  "mach",
] as const;

function assertTranslationIdentical(quiet: { samples: TelemetryFrame[]; finalPosition: Vector3d; finalVelocity: Vector3d; achievedDeltaVMps: number; thrustIntegratedDeltaVMps: number; finalMassKg: number }, spinning: typeof quiet) {
  assert.equal(spinning.samples.length, quiet.samples.length);
  for (let i = 0; i < quiet.samples.length; i++) {
    const a = quiet.samples[i];
    const b = spinning.samples[i];
    assert.equal(b.timeS, a.timeS);
    for (const key of TRANSLATION_KEYS) assert.equal(b[key], a[key], `${key} at t=${a.timeS}`);
  }
  assert.equal(spinning.finalPosition.x, quiet.finalPosition.x);
  assert.equal(spinning.finalPosition.y, quiet.finalPosition.y);
  assert.equal(spinning.finalPosition.z, quiet.finalPosition.z);
  assert.equal(spinning.finalVelocity.x, quiet.finalVelocity.x);
  assert.equal(spinning.finalVelocity.y, quiet.finalVelocity.y);
  assert.equal(spinning.finalVelocity.z, quiet.finalVelocity.z);
  assert.equal(spinning.achievedDeltaVMps, quiet.achievedDeltaVMps);
  assert.equal(spinning.thrustIntegratedDeltaVMps, quiet.thrustIntegratedDeltaVMps);
  assert.equal(spinning.finalMassKg, quiet.finalMassKg);
}

function spinCoast(axis: Vector3d, seconds: number, substeps = 1) {
  const env = createEarthEnvironment({ gravityEnabled: false, atmosphereEnabled: false, includeJ2: false });
  const propulsion = createDefaultPropulsion();
  let state = createSeaLevelState(env, axis);
  const steps = Math.round(seconds * STEP_HZ);
  for (let i = 0; i < steps; i++) state = stepRk4(state, 1 / STEP_HZ, substeps, env, propulsion, 0);
  return state;
}

describe("kinematic attitude", () => {
  it("keeps identity and a zero rate when angular velocity is identically zero", () => {
    const earth = runVerticalBurn(false, 1);
    assert.ok(earth.logText.includes("qw=1.000000000"));
    assert.ok(earth.logText.includes("qx=0.000000000"));
    assert.ok(earth.logText.includes("qy=0.000000000"));
    assert.ok(earth.logText.includes("qz=0.000000000"));
    assert.ok(earth.logText.includes("|w|=0.000000 rad/s"));
    assert.ok(earth.logText.includes("theta=0.000000000 rad"));
    for (const sample of earth.samples) {
      assert.equal(sample.quaternionW, 1);
      assert.equal(sample.quaternionX, 0);
      assert.equal(sample.quaternionY, 0);
      assert.equal(sample.quaternionZ, 0);
      assert.equal(sample.angularVelocityRadS, 0);
      assert.equal(sample.rotationAngleRad, 0);
    }
    const i = new QuaternionD(1, 0, 0, 0);
    const j = new QuaternionD(0, 1, 0, 0);
    const k = i.multiply(j);
    assert.equal(k.x, 0);
    assert.equal(k.y, 0);
    assert.equal(k.z, 1);
    assert.equal(k.w, 0);
    const turned = QuaternionD.identity.rotate(new Vector3d(0, 1, 0));
    assert.equal(turned.x, 0);
    assert.equal(turned.y, 1);
    assert.equal(turned.z, 0);
  });

  it("matches the analytic principal-axis angle at 10 s and 30 s", () => {
    const rate = 0.1;
    for (const seconds of [10, 30]) {
      for (const axis of [new Vector3d(rate, 0, 0), new Vector3d(0, rate, 0), new Vector3d(0, 0, rate)]) {
        for (const substeps of [1, 4]) {
          const state = spinCoast(axis, seconds, substeps);
          const expected = QuaternionD.fromAxisAngle(axis, rate * seconds);
          const angle = QuaternionD.rotationAngleBetween(QuaternionD.identity, state.attitude);
          assert.ok(Math.abs(state.attitude.x - expected.x) < 1e-9, `qx ${state.attitude.x} vs ${expected.x}`);
          assert.ok(Math.abs(state.attitude.y - expected.y) < 1e-9, `qy ${state.attitude.y} vs ${expected.y}`);
          assert.ok(Math.abs(state.attitude.z - expected.z) < 1e-9, `qz ${state.attitude.z} vs ${expected.z}`);
          assert.ok(Math.abs(state.attitude.w - expected.w) < 1e-9, `qw ${state.attitude.w} vs ${expected.w}`);
          assert.ok(Math.abs(angle - rate * seconds) < 1e-9, `angle ${angle}`);
          assert.equal(state.angularVelocityBody.x, axis.x);
          assert.equal(state.angularVelocityBody.y, axis.y);
          assert.equal(state.angularVelocityBody.z, axis.z);
          assert.equal(state.velocity.x, 0);
          assert.equal(state.velocity.y, 0);
          assert.equal(state.velocity.z, 0);
          assert.equal(state.position.x, 0);
          assert.equal(state.position.z, 0);
          assert.ok(Math.abs(state.attitude.magnitude - 1) < 1e-12);
        }
      }
    }
  });

  it("does not change any Pass 1–8 translational number when the body rate is non-zero", () => {
    const omega = new Vector3d(0.1, 0, 0);
    const quiet = runVerticalBurn(false, 1);
    const spinning = runVerticalBurn(false, 1, omega);
    assertTranslationIdentical(quiet, spinning);
    const at10 = spinning.samples[2];
    const at30 = spinning.samples[6];
    assert.equal(at10.timeS, 10);
    assert.equal(at30.timeS, 30);
    assert.ok(Math.abs(at10.rotationAngleRad - 1) < 1e-9);
    assert.ok(Math.abs(at30.rotationAngleRad - 3) < 1e-9);
    assert.ok(Math.abs(at10.angularVelocityRadS - 0.1) < 1e-15);
    assert.ok(spinning.logText.includes("theta="));
    const pitched = runPitchedBurn(false, 1, DEFAULT_PITCH_PROGRAM);
    assertTranslationIdentical(pitched, runPitchedBurn(false, 1, DEFAULT_PITCH_PROGRAM, omega));
    const coast = runCoastBurn(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    assertTranslationIdentical(coast, runCoastBurn(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S, omega));
    const kepler = runKeplerCoast(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    const keplerSpin = runKeplerCoast(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S, omega);
    assertTranslationIdentical(kepler, keplerSpin);
    assert.equal(keplerSpin.samples[2].timeS, 10);
    assert.equal(keplerSpin.samples[6].timeS, 30);
    assert.equal(keplerSpin.samples[12].timeS, 60);
    assert.ok(Math.abs(keplerSpin.samples[2].rotationAngleRad - 1) < 1e-9);
    assert.ok(Math.abs(keplerSpin.samples[6].rotationAngleRad - 3) < 1e-9);
    assert.ok(Math.abs(keplerSpin.samples[12].rotationAngleRad - 6) < 1e-8);
    const mars = runMarsVerticalBurn(false, 1);
    assertTranslationIdentical(mars, runMarsVerticalBurn(false, 1, 60, omega));
    const entry = runMarsEntry(false, 1, false, 60);
    assertTranslationIdentical(entry, runMarsEntry(false, 1, false, 60, MARS_ENTRY_INTERFACE, omega));
    const terminal = runMarsTerminalLanding(false, 1, DEFAULT_TERMINAL_SEQUENCE);
    assertTranslationIdentical(terminal, runMarsTerminalLanding(false, 1, DEFAULT_TERMINAL_SEQUENCE, MARS_ENTRY_INTERFACE, omega));
  });
});

function tumbleCoast(omega: Vector3d, seconds: number, substeps = 1) {
  const env = createEarthEnvironment({ gravityEnabled: false, atmosphereEnabled: false, includeJ2: false });
  const propulsion = createDefaultPropulsion();
  let state = createSeaLevelState(env, omega);
  const steps = Math.round(seconds * STEP_HZ);
  for (let i = 0; i < steps; i++) state = stepRk4(state, 1 / STEP_HZ, substeps, env, propulsion, 0);
  return state;
}

describe("torque-free cylinder", () => {
  it("uses a 50 m by 4.5 m cylinder and a zero Euler rate on each principal axis", () => {
    assert.equal(CYLINDER_HEIGHT_M, 50);
    assert.equal(CYLINDER_RADIUS_M, 4.5);
    const mass = DRY_MASS_KG + INITIAL_PROPELLANT_KG;
    const inertia = principalMoments(mass);
    const r2 = 4.5 * 4.5;
    assert.equal(inertia.iyy, 0.5 * mass * r2);
    assert.equal(inertia.ixx, mass * (0.25 * r2 + (50 * 50) / 12));
    assert.equal(inertia.izz, inertia.ixx);
    assert.ok(inertia.ixx > inertia.iyy);
    const dry = principalMoments(DRY_MASS_KG);
    assert.equal(dry.iyy / inertia.iyy, DRY_MASS_KG / mass);
    for (const axis of [new Vector3d(0.2, 0, 0), new Vector3d(0, 0.2, 0), new Vector3d(0, 0, 0.2)]) {
      const rate = eulerRate(axis, inertia);
      assert.ok(rate.x === 0 && rate.y === 0 && rate.z === 0);
    }
    const tumble = eulerRate(new Vector3d(0.04, 0.07, 0.02), inertia);
    assert.equal(tumble.y, 0);
    assert.notEqual(tumble.x, 0);
    assert.notEqual(tumble.z, 0);
  });

  it("keeps every translational baseline when ω is identically zero", () => {
    const earth = runVerticalBurn(false, 1);
    assert.ok(Math.abs(earth.achievedDeltaVMps - 296.123035) < 1e-4);
    assert.ok(Math.abs(earth.samples[18].altitudeM - 10800.316) < 1e-2);
    assert.ok(earth.logText.includes("|L|=0.000000"));
    assert.ok(earth.logText.includes("wx=0.000000000"));
    assert.ok(earth.logText.includes("Iyy="));
    for (const sample of earth.samples) {
      assert.equal(sample.omegaBodyX, 0);
      assert.equal(sample.omegaBodyY, 0);
      assert.equal(sample.omegaBodyZ, 0);
      assert.equal(sample.angularMomentumKgM2S, 0);
      assert.equal(sample.inertiaIxx, sample.inertiaIzz);
      assert.ok(sample.inertiaIxx > sample.inertiaIyy);
    }
    assert.ok(earth.samples[18].inertiaIyy < earth.samples[0].inertiaIyy);
    const pitched = runPitchedBurn(false, 1, DEFAULT_PITCH_PROGRAM);
    const coast = runCoastBurn(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    const kepler = runKeplerCoast(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    assert.equal(coast.samples[12].propellantKg, earth.samples[12].propellantKg);
    assert.equal(kepler.samples[24].dragN, 0);
    assert.equal(pitched.samples[18].horizontalMps > 1, true);
  });

  it("holds principal-axis spins and bounds a small transverse rate", () => {
    for (const axis of [new Vector3d(0.15, 0, 0), new Vector3d(0, 0.15, 0), new Vector3d(0, 0, 0.15)]) {
      const state = tumbleCoast(axis, 20, 1);
      assert.equal(state.angularVelocityBody.x, axis.x);
      assert.equal(state.angularVelocityBody.y, axis.y);
      assert.equal(state.angularVelocityBody.z, axis.z);
      const expected = QuaternionD.fromAxisAngle(axis, 0.15 * 20);
      assert.ok(Math.abs(state.attitude.w - expected.w) < 1e-9);
      assert.ok(Math.abs(state.attitude.x - expected.x) < 1e-9);
    }
    const perturbed = new Vector3d(1e-4, 0.2, 0);
    const held = tumbleCoast(perturbed, 40, 1);
    const transverse = Math.hypot(held.angularVelocityBody.x, held.angularVelocityBody.z);
    assert.equal(held.angularVelocityBody.y, perturbed.y);
    assert.ok(Math.abs(transverse - 1e-4) / 1e-4 < 1e-6);
  });

  it("conserves inertial angular-momentum magnitude at constant mass", () => {
    const omega = new Vector3d(0.04, 0.07, 0.02);
    const env = createEarthEnvironment({ gravityEnabled: false, atmosphereEnabled: false, includeJ2: false });
    const start = createSeaLevelState(env, omega);
    const l0 = inertialAngularMomentum(start.attitude, start.angularVelocityBody, start.totalMassKg);
    for (const substeps of [1, 4]) {
      const state = tumbleCoast(omega, 30, substeps);
      const l1 = inertialAngularMomentum(state.attitude, state.angularVelocityBody, state.totalMassKg);
      const relative = l1.sub(l0).magnitude / l0.magnitude;
      assert.ok(relative < 1e-9, `relative |ΔL| ${relative} at ${substeps} substeps`);
      assert.equal(state.totalMassKg, start.totalMassKg);
      assert.equal(state.angularVelocityBody.y, omega.y);
      assert.ok(Math.abs(state.angularVelocityBody.x - omega.x) > 1e-4);
      assert.ok(Math.abs(state.angularVelocityBody.z - omega.z) > 1e-4);
      assert.equal(state.velocity.x, 0);
      assert.equal(state.velocity.y, 0);
      assert.equal(state.velocity.z, 0);
      assert.ok(Math.abs(state.attitude.magnitude - 1) < 1e-12);
    }
  });

  it("scales |L| with mass and leaves Pass 1–8 translation unchanged", () => {
    const omega = new Vector3d(0.04, 0.07, 0.02);
    const quiet = runVerticalBurn(false, 1);
    const spinning = runVerticalBurn(false, 1, omega);
    assertTranslationIdentical(quiet, spinning);
    const specific0 = spinning.samples[0].angularMomentumKgM2S / spinning.samples[0].totalMassKg;
    const specific90 = spinning.samples[18].angularMomentumKgM2S / spinning.samples[18].totalMassKg;
    assert.ok(spinning.samples[18].totalMassKg < spinning.samples[0].totalMassKg);
    assert.ok(Math.abs(specific90 - specific0) / specific0 < 1e-8, `specific |L| ${specific0} -> ${specific90}`);
    assert.equal(spinning.samples[18].omegaBodyY, omega.y);
    assert.ok(Math.abs(spinning.samples[18].omegaBodyX - omega.x) > 1e-4);
    const principal = new Vector3d(0.1, 0, 0);
    const axial = runVerticalBurn(false, 1, principal);
    assertTranslationIdentical(quiet, axial);
    assert.equal(axial.samples[10].omegaBodyX, 0.1);
    assert.equal(axial.samples[10].omegaBodyY, 0);
    assert.equal(axial.samples[10].omegaBodyZ, 0);
    const kepler = runKeplerCoast(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S);
    const keplerSpin = runKeplerCoast(false, 1, PURE_VERTICAL_PROGRAM, CUTOFF_AT_60_S, COAST_END_S, omega);
    assertTranslationIdentical(kepler, keplerSpin);
    const atCutoff = keplerSpin.samples[12];
    const atEnd = keplerSpin.samples[24];
    assert.equal(atCutoff.timeS, 60);
    assert.equal(atEnd.timeS, 120);
    assert.equal(atEnd.totalMassKg, atCutoff.totalMassKg);
    assert.equal(atEnd.omegaBodyY, omega.y);
    const coastRelative = Math.hypot(
      atEnd.angularMomentumInertialX - atCutoff.angularMomentumInertialX,
      atEnd.angularMomentumInertialY - atCutoff.angularMomentumInertialY,
      atEnd.angularMomentumInertialZ - atCutoff.angularMomentumInertialZ,
    ) / atCutoff.angularMomentumKgM2S;
    assert.ok(coastRelative < 1e-8, `kepler coast |ΔL| ${coastRelative}`);
  });
});

describe("gimbal moment", () => {
  it("maps a constant deflection into the analytic angular acceleration", () => {
    assert.equal(THRUST_AXIAL_OFFSET_M, CYLINDER_HEIGHT_M / 2);
    const propulsion = createDefaultPropulsion();
    const thrust = thrustMagnitudeN(propulsion, 1, INITIAL_PROPELLANT_KG);
    const delta = 0.01;
    const moment = gimbalMoment(thrust, delta);
    const expectedMz = THRUST_AXIAL_OFFSET_M * thrust * Math.sin(delta);
    assert.ok(moment.x === 0);
    assert.ok(moment.y === 0);
    assert.equal(moment.z, expectedMz);
    assert.equal(gimbalMoment(thrust, 0), Vector3d.zero);
    assert.equal(gimbalMoment(0, delta), Vector3d.zero);
    const inertia = principalMoments(INITIAL_MASS_KG);
    const alpha = eulerRate(Vector3d.zero, inertia, moment);
    assert.ok(alpha.x === 0);
    assert.ok(alpha.y === 0);
    assert.equal(alpha.z, expectedMz / inertia.izz);

    const mdot = massFlowKgS(propulsion, 1, INITIAL_PROPELLANT_KG);
    const specificIzz = principalMoments(1).izz;
    for (const substeps of [1, 4]) {
      let omegaZ = 0;
      const h = 1 / STEP_HZ / substeps;
      const steps = 10 * STEP_HZ * substeps;
      for (let n = 1; n <= steps; n++) {
        const mass = INITIAL_MASS_KG - mdot * n * h;
        omegaZ += (expectedMz / (specificIzz * mass)) * h;
      }
      const steered = runVerticalBurn(true, substeps, Vector3d.zero, delta);
      const at10 = steered.samples[2];
      assert.equal(at10.timeS, 10);
      assert.ok(at10.omegaBodyX === 0);
      assert.ok(at10.omegaBodyY === 0);
      const relative = Math.abs(at10.omegaBodyZ - omegaZ) / omegaZ;
      assert.ok(relative < 1e-9, `ωz ${at10.omegaBodyZ} vs ${omegaZ} at ${substeps}`);
      assert.ok(Math.abs(at10.alphaZ - expectedMz / (specificIzz * at10.totalMassKg)) / at10.alphaZ < 1e-12);
      assert.ok(at10.momentZ > 0);
      assert.ok(at10.momentX === 0);
      assert.ok(at10.momentY === 0);
    }
  });

  it("recovers Pass 10 and the translational baselines at zero gimbal", () => {
    const quiet = runVerticalBurn(false, 1);
    const explicit = runVerticalBurn(false, 1, Vector3d.zero, 0);
    assert.equal(explicit.achievedDeltaVMps, quiet.achievedDeltaVMps);
    assert.equal(explicit.thrustIntegratedDeltaVMps, quiet.thrustIntegratedDeltaVMps);
    assert.equal(explicit.samples[18].altitudeM, quiet.samples[18].altitudeM);
    assert.equal(explicit.samples[18].speedMps, quiet.samples[18].speedMps);
    assert.equal(explicit.samples[18].horizontalMps, quiet.samples[18].horizontalMps);
    assert.equal(explicit.samples[18].propellantKg, quiet.samples[18].propellantKg);
    assert.equal(explicit.samples[18].quaternionW, 1);
    assert.equal(explicit.samples[18].omegaBodyX, 0);
    assert.equal(explicit.samples[18].momentZ, 0);
    assert.equal(explicit.samples[18].gimbalRad, 0);
    const omega = new Vector3d(0.1, 0, 0);
    assertTranslationIdentical(runVerticalBurn(false, 1, omega), runVerticalBurn(false, 1, omega, 0));
    const pitched = runPitchedBurn(false, 1, DEFAULT_PITCH_PROGRAM);
    assertTranslationIdentical(pitched, runPitchedBurn(false, 1, DEFAULT_PITCH_PROGRAM, Vector3d.zero, 0));
    const steered = runVerticalBurn(false, 1, Vector3d.zero, 0.01);
    assert.ok(steered.samples[18].horizontalMps > 1);
    assert.notEqual(steered.samples[18].altitudeM, quiet.samples[18].altitudeM);
    assert.equal(steered.thrustIntegratedDeltaVMps, quiet.thrustIntegratedDeltaVMps);
  });
});





