import { useEffect, useMemo, useRef, useState } from "react";
import { clsx } from "clsx";
import { Copy, Download, RotateCcw } from "lucide-react";
import { BurnChart, type BurnPoint } from "@/components/burn-chart";
import { G0_MPS2, VACUUM_ISP_S } from "@/physics/constants";
import { CYLINDER_HEIGHT_M, CYLINDER_RADIUS_M, THRUST_AXIAL_OFFSET_M } from "@/physics/cylinder-inertia";
import { COAST_END_S, CUTOFF_AT_60_S } from "@/physics/cutoff";
import { DEFAULT_PITCH_PROGRAM, PURE_VERTICAL_PROGRAM } from "@/physics/pitch-program";
import { runCoastBurn, runKeplerCoast, runMarsEntry, runMarsTerminalLanding, runMarsVerticalBurn, runPitchedBurn, runVerticalBurn, type SimulationReport } from "@/physics/simulation-harness";
import { DEFAULT_TERMINAL_SEQUENCE, EARLY_TERMINAL_SEQUENCE } from "@/physics/terminal-sequence";
import type { TelemetryFrame } from "@/physics/telemetry";
import { MARS_ENTRY_INTERFACE, marsEntryOrDefault } from "@/physics/vehicle-state";
import { Vector3d } from "@/physics/vector3d";

const TUMBLE_AXIS = new Vector3d(1, 0.65, 0.35).normalized;

const SOURCE_FILES = [
  "Assets/Scripts/Math/DoublePrecisionMath.cs",
  "Assets/Scripts/Math/QuaternionD.cs",
  "Assets/Scripts/PhysicsCore/VehicleState.cs",
  "Assets/Scripts/PhysicsCore/CylinderInertia.cs",
  "Assets/Scripts/PhysicsCore/PlanetaryEnvironment.cs",
  "Assets/Scripts/PhysicsCore/PropulsionModel.cs",
  "Assets/Scripts/PhysicsCore/PitchProgram.cs",
  "Assets/Scripts/PhysicsCore/CutoffCommand.cs",
  "Assets/Scripts/PhysicsCore/IntegratorRK4.cs",
  "Assets/Scripts/PhysicsCore/KeplerPropagator.cs",
  "Assets/Scripts/PhysicsCore/TerminalSequence.cs",
  "Assets/Scripts/PhysicsCore/SimulationHarness.cs",
  "Assets/Scripts/PhysicsCore/AresVerticalBurnDriver.cs",
];

function formatFixed(value: number, digits: number): string {
  if (!Number.isFinite(value)) return "—";
  const negative = value < 0;
  const [whole, frac] = Math.abs(value).toFixed(digits).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}${frac !== undefined ? `.${frac}` : ""}`;
}

function formatTick(seconds: number): string {
  const whole = Math.round(seconds);
  const minutes = Math.floor(whole / 60);
  const rem = whole % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

function formatMet(seconds: number): string {
  const centi = Math.round(seconds * 100);
  const whole = Math.floor(centi / 100);
  const frac = centi % 100;
  const minutes = Math.floor(whole / 60);
  const rem = whole % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rem).padStart(2, "0")}.${String(frac).padStart(2, "0")}`;
}

function formatDensity(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value !== 0 && Math.abs(value) < 1e-4) return value.toExponential(3);
  return formatFixed(value, 6);
}

function formatTiny(value: number, digits: number, unit: string): string {
  if (!Number.isFinite(value)) return "—";
  if (value !== 0 && Math.abs(value) < 0.001) return `${value.toExponential(2)} ${unit}`;
  return `${formatFixed(value, digits)} ${unit}`;
}

function formatAgreement(relativeError: number): string {
  const percent = relativeError * 100;
  if (percent !== 0 && Math.abs(percent) < 0.0001) return `${percent.toExponential(2)}%`;
  return `${formatFixed(percent, 6)}%`;
}

function nearestFrameIndex(frames: TelemetryFrame[], timeS: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < frames.length; i++) {
    const dist = Math.abs(frames[i].timeS - timeS);
    if (dist < bestDist) {
      best = i;
      bestDist = dist;
    }
  }
  return best;
}

function Channel({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="min-w-0 border-t border-border py-3">
      <div className="text-xs tracking-widest text-muted uppercase">{label}</div>
      <div className="mt-1 font-mono text-base tabular-nums text-fg">
        {value}
        <span className="ml-1.5 text-xs tracking-normal text-muted normal-case">{unit}</span>
      </div>
    </div>
  );
}

function Meter({ label, right, fraction }: { label: string; right: string; fraction: number }) {
  const width = Math.max(0, Math.min(100, fraction * 100));
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-xs tracking-widest text-muted uppercase">
        <span>{label}</span>
        <span className="font-mono text-sm tracking-normal text-fg normal-case tabular-nums">{right}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="presentation">
        <div className="h-full bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function AresInstrument() {
  const [body, setBody] = useState<"earth" | "mars">("earth");
  const [origin, setOrigin] = useState<"surface" | "entry">("surface");
  const [mode, setMode] = useState<"earth" | "vacuum">("earth");
  const [program, setProgram] = useState<"vertical" | "pitch">("vertical");
  const [engine, setEngine] = useState<"burn" | "cutoff">("burn");
  const [coast, setCoast] = useState<"numerical" | "kepler">("numerical");
  const [terminal, setTerminal] = useState<"off" | "default" | "early">("off");
  const [horizontal, setHorizontal] = useState<0 | 0.3 | 0.6>(0);
  const [guidance, setGuidance] = useState<"fixed" | "proportional">("fixed");
  const [entrySpeed, setEntrySpeed] = useState(6000);
  const [entryPropellant, setEntryPropellant] = useState(50_000);
  const [entryGamma, setEntryGamma] = useState(-12);
  const [substeps, setSubsteps] = useState(1);
  const [bodyRate, setBodyRate] = useState<0 | 0.05 | 0.1>(0.05);
  const [bodyAxis, setBodyAxis] = useState<"x" | "y" | "z" | "tumble">("tumble");
  const [gimbalDeg, setGimbalDeg] = useState<0 | 0.01 | 0.02>(0);
  const [index, setIndex] = useState<number | "end">("end");
  const [copied, setCopied] = useState(false);
  const [chartReady, setChartReady] = useState(false);
  const playRef = useRef<number | null>(null);

  const omega = useMemo(() => {
    if (bodyRate === 0) return Vector3d.zero;
    if (bodyAxis === "tumble") return TUMBLE_AXIS.scale(bodyRate);
    if (bodyAxis === "y") return new Vector3d(0, bodyRate, 0);
    if (bodyAxis === "z") return new Vector3d(0, 0, bodyRate);
    return new Vector3d(bodyRate, 0, 0);
  }, [bodyAxis, bodyRate]);
  const gimbalRad = (gimbalDeg * Math.PI) / 180;
  const vacuumSeal = useMemo(() => runVerticalBurn(true, substeps), [substeps]);
  const report: SimulationReport = useMemo(() => {
    const vacuum = mode === "vacuum";
    if (body === "mars") {
      if (origin === "entry") {
        const entryState = marsEntryOrDefault(entrySpeed, entryPropellant, entryGamma);
        const tuned = entryState !== MARS_ENTRY_INTERFACE;
        if (terminal === "default" || terminal === "early") {
          const profile = terminal === "early" ? EARLY_TERMINAL_SEQUENCE : DEFAULT_TERMINAL_SEQUENCE;
          if (guidance === "proportional") {
            const config = { ...profile, guidanceMode: "Proportional" as const };
            return tuned
              ? runMarsTerminalLanding(vacuum, substeps, config, entryState, omega, gimbalRad)
              : runMarsTerminalLanding(vacuum, substeps, config, MARS_ENTRY_INTERFACE, omega, gimbalRad);
          }
          if (horizontal > 0) {
            const config = { ...profile, horizontalFraction: horizontal };
            return tuned
              ? runMarsTerminalLanding(vacuum, substeps, config, entryState, omega, gimbalRad)
              : runMarsTerminalLanding(vacuum, substeps, config, MARS_ENTRY_INTERFACE, omega, gimbalRad);
          }
          return tuned
            ? runMarsTerminalLanding(vacuum, substeps, profile, entryState, omega, gimbalRad)
            : runMarsTerminalLanding(vacuum, substeps, profile, MARS_ENTRY_INTERFACE, omega, gimbalRad);
        }
        return tuned
          ? runMarsEntry(vacuum, substeps, coast === "kepler", 300, entryState, omega, gimbalRad)
          : runMarsEntry(vacuum, substeps, coast === "kepler", 300, MARS_ENTRY_INTERFACE, omega, gimbalRad);
      }
      return runMarsVerticalBurn(vacuum, substeps, 60, omega, gimbalRad);
    }
    const guided = program === "pitch" ? DEFAULT_PITCH_PROGRAM : PURE_VERTICAL_PROGRAM;
    if (coast === "kepler") {
      return runKeplerCoast(
        vacuum,
        substeps,
        guided,
        engine === "cutoff" ? CUTOFF_AT_60_S : { tCutoffS: null, propellantRemainingKg: null },
        engine === "cutoff" ? COAST_END_S : 90,
        omega,
        gimbalRad,
      );
    }
    if (engine === "cutoff") {
      return runCoastBurn(vacuum, substeps, guided, CUTOFF_AT_60_S, COAST_END_S, omega, gimbalRad);
    }
    if (program === "pitch") return runPitchedBurn(vacuum, substeps, DEFAULT_PITCH_PROGRAM, omega, gimbalRad);
    if (vacuum) return bodyRate === 0 && gimbalRad === 0 ? vacuumSeal : runVerticalBurn(true, substeps, omega, gimbalRad);
    return runVerticalBurn(false, substeps, omega, gimbalRad);
  }, [body, bodyRate, coast, engine, entryGamma, entryPropellant, entrySpeed, gimbalRad, guidance, horizontal, mode, omega, origin, program, substeps, terminal, vacuumSeal]);

  const frameIndex = index === "end" ? report.frames.length - 1 : Math.min(index, report.frames.length - 1);
  const frame = report.frames[frameIndex] ?? report.frames[report.frames.length - 1];

  const chartData = useMemo<BurnPoint[]>(
    () => report.frames.map((sample) => ({ t: sample.timeS, altKm: sample.altitudeM / 1000, speed: sample.speedMps })),
    [report],
  );

  const activeSample = report.samples.reduce((best, sample) => (sample.timeS <= frame.timeS + 1e-9 ? sample : best), report.samples[0]);

  useEffect(() => {
    setChartReady(true);
    return () => {
      if (playRef.current !== null) cancelAnimationFrame(playRef.current);
    };
  }, []);

  function stopPlayback() {
    if (playRef.current !== null) cancelAnimationFrame(playRef.current);
    playRef.current = null;
  }

  function replay() {
    stopPlayback();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const last = report.frames.length - 1;
    if (reduce) {
      setIndex("end");
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      const u = Math.min(1, (now - started) / 8000);
      setIndex(Math.round(u * last));
      if (u < 1) playRef.current = requestAnimationFrame(tick);
      else playRef.current = null;
    };
    playRef.current = requestAnimationFrame(tick);
  }

  async function copyLog() {
    try {
      await navigator.clipboard.writeText(report.logText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const tw =
    frame.totalMassKg > 0 && frame.thrustN > 0 ? frame.thrustN / (frame.totalMassKg * G0_MPS2) : 0;
  const mdot = frame.thrustN > 0 ? frame.thrustN / (VACUUM_ISP_S * G0_MPS2) : 0;
  const propellantCapacity = report.samples[0]?.propellantKg ?? 1_200_000;
  const propellantFraction = propellantCapacity > 0 ? frame.propellantKg / propellantCapacity : 0;
  const achievedShare = report.idealDeltaVMps > 0 ? report.achievedDeltaVMps / report.idealDeltaVMps : 0;
  const momentumStart = report.samples[0]?.angularMomentumKgM2S ?? 0;
  const massStart = report.samples[0]?.totalMassKg ?? 0;
  const specificStart = massStart > 0 ? momentumStart / massStart : 0;
  const lix0 = report.samples[0]?.angularMomentumInertialX ?? 0;
  const liy0 = report.samples[0]?.angularMomentumInertialY ?? 0;
  const liz0 = report.samples[0]?.angularMomentumInertialZ ?? 0;
  const specificVectorDrift =
    specificStart > 0 && frame.totalMassKg > 0
      ? Math.hypot(
          frame.angularMomentumInertialX / frame.totalMassKg - lix0 / massStart,
          frame.angularMomentumInertialY / frame.totalMassKg - liy0 / massStart,
          frame.angularMomentumInertialZ / frame.totalMassKg - liz0 / massStart,
        ) / specificStart
      : 0;
  const terminalLive = body === "mars" && origin === "entry";
  const terminalArmed = terminalLive && terminal !== "off";
  const entryState = marsEntryOrDefault(entrySpeed, entryPropellant, entryGamma);
  const entryTuned = terminalLive && entryState !== MARS_ENTRY_INTERFACE;
  const proportional = terminalArmed && guidance === "proportional";
  const fixedFraction = terminalArmed && !proportional ? (report.terminal?.config.horizontalFraction ?? 0) : 0;
  const horizLive = terminalArmed && guidance !== "proportional";

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-5 pb-16 sm:px-6">
      <header className="border-b border-border pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs tracking-widest text-primary uppercase">
              {gimbalDeg > 0
                ? "Gimbal moment"
                : bodyRate > 0
                ? "Torque-free Euler"
                : proportional || entryTuned
                ? "Mars GNC · Pass 8"
                : terminalArmed
                ? fixedFraction > 0
                  ? "Mars GNC · Pass 7"
                  : "Mars GNC · Pass 6"
                : body === "mars"
                ? "Mars GNC · Pass 5"
                : report.analyticKepler
                ? "Mars GNC · Pass 4"
                : engine === "cutoff"
                  ? "Mars GNC · Pass 3"
                  : program === "pitch"
                    ? "Mars GNC · Pass 2"
                    : "Mars GNC · Pass 1"}
            </p>
            <h1 className="mt-1 font-mono text-3xl leading-none text-fg sm:text-4xl">ARES CORE</h1>
            <p className="mt-2 max-w-xl text-sm text-pretty text-muted">
              {body === "mars"
                ? origin === "entry"
                  ? terminal === "default"
                    ? proportional
                      ? "Proportional landing law after the 3 km gate. The share is clamp(horizontal speed / 500 m/s, 0, 0.75) and is held for each 0.02 s step. Throttle stays 60%."
                      : fixedFraction > 0
                      ? "Terminal sequence armed. Coast to 3 km, flip upright with thrust off, then a 60% burn aimed between local up and the anti-horizontal direction. The aim is held for each 0.02 s step."
                      : "Terminal sequence armed. Coast to 3 km, flip to local vertical in 8 s with thrust off, then a 60% landing burn. Radial speed within 2 m/s and horizontal speed within 0.5 m/s is nominal. Anything faster is a RUD."
                    : terminal === "early"
                      ? proportional
                        ? "Proportional landing law after the 5 km gate, then full thrust. The share is clamp(horizontal speed / 500 m/s, 0, 0.75). A 3.5 km/s, 200 t entry still meets the surface during the 8 s unpowered flip."
                        : fixedFraction > 0
                        ? "Earlier gate at 5 km, full thrust, with the same scheduled horizontal share on the landing burn. The touchdown gate is unchanged."
                        : "Earlier gate at 5 km, then the same 8 s flip and a 100% vertical burn. The touchdown gate is unchanged. This open-loop burn does not cancel horizontal speed."
                      : entryTuned
                        ? `Entry ${formatFixed(entrySpeed, 0)} m/s at ${formatFixed(entryGamma, 1)}°, ${formatFixed(entryPropellant, 0)} kg. Altitude stays 125 km. Engines stay off until a terminal sequence is armed.`
                        : mode === "vacuum"
                    ? "Entry interface with gravity and atmosphere off. 6 km/s at −12° holds a straight line. Engines stay off."
                    : coast === "kepler"
                      ? "125 km, 6,000 m/s, −12°. Engines off. After the capture instant the arc is drag-free Kepler and specific energy stays constant."
                      : "125 km, 6,000 m/s, −12°, 50 t of propellant left. Engines off for 300 s. Numerical coast keeps the exponential Mars atmosphere."
                  : coast === "kepler"
                    ? "Kepler coast is armed, but the surface engine is still burning, so this run stays on RK4."
                    : mode === "vacuum"
                      ? "Mars selected with gravity and atmosphere off. Pure +Y thrust for 60 seconds."
                      : "Mars surface. μ = 4.282837×10¹³ m³/s², ρ = 0.020 exp(−h / 11,100). Pure +Y thrust for 60 seconds. J2 is off."
                : report.analyticKepler
                ? program === "pitch"
                  ? "Cutoff at 60 s, then a drag-free Kepler arc to 120 s. Horizontal speed and flight-path angle follow the captured orbit. Energy stays constant."
                  : mode === "vacuum"
                    ? "Cutoff at 60 s. With gravity off the analytic step is a straight line at constant speed."
                    : "Cutoff at 60 s on the verified Earth burn, then universal-variable Kepler to 120 s. Drag is zero after the element capture."
                : engine === "cutoff"
                ? program === "pitch"
                  ? "Pitch-over, then cutoff at 60 s. Coast to 120 s. Horizontal speed remains after the engine stops."
                  : mode === "vacuum"
                    ? "Cutoff at 60 s with gravity and atmosphere off. The coast is a straight constant-velocity line."
                    : "Cutoff at 60 s. Thrust and mass flow stop. Coast to 120 s under gravity and drag."
                : program === "pitch"
                  ? mode === "vacuum"
                    ? "Pitch program with gravity and atmosphere off. Thrust stays +Y for 20 s, then leaves it at 1.0 deg/s."
                    : "Open-loop pitch: inertial +Y for 20 s, then 1.0 deg/s toward +X."
                : coast === "kepler"
                  ? "Kepler coast is armed, but thrust is still commanded, so this run stays on the verified RK4 burn."
                  : mode === "vacuum"
                    ? "Gravity and atmosphere are off. Inertial speed must match the ideal rocket equation within 0.1%."
                    : "Sea-level Earth, point-mass gravity, exponential air. 100% thrust along inertial +Y for 90 seconds."}
              {bodyRate > 0 && gimbalDeg === 0
                ? bodyAxis === "tumble"
                  ? ` Torque-free tumble at ${bodyRate.toFixed(2)} rad/s on a ${CYLINDER_HEIGHT_M} m × ${CYLINDER_RADIUS_M} m cylinder. External torque is zero. ωx and ωz exchange while ωy holds. |L| is conserved in the inertial frame at constant mass, and scales with mass while propellant leaves. Translation matches ω = 0.`
                  : ` Principal spin ${bodyRate.toFixed(2)} rad/s about body +${bodyAxis.toUpperCase()}. External torque is zero, so this rate stays on the axis. Translation matches ω = 0.`
                : ""}
              {gimbalDeg > 0
                ? ` Gimbal ${gimbalDeg.toFixed(2)}° from body +Y toward +X${bodyRate > 0 ? `, with the ${bodyRate.toFixed(2)} rad/s body rate still on the vehicle` : ""}. Thrust acts ${THRUST_AXIAL_OFFSET_M} m aft of the CoM, so M = r × F and αz = Mz / Izz from rest. Zero gimbal restores Pass 10 and the translational baselines.`
                : ""}
            </p>
          </div>
          <div
            className={clsx(
              "shrink-0 rounded-md border px-3 py-2 text-right",
              vacuumSeal.vacuumCheckPassed ? "border-primary" : "border-border",
            )}
          >
            <div className="text-xs tracking-widest text-muted uppercase">Vacuum seal</div>
            <div className="mt-1 font-mono text-lg tabular-nums text-fg">{formatAgreement(vacuumSeal.relativeError)}</div>
            <div className="text-xs tracking-widest text-primary uppercase">
              {vacuumSeal.vacuumCheckPassed ? "Pass" : "Fail"} · 0.1% limit
            </div>
          </div>
        </div>
      </header>

      <section className="mt-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
        <div className="sm:w-48">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">Body</div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="Primary body">
            <ModeButton active={body === "earth"} onClick={() => setBody("earth")}>
              Earth
            </ModeButton>
            <ModeButton active={body === "mars"} onClick={() => setBody("mars")}>
              Mars
            </ModeButton>
          </div>
        </div>
        <div className="sm:w-64">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">Start</div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="Initial state">
            <ModeButton active={body === "mars" && origin === "surface"} disabled={body !== "mars"} onClick={() => setOrigin("surface")}>
              Surface
            </ModeButton>
            <ModeButton active={body === "mars" && origin === "entry"} disabled={body !== "mars"} onClick={() => setOrigin("entry")}>
              Entry
            </ModeButton>
          </div>
        </div>
        <div className="sm:w-72">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">Terminal</div>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="Terminal sequence">
            <ModeButton active={!terminalLive || terminal === "off"} disabled={!terminalLive} onClick={() => setTerminal("off")}>
              Off
            </ModeButton>
            <ModeButton active={terminalLive && terminal === "default"} disabled={!terminalLive} onClick={() => setTerminal("default")}>
              3 km
            </ModeButton>
            <ModeButton active={terminalLive && terminal === "early"} disabled={!terminalLive} onClick={() => setTerminal("early")}>
              5 km
            </ModeButton>
          </div>
        </div>
        <div className="sm:w-56">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">Horiz</div>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="Landing horizontal fraction">
            <ModeButton active={!horizLive || horizontal === 0} disabled={!horizLive} onClick={() => setHorizontal(0)}>
              0
            </ModeButton>
            <ModeButton active={horizLive && horizontal === 0.3} disabled={!horizLive} onClick={() => setHorizontal(0.3)}>
              0.3
            </ModeButton>
            <ModeButton active={horizLive && horizontal === 0.6} disabled={!horizLive} onClick={() => setHorizontal(0.6)}>
              0.6
            </ModeButton>
          </div>
        </div>
        <div className="sm:w-48">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">Guidance</div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="Landing guidance">
            <ModeButton active={!terminalArmed || guidance === "fixed"} disabled={!terminalArmed} onClick={() => setGuidance("fixed")}>
              Fixed
            </ModeButton>
            <ModeButton active={terminalArmed && guidance === "proportional"} disabled={!terminalArmed} onClick={() => setGuidance("proportional")}>
              Prop
            </ModeButton>
          </div>
        </div>
        <div className="sm:w-64">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">Entry</div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="Entry interface preset">
            <ModeButton
              active={!terminalLive || !entryTuned}
              disabled={!terminalLive}
              onClick={() => {
                setEntrySpeed(6000);
                setEntryPropellant(50_000);
                setEntryGamma(-12);
              }}
            >
              6 km/s
            </ModeButton>
            <ModeButton
              active={terminalLive && entrySpeed === 3500 && entryPropellant === 200_000 && entryGamma === -12}
              disabled={!terminalLive}
              onClick={() => {
                setEntrySpeed(3500);
                setEntryPropellant(200_000);
                setEntryGamma(-12);
              }}
            >
              3.5 km/s
            </ModeButton>
          </div>
        </div>
        <NumberField label="Speed m/s" value={entrySpeed} disabled={!terminalLive} onCommit={(next) => { if (next > 0 && next <= 12_000) setEntrySpeed(next); }} />
        <NumberField label="Propellant kg" value={entryPropellant} disabled={!terminalLive} onCommit={(next) => { if (next >= 0 && next <= 2_000_000) setEntryPropellant(next); }} />
        <NumberField label="Gamma deg" value={entryGamma} disabled={!terminalLive} onCommit={(next) => { if (next >= -90 && next <= 90) setEntryGamma(next); }} />
        <div className="flex-1">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">Environment</div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="Environment">
            <ModeButton active={mode === "earth"} onClick={() => setMode("earth")}>
              {body === "mars" ? "Mars" : "Earth"}
            </ModeButton>
            <ModeButton active={mode === "vacuum"} onClick={() => setMode("vacuum")}>
              Vacuum
            </ModeButton>
          </div>
        </div>
        <div className="sm:w-56">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">Thrust program</div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="Thrust program">
            <ModeButton active={body === "mars" ? origin === "surface" : program === "vertical"} disabled={body === "mars"} onClick={() => setProgram("vertical")}>
              Vertical
            </ModeButton>
            <ModeButton active={body === "mars" ? false : program === "pitch"} disabled={body === "mars"} onClick={() => setProgram("pitch")}>
              1°/s
            </ModeButton>
          </div>
        </div>
        <div className="sm:w-52">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">Engine</div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="Engine cutoff">
            <ModeButton active={body === "mars" ? origin === "surface" : engine === "burn"} disabled={body === "mars"} onClick={() => setEngine("burn")}>
              Burn
            </ModeButton>
            <ModeButton active={body === "mars" ? false : engine === "cutoff"} disabled={body === "mars"} onClick={() => setEngine("cutoff")}>
              Cut 60 s
            </ModeButton>
          </div>
        </div>
        <div className="sm:w-64">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">Coast</div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="Coast propagator">
            <ModeButton active={terminalArmed ? true : coast === "numerical"} disabled={terminalArmed} onClick={() => setCoast("numerical")}>
              Numerical
            </ModeButton>
            <ModeButton active={terminalArmed ? false : coast === "kepler"} disabled={terminalArmed} onClick={() => setCoast("kepler")}>
              Kepler
            </ModeButton>
          </div>
        </div>
        <div className="sm:w-64">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">RK4 sub-steps</div>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="RK4 sub-steps">
            {[1, 4, 20].map((count) => (
              <ModeButton key={count} active={substeps === count} onClick={() => setSubsteps(count)}>
                {`${count}×`}
              </ModeButton>
            ))}
          </div>
        </div>
        <div className="sm:w-64">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">Body rate</div>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="Body angular rate">
            {([0, 0.05, 0.1] as const).map((rate) => (
              <ModeButton key={rate} active={bodyRate === rate} onClick={() => setBodyRate(rate)}>
                {rate === 0 ? "0" : rate.toFixed(2)}
              </ModeButton>
            ))}
          </div>
        </div>
        <div className="sm:w-80">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">Rate axis</div>
          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="Body rate axis">
            {(["x", "y", "z", "tumble"] as const).map((axis) => (
              <ModeButton key={axis} active={bodyAxis === axis} disabled={bodyRate === 0} onClick={() => setBodyAxis(axis)}>
                {axis === "tumble" ? "Tumble" : `+${axis.toUpperCase()}`}
              </ModeButton>
            ))}
          </div>
        </div>
        <div className="sm:w-64">
          <div className="mb-2 text-xs tracking-widest text-muted uppercase">Gimbal</div>
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-md border border-border bg-border" role="radiogroup" aria-label="Gimbal deflection">
            {([0, 0.01, 0.02] as const).map((angle) => (
              <ModeButton key={angle} active={gimbalDeg === angle} onClick={() => setGimbalDeg(angle)}>
                {angle === 0 ? "0°" : `${angle.toFixed(2)}°`}
              </ModeButton>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-xs tracking-widest text-muted uppercase">Mission elapsed</div>
              <div className="mt-1 font-mono text-3xl tabular-nums text-fg">T+ {formatMet(frame.timeS)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs tracking-widest text-primary uppercase">Engine on</div>
              <div className="mt-1 font-mono text-sm tabular-nums text-fg">
                {frame.sequencePhase
                  ? frame.impactFlag === "nominal"
                    ? "Touchdown · nominal"
                    : frame.impactFlag === "RUD"
                      ? "Touchdown · RUD"
                      : frame.sequencePhase === "LandingBurn"
                        ? proportional
                          ? `Prop · hf ${formatFixed(frame.horizontalFraction ?? 0, 2)}`
                          : fixedFraction > 0
                            ? `Aim · ${formatFixed(frame.thrustPitchFromVerticalDeg ?? 0, 1)}° off up`
                            : `Vertical · ${formatFixed((frame.thrustN / 15_000_000) * 100, 0)}%`
                        : frame.sequencePhase === "Flip"
                          ? `Flip · ${formatFixed(frame.thrustPitchFromVerticalDeg ?? 0, 1)}° from up`
                          : frame.sequencePhase === "Complete"
                            ? "Sequence complete"
                            : "Coast · thrust 0"
                  : frame.engineState === 0
                  ? "Cutoff · thrust 0"
                  : frame.thrustPitchDeg === 0
                    ? "+Y · 100%"
                    : `${formatFixed(frame.thrustPitchDeg, 2)}° from +Y`}
              </div>
            </div>
          </div>
          <div className="mt-6">
            <div className="text-xs tracking-widest text-muted uppercase">Altitude</div>
            <div className="mt-1 font-mono text-4xl leading-none tabular-nums text-fg sm:text-5xl">
              {formatFixed(frame.altitudeM, 1)}
            </div>
            <div className="mt-2 text-sm text-muted">
              {frame.impactFlag ? "impact altitude clamped at the spherical surface" : "meters above the spherical surface"}
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs tracking-widest text-muted uppercase">Inertial speed</div>
              <div className="mt-1 font-mono text-2xl tabular-nums text-fg">{formatFixed(frame.speedMps, 2)}</div>
              <div className="text-sm text-muted">m/s</div>
            </div>
            <div>
              <div className="text-xs tracking-widest text-muted uppercase">{frame.sequencePhase ? "Radial" : "Vertical"}</div>
              <div className="mt-1 font-mono text-2xl tabular-nums text-fg">
                {formatFixed(frame.sequencePhase ? (frame.radialMps ?? 0) : frame.verticalMps, 2)}
              </div>
              <div className="text-sm text-muted">{frame.sequencePhase ? "m/s · up" : "m/s · +Y"}</div>
            </div>
          </div>
          <div className="mt-6">
            <Meter
              label="Propellant remaining"
              right={`${formatFixed(frame.propellantKg, 0)} kg`}
              fraction={propellantFraction}
            />
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <div className="text-xs tracking-widest text-muted uppercase">
            {terminalArmed
              ? proportional
                ? terminal === "early"
                  ? "Mars terminal · 5 km · proportional"
                  : "Mars terminal · 3 km · proportional"
                : fixedFraction > 0
                  ? terminal === "early"
                    ? `Mars terminal · 5 km · hf ${formatFixed(fixedFraction, 1)}`
                    : `Mars terminal · 3 km · 60% · hf ${formatFixed(fixedFraction, 1)}`
                  : terminal === "early"
                    ? "Mars terminal · 5 km · 100%"
                    : "Mars terminal · 3 km · 60%"
              : body === "mars"
              ? origin === "entry"
                ? report.disableGravityAndAtmosphere
                  ? "Mars entry · vacuum · 300 s"
                  : report.analyticKepler
                    ? "Mars entry · Kepler · 300 s"
                    : "Mars entry · numerical · 300 s"
                : report.disableGravityAndAtmosphere
                  ? "Mars vacuum · vertical 60 s"
                  : "Mars surface · vertical 60 s"
              : report.analyticKepler
              ? report.pitchProgram
                ? "Kepler coast · pitched cutoff"
                : "Kepler coast · vertical cutoff"
              : report.cutoff
              ? report.pitchProgram
                ? "Pitched cutoff · coast 120 s"
                : "Cutoff 60 s · coast 120 s"
              : report.pitchProgram
                ? report.disableGravityAndAtmosphere
                  ? "Pitched vacuum · 90 s"
                  : "Pitched Earth · 90 s"
                : report.disableGravityAndAtmosphere
                  ? "Vacuum check · 90 s"
                  : "Earth burn · 90 s"}
          </div>
          <h2 className="mt-1 text-xl text-fg">Delta-v closure</h2>
          <dl className="mt-4 grid grid-cols-1 gap-3">
            <DeltaRow label="Ideal rocket" value={formatFixed(report.idealDeltaVMps, 3)} unit="m/s" />
            <DeltaRow label="Integrated thrust" value={formatFixed(report.thrustIntegratedDeltaVMps, 3)} unit="m/s" />
            <DeltaRow label="Inertial |Δv|" value={formatFixed(report.achievedDeltaVMps, 3)} unit="m/s" />
            <DeltaRow label="Ideal − inertial" value={formatTiny(report.differenceMps, 3, "m/s").replace(/ m\/s$/, "")} unit="m/s" />
          </dl>
          <div className="mt-5">
            <Meter
              label="Inertial share of ideal"
              right={formatFixed(Math.min(achievedShare, 1) * 100, 2) + "%"}
              fraction={achievedShare}
            />
          </div>
          <p className="mt-4 text-sm text-pretty text-muted">
            {terminalArmed
              ? report.terminal?.impact
                ? `Impact ${report.terminal.impact.flag}. Radial ${formatFixed(report.terminal.impact.verticalMps, 1)} m/s, horizontal ${formatFixed(report.terminal.impact.horizontalMps, 1)} m/s, kinetic energy ${report.terminal.impact.kineticEnergyJ.toExponential(3)} J. The impact altitude is clamped at 0.${proportional ? " The landing fraction follows horizontal speed." : fixedFraction > 0 ? ` Landing fraction ${formatFixed(fixedFraction, 1)} opposes horizontal velocity.` : ""}`
                : "The sequence reached the time limit without meeting the spherical surface."
              : body === "mars"
              ? origin === "entry"
                ? report.analyticKepler
                  ? "Engines are off from the interface. Semi-major axis and eccentricity freeze at capture. Drag, density, and dynamic pressure are zero on the Kepler arc."
                  : report.disableGravityAndAtmosphere
                    ? "No thrust, no gravity, no air. Speed stays 6,000 m/s and the flight-path angle stays −12°."
                    : "No thrust. Altitude falls under Mars gravity. Density follows ρ0 exp(−h / H) while the vehicle is still above the surface."
                : "Ideal minus inertial speed is Mars gravity and drag. Integrated thrust still matches the rocket equation. μ/R² is about 3.73 m/s²."
              : report.analyticKepler
              ? "After cutoff the state is a two-body arc. Semi-major axis and eccentricity are frozen at capture. Drag, density, and dynamic pressure are zero on that arc even if Earth air is selected."
              : report.cutoff
              ? "Thrust and mass flow are zero after cutoff. Ideal Δv uses only the propellant burned before cutoff. Integrated thrust stops with the engine."
              : report.pitchProgram
                ? "Ideal minus inertial speed includes gravity, drag, and the turn. Integrated thrust is still the rocket-equation impulse."
                : report.disableGravityAndAtmosphere
                  ? `Inertial speed agrees with Isp·g0·ln(m0/mf) to ${formatAgreement(report.relativeError)}. Limit is 0.100%.`
                  : `Ideal minus inertial speed is the gravity and drag loss. Integrated thrust still matches the rocket equation, because mass flow does not depend on the trajectory.`}
          </p>
          <p className="mt-2 font-mono text-xs tracking-widest text-primary uppercase">
            {terminalArmed
              ? report.terminal?.impact?.flag === "nominal"
                ? "Verdict · nominal touchdown"
                : report.terminal?.impact
                  ? "Verdict · RUD"
                  : "Verdict · no impact"
              : body === "mars"
              ? origin === "entry"
                ? report.analyticKepler
                  ? "Verdict · analytic Kepler"
                  : "Verdict · Mars entry"
                : "Verdict · Mars surface burn"
              : report.analyticKepler
              ? "Verdict · analytic Kepler"
              : report.cutoff
              ? "Verdict · cutoff and coast"
              : report.pitchProgram
                ? "Verdict · open-loop pitch"
                : report.vacuumCheckApplies
                  ? report.vacuumCheckPassed
                    ? "Verdict · pass"
                    : "Verdict · fail"
                  : "Verdict · gravity and drag loss"}
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-md border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <label className="text-xs tracking-widest text-muted uppercase" htmlFor="burn-scrub">
            Scrub the burn
          </label>
          <button
            type="button"
            onClick={replay}
            className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-bg px-3 text-sm text-fg"
          >
            <RotateCcw className="size-4" aria-hidden="true" />
            Replay
          </button>
        </div>
        <input
          id="burn-scrub"
          type="range"
          min={0}
          max={Math.max(0, report.frames.length - 1)}
          step={1}
          value={frameIndex}
          aria-valuetext={`T+ ${formatMet(frame.timeS)}`}
          onChange={(event) => {
            stopPlayback();
            setIndex(Number(event.target.value));
          }}
        />
        <div className="flex justify-between font-mono text-xs tabular-nums text-muted">
          <span>{formatTick(0)}</span>
          <span>{formatTick(report.endTimeS / 2)}</span>
          <span>{formatTick(report.endTimeS)}</span>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.85fr)]">
        <div className="rounded-md border border-border bg-surface p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="text-sm tracking-widest text-muted uppercase">Trajectory</h2>
            <div className="flex gap-3 font-mono text-xs text-muted">
              <span className="text-primary">Altitude km</span>
              <span className="text-fg">Speed m/s</span>
            </div>
          </div>
          {chartReady ? (
            <BurnChart data={chartData} timeS={frame.timeS} />
          ) : (
            <div className="flex h-52 items-end border-b border-border text-sm text-muted">Altitude and speed</div>
          )}
          <div className="mt-4 flex items-center gap-4 border-t border-border pt-4">
            <AttitudeTriad w={frame.quaternionW} x={frame.quaternionX} y={frame.quaternionY} z={frame.quaternionZ} />
            <div className="min-w-0 flex-1">
              <div className="text-xs tracking-widest text-muted uppercase">Attitude</div>
              <p className="mt-1 font-mono text-sm tabular-nums text-fg">
                {frame.quaternionW.toFixed(6)} {frame.quaternionX.toFixed(6)} {frame.quaternionY.toFixed(6)} {frame.quaternionZ.toFixed(6)}
              </p>
              <p className="mt-1 text-xs text-muted">w · x · y · z · body to inertial</p>
              <p className="mt-2 font-mono text-sm tabular-nums text-fg">
                θ {formatFixed((frame.rotationAngleRad * 180) / Math.PI, 3)}°
                <span className="ml-2 text-muted">{frame.rotationAngleRad.toFixed(6)} rad</span>
              </p>
              <p className="mt-1 font-mono text-xs tabular-nums text-muted">
                |ω| {frame.angularVelocityRadS.toFixed(6)} rad/s
                <span className="mx-1">·</span>
                ω {frame.omegaBodyX.toFixed(4)} {frame.omegaBodyY.toFixed(4)} {frame.omegaBodyZ.toFixed(4)}
              </p>
              <p className="mt-1 font-mono text-xs tabular-nums text-muted">
                |L| {formatFixed(frame.angularMomentumKgM2S, 0)} kg·m²/s
                {momentumStart > 0
                  ? ` · L/m drift ${specificVectorDrift.toExponential(1)}`
                  : bodyRate === 0
                    ? " · ω = 0 baseline"
                    : ""}
              </p>
              <p className="mt-1 font-mono text-xs tabular-nums text-muted">
                Mz {formatFixed(frame.momentZ, 0)} N·m
                <span className="mx-1">·</span>
                αz {frame.alphaZ.toExponential(3)} rad/s²
              </p>
            </div>
          </div>
          <div className="mt-4 grid min-w-0 grid-cols-2 gap-x-4">
            <Channel label="Acceleration" value={formatFixed(frame.accelMps2, 3)} unit="m/s²" />
            <Channel label="Gravity" value={formatFixed(frame.gravityMps2, 4)} unit="m/s²" />
            <Channel label="Thrust" value={formatFixed(frame.thrustN, 0)} unit="N" />
            <Channel label="Drag" value={formatFixed(frame.dragN, 1)} unit="N" />
            <Channel label="Dynamic pressure" value={formatFixed(frame.dynamicPressurePa, 1)} unit="Pa" />
            <Channel label="Density" value={formatDensity(frame.densityKgM3)} unit="kg/m³" />
            <Channel label="Body" value={frame.body} unit="primary" />
            <Channel label="Mach" value={formatFixed(frame.mach, 3)} unit={frame.body === "Mars" ? "a = 240 m/s" : "a = 340 m/s"} />
            <Channel label="Mass" value={formatFixed(frame.totalMassKg, 1)} unit="kg" />
            <Channel label="Mass flow" value={formatFixed(mdot, 2)} unit="kg/s" />
            <Channel label="T / W₀" value={formatFixed(tw, 3)} unit="g0" />
            <Channel label="Propellant" value={formatFixed(frame.propellantKg, 1)} unit="kg" />
            <Channel label="Horizontal speed" value={formatFixed(frame.horizontalMps, 2)} unit="m/s" />
            <Channel label="Flight-path angle" value={formatFixed(frame.flightPathDeg, 2)} unit="deg" />
            <Channel label="Thrust pitch" value={formatFixed(frame.thrustPitchDeg, 2)} unit="deg from +Y" />
            <Channel label="Radius" value={formatFixed(frame.radiusM, 1)} unit="m" />
            <Channel label="Quaternion w" value={formatFixed(frame.quaternionW, 6)} unit="scalar" />
            <Channel label="Quaternion x" value={formatFixed(frame.quaternionX, 6)} unit="i" />
            <Channel label="Quaternion y" value={formatFixed(frame.quaternionY, 6)} unit="j" />
            <Channel label="Quaternion z" value={formatFixed(frame.quaternionZ, 6)} unit="k" />
            <Channel label="Body rate" value={formatFixed(frame.angularVelocityRadS, 6)} unit="rad/s" />
            <Channel label="ωx" value={formatFixed(frame.omegaBodyX, 6)} unit="rad/s" />
            <Channel label="ωy" value={formatFixed(frame.omegaBodyY, 6)} unit="rad/s · axial" />
            <Channel label="ωz" value={formatFixed(frame.omegaBodyZ, 6)} unit="rad/s" />
            <Channel label="Angular momentum" value={formatFixed(frame.angularMomentumKgM2S, 0)} unit="kg·m²/s" />
            <Channel label="L inertial x" value={formatFixed(frame.angularMomentumInertialX, 0)} unit="kg·m²/s" />
            <Channel label="L inertial y" value={formatFixed(frame.angularMomentumInertialY, 0)} unit="kg·m²/s" />
            <Channel label="L inertial z" value={formatFixed(frame.angularMomentumInertialZ, 0)} unit="kg·m²/s" />
            <Channel label="Ixx = Izz" value={formatFixed(frame.inertiaIxx, 0)} unit="kg·m²" />
            <Channel label="Iyy" value={formatFixed(frame.inertiaIyy, 0)} unit="kg·m² · axial" />
            <Channel label="Gimbal" value={formatFixed((frame.gimbalRad * 180) / Math.PI, 3)} unit="deg from +Y" />
            <Channel label="Moment z" value={formatFixed(frame.momentZ, 0)} unit="N·m" />
            <Channel label="αz" value={formatFixed(frame.alphaZ, 6)} unit="rad/s²" />
            <Channel label="Rotation angle" value={formatFixed((frame.rotationAngleRad * 180) / Math.PI, 3)} unit="deg from initial" />
            <Channel label="Engine state" value={frame.engineState === 1 ? "1" : "0"} unit={frame.engineState === 1 ? "thrusting" : "cutoff"} />
            <Channel label="Since cutoff" value={formatFixed(frame.timeSinceCutoffS, 2)} unit="s" />
            <Channel label="Specific energy" value={frame.specificEnergyM2S2.toExponential(4)} unit="m²/s²" />
            <Channel
              label="Propagation"
              value={frame.propagationMode === "analytic" ? "Analytic" : "Numerical"}
              unit={frame.propagationMode === "analytic" ? "Kepler" : "RK4"}
            />
            <Channel
              label="Semi-major axis"
              value={frame.timeSinceElementsS > 0 || frame.semiMajorAxisM !== 0 ? formatAxis(frame.semiMajorAxisM) : "—"}
              unit="m"
            />
            <Channel
              label="Eccentricity"
              value={frame.timeSinceElementsS > 0 || frame.eccentricity !== 0 ? formatFixed(frame.eccentricity, 6) : "—"}
              unit="e"
            />
            <Channel
              label="Since elements"
              value={formatFixed(frame.timeSinceElementsS, 2)}
              unit="s"
            />
            {frame.sequencePhase ? (
              <>
                <Channel label="Phase" value={frame.sequencePhase} unit="terminal" />
                <Channel label="Pitch from vertical" value={formatFixed(frame.thrustPitchFromVerticalDeg ?? 0, 2)} unit="deg" />
                <Channel label="Impact" value={frame.impactFlag ? frame.impactFlag : "—"} unit={frame.impactFlag ? "touchdown" : "in flight"} />
                <Channel
                  label="Impact energy"
                  value={frame.impactFlag && frame.impactKineticEnergyJ !== undefined ? frame.impactKineticEnergyJ.toExponential(3) : "—"}
                  unit="J"
                />
                <Channel label="Peak speed" value={formatFixed(frame.peakSpeedMps ?? 0, 1)} unit="m/s" />
                {proportional ? (
                  <>
                    <Channel label="Guidance" value="Proportional" unit="k · vh / vref" />
                    <Channel label="Horiz fraction" value={formatFixed(frame.horizontalFraction ?? 0, 3)} unit="commanded" />
                  </>
                ) : fixedFraction > 0 ? (
                  <Channel
                    label="Horiz fraction"
                    value={formatFixed(frame.horizontalFraction ?? 0, 2)}
                    unit={frame.sequencePhase === "LandingBurn" || frame.impactFlag ? "commanded" : "coast"}
                  />
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm tracking-widest text-muted uppercase">Five-second log</h2>
            <button
              type="button"
              onClick={copyLog}
              className="inline-flex h-11 items-center gap-2 rounded-md border border-border bg-bg px-3 text-sm text-fg"
            >
              <Copy className="size-4" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <ul className="mt-2 max-h-[64rem] overflow-y-auto">
            <li className="flex justify-between gap-3 font-mono text-xs tracking-widest text-muted uppercase">
              <span>Met</span>
              <span>Altitude</span>
              <span>Speed</span>
              <span>θ</span>
              {report.terminal ? <span>Phase</span> : null}
            </li>
            {report.samples.map((sample, sampleIndex) => {
              const selected = sample.timeS === activeSample.timeS;
              return (
                <li key={`${sample.timeS}-${sampleIndex}`}>
                  <button
                    type="button"
                    onClick={() => {
                      stopPlayback();
                      setIndex(nearestFrameIndex(report.frames, sample.timeS));
                    }}
                    className={clsx(
                      "flex min-h-11 w-full items-baseline justify-between gap-3 border-t border-border py-2.5 text-left font-mono text-sm tabular-nums",
                      selected ? "text-primary" : "text-fg",
                    )}
                  >
                    <span>{formatMet(sample.timeS)}</span>
                    <span className={selected ? "text-primary" : "text-muted"}>{formatFixed(sample.altitudeM, 0)} m</span>
                    <span>{formatFixed(sample.speedMps, 1)}</span>
                    <span className={selected ? "text-primary" : "text-muted"}>{formatFixed((sample.rotationAngleRad * 180) / Math.PI, 2)}°</span>
                    {report.terminal ? <span className={selected ? "text-primary" : "text-muted"}>{phaseLabel(sample.sequencePhase)}</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="mt-4 rounded-md border border-border bg-surface p-4">
        <h2 className="text-sm tracking-widest text-muted uppercase">Pass 1 model</h2>
        <ul className="mt-3 grid gap-2 font-mono text-sm text-fg sm:grid-cols-2">
          <li>a = g(r) + T/m + D/m</li>
          <li>g = −μ r / |r|³</li>
          <li>D = ½ ρ v² Cd A</li>
          <li>ρ = ρ0 exp(−h / H)</li>
          <li>ṁ = T / (Isp g0)</li>
          <li>Δv = Isp g0 ln(m0 / mf)</li>
          <li>q̇ = ½ q ⊗ ω</li>
          <li>I ω̇ + ω × Iω = M</li>
          <li>M = r × F</li>
        </ul>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
          <Const k="μ Earth" v="3.986004418×10¹⁴ m³/s²" />
          <Const k="R" v="6,371,000 m" />
          <Const k="ρ0 / H" v="1.225 kg/m³ · 8,500 m" />
          <Const k="Thrust" v="15,000,000 N vac" />
          <Const k="Isp / g0" v="380 s · 9.80665 m/s²" />
          <Const k="Cd / A" v="0.50 · 60 m²" />
          <Const k="Dry mass" v="120,000 kg" />
          <Const k="Propellant" v="1,200,000 kg" />
          <Const k="Step" v="RK4 · 0.02 s" />
          <Const k="Cylinder" v={`${CYLINDER_HEIGHT_M} m · R ${CYLINDER_RADIUS_M} m`} />
          <Const k="Inertia" v="Iyy = ½mR² · Ixx = Izz" />
          <Const k="Torque" v={gimbalDeg === 0 ? "M = 0" : "M = r × F"} />
          <Const k="Offset" v={`${THRUST_AXIAL_OFFSET_M} m aft of CoM`} />
          {body === "mars" ? (
            <>
              <Const k="μ Mars" v="4.282837×10¹³ m³/s²" />
              <Const k="R Mars" v="3,389,500 m" />
              <Const k="ρ0 / H Mars" v="0.020 kg/m³ · 11,100 m" />
              <Const k="Entry" v="125 km · 6,000 m/s · −12°" />
              <Const k="Entry propellant" v="50,000 kg" />
              <Const k="Sound Mars" v="240 m/s" />
              {terminalArmed ? (
                <>
                  <Const k="Flip" v="8 s · thrust off" />
                  <Const k="Landing thrust" v={terminal === "early" ? "100% after 5 km" : "60% after 3 km"} />
                  <Const k="Nominal" v="|vrad| ≤ 2 · vh ≤ 0.5 m/s" />
                  {proportional ? (
                    <>
                      <Const k="Guidance" v="proportional · k = 1" />
                      <Const k="vref / max" v="500 m/s · 0.75" />
                    </>
                  ) : fixedFraction > 0 ? <Const k="Horiz fraction" v={`${formatFixed(fixedFraction, 1)} · anti-vh`} /> : null}
                  {entryTuned ? <Const k="Entry" v={`${formatFixed(entrySpeed, 0)} m/s · ${formatFixed(entryPropellant, 0)} kg`} /> : null}
                </>
              ) : null}
            </>
          ) : null}
        </dl>
        <p className="mt-4 text-sm text-pretty text-muted">
          No wind, no planetary rotation. The vehicle is a uniform cylinder, 50 m tall and 4.5 m in radius, so the inertia tensor scales with the current mass. The nozzle sits half a length aft of the center of mass. A zero gimbal keeps thrust on the body axis, the moment is zero, and Euler’s equation is the torque-free Pass 10 model. A fixed gimbal holds the thrust vector off +Y, maps that direction into M = r × F, and integrates it with the translational step. Set the gimbal and the body rate to 0 to reproduce every translational baseline. J2 is implemented and left off for this
          verification. g0 defines exhaust velocity only. Local gravity is μ/r², about 9.820 m/s² at the surface
          with these constants. Cutoff sets thrust and mass flow to zero. Numerical coast keeps RK4, including
          drag on Earth. Analytic Kepler replaces that coast with a universal-variable step and zero drag. The
          Unity scripts are the same core and do not call PhysX. Leave Analytic Kepler off to reproduce the
          verified burn numbers.
          {terminalArmed
            ? proportional
              ? " Terminal sequence is open-loop and Mars-entry only. Proportional mode sets the landing-burn horizontal share from current horizontal speed and holds that direction for each 0.02 s step. Fixed mode with fraction 0 keeps the Pass 6 burn."
              : fixedFraction > 0
              ? " Terminal sequence is open-loop and Mars-entry only. The landing burn mixes local up with a share opposing horizontal velocity, held constant across each RK4 step. Set Horiz to 0 to restore the Pass 6 vertical burn."
              : " Terminal sequence is open-loop and Mars-entry only. The flip slews thrust from anti-velocity to local up, then holds vertical thrust. Impact altitude is clamped at 0. Leave Terminal off to keep the Pass 1–5 numbers."
            : body === "mars"
            ? " Mars uses the same integrator. Surface gravity is μ/R², about 3.73 m/s². The entry start does not change any Earth run."
            : ""}
        </p>
      </section>

      <section className="mt-4 rounded-md border border-border bg-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm tracking-widest text-muted uppercase">Unity drop-in</h2>
            <p className="mt-1 text-sm text-muted">C# 9 for Unity 2022 LTS / 2023 LTS. Namespaces MarsMission.Math and MarsMission.PhysicsCore.</p>
          </div>
          <a
            href="/pass1/AresCore-Pass1.zip"
            download
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-bg"
          >
            <Download className="size-4" aria-hidden="true" />
            Download scripts
          </a>
        </div>
        <ul className="mt-4 grid gap-2">
          {SOURCE_FILES.map((file) => {
            const name = file.split("/").pop() ?? file;
            return (
              <li key={file} className="min-w-0 border-t border-border pt-2">
                <a className="block min-w-0" href={`/pass1/${file}`} download>
                  <span className="font-mono text-sm text-fg">{name}</span>
                  <span className="mt-0.5 block font-mono text-xs break-all text-muted">{file}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}

function AttitudeTriad({ w, x, y, z }: { w: number; x: number; y: number; z: number }) {
  const bodyX = { x: 1 - 2 * (y * y + z * z), y: 2 * (x * y + z * w) };
  const bodyY = { x: 2 * (x * y - z * w), y: 1 - 2 * (x * x + z * z) };
  const bodyZ = { x: 2 * (x * z + y * w), y: 2 * (y * z - x * w) };
  const s = 42;
  const cx = 56;
  const cy = 56;
  const tip = (axis: { x: number; y: number }) => ({ x: cx + axis.x * s, y: cy - axis.y * s });
  const xTip = tip(bodyX);
  const yTip = tip(bodyY);
  const zTip = tip(bodyZ);
  return (
    <svg viewBox="0 0 112 112" className="size-28 shrink-0" role="img" aria-label="Body axes in the inertial frame">
      <circle cx={cx} cy={cy} r="46" fill="none" stroke="currentColor" className="text-border" />
      <line x1={cx - 46} y1={cy} x2={cx + 46} y2={cy} stroke="currentColor" className="text-border" />
      <line x1={cx} y1={cy - 46} x2={cx} y2={cy + 46} stroke="currentColor" className="text-border" />
      <AxisLine x1={cx} y1={cy} x2={zTip.x} y2={zTip.y} label="Z" color="#8e968f" />
      <AxisLine x1={cx} y1={cy} x2={xTip.x} y2={xTip.y} label="X" color="#e07a3d" />
      <AxisLine x1={cx} y1={cy} x2={yTip.x} y2={yTip.y} label="Y" color="#ebe6dc" />
    </svg>
  );
}

function AxisLine({ x1, y1, x2, y2, label, color }: { x1: number; y1: number; x2: number; y2: number; label: string; color: string }) {
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" />
      <circle cx={x2} cy={y2} r="2.5" fill={color} />
      <text x={x2 + (x2 >= x1 ? 4 : -10)} y={y2 + (y2 >= y1 ? 10 : -4)} fill={color} fontSize="9" fontFamily="IBM Plex Mono, ui-monospace, monospace">
        {label}
      </text>
    </g>
  );
}

function formatAxis(value: number): string {
  if (!Number.isFinite(value)) return "inf";
  return formatFixed(value, 0);
}

function phaseLabel(phase: string | undefined): string {
  if (phase === "LandingBurn") return "Burn";
  if (phase === "Complete") return "Done";
  return phase ?? "";
}

function NumberField({
  label,
  value,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    setDraft(String(value));
  }, [value]);
  return (
    <label className="min-w-0 sm:w-36">
      <span className="mb-2 block text-xs tracking-widest text-muted uppercase">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        disabled={disabled}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          const next = Number(draft);
          if (Number.isFinite(next)) onCommit(next);
          setDraft(String(value));
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") (event.currentTarget as HTMLInputElement).blur();
        }}
        className={clsx(
          "h-11 w-full rounded-md border border-border bg-surface px-2 font-mono text-sm text-fg tabular-nums",
          disabled && "cursor-not-allowed opacity-40",
        )}
      />
    </label>
  );
}

function ModeButton({
  active,
  onClick,
  children,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "h-11 px-3 text-sm",
        disabled && "cursor-not-allowed opacity-40",
        active ? "bg-primary text-bg" : "bg-surface text-fg",
      )}
    >
      {children}
    </button>
  );
}

function DeltaRow({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-mono text-base tabular-nums text-fg">
        {value}
        <span className="ml-1.5 text-xs text-muted">{unit}</span>
      </dd>
    </div>
  );
}

function Const({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-t border-border pt-2">
      <dt className="text-xs tracking-widest text-muted uppercase">{k}</dt>
      <dd className="mt-1 font-mono text-sm tabular-nums text-fg">{v}</dd>
    </div>
  );
}
