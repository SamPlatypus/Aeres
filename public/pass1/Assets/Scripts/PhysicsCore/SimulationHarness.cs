using System;
using System.Collections.Generic;
using System.Globalization;
using MarsMission.Math;

namespace MarsMission.PhysicsCore
{
    using Math = System.Math;
    /// <summary>
    /// One row of the 5-second verification log. SI units throughout.
    /// </summary>
    public struct TelemetrySample
    {
        public double TimeS;
        public double AltitudeM;
        public double SpeedMps;
        public double VerticalMps;
        public double AccelMps2;
        public double PropellantKg;
        public double TotalMassKg;
        public double ThrustN;
        public double DynamicPressurePa;
        public double DensityKgM3;
        public double DragN;
        public double GravityMps2;
        public double HorizontalMps;
        public double FlightPathDeg;
        public double ThrustPitchDeg;
        public double RadiusM;
        public double EngineState;
        public double TimeSinceCutoffS;
        public double SpecificEnergyM2S2;
        /// <summary>numerical or analytic. Empty on the verified Pass 1–3 log path.</summary>
        public string PropagationMode;
        public double SemiMajorAxisM;
        public double Eccentricity;
        public double TimeSinceElementsS;
        public string Body;
        public double Mach;
        /// <summary>Coast, Flip, LandingBurn, or Complete. Empty on Pass 1–5 samples.</summary>
        public string SequencePhase;
        public double ThrustPitchFromVerticalDeg;
        public double RadialMps;
        public string ImpactFlag;
        public double ImpactKineticEnergyJ;
        public double ImpactSpeedMps;
        public double ImpactVerticalMps;
        public double ImpactHorizontalMps;
        public double PeakSpeedMps;
        /// <summary>Landing horizontal fraction. 0 keeps the Pass 6 log line.</summary>
        public double HorizontalFraction;
        /// <summary>Proportional when that law commanded the sample. Empty on Pass 1–7.</summary>
        public string GuidanceMode;
        public double QuaternionW;
        public double QuaternionX;
        public double QuaternionY;
        public double QuaternionZ;
        public double AngularVelocityRadS;
        public double OmegaBodyX;
        public double OmegaBodyY;
        public double OmegaBodyZ;
        public double AngularMomentumKgM2S;
        public double AngularMomentumInertialX;
        public double AngularMomentumInertialY;
        public double AngularMomentumInertialZ;
        public double InertiaIxx;
        public double InertiaIyy;
        public double InertiaIzz;
        public double RotationAngleRad;
        public double GimbalRad;
        public double MomentX;
        public double MomentY;
        public double MomentZ;
        public double AlphaX;
        public double AlphaY;
        public double AlphaZ;
        public double AngleOfAttackRad;
        public double AeroMomentZ;
        public double PitchAngleRad;
        public bool ControllerEnabled;

        public string ToLogLine()
        {
            CultureInfo c = CultureInfo.InvariantCulture;
            string line = string.Format(
                c,
                "t={0:F3} s | alt={1:F3} m | v={2:F4} m/s | vy={3:F4} m/s | a={4:F6} m/s^2 | mp={5:F3} kg | m={6:F3} kg | T={7:F1} N | Q={8:F3} Pa | rho={9:F8} kg/m^3 | D={10:F3} N | g={11:F6} m/s^2 | vh={12:F4} m/s | gamma={13:F4} deg | pitch={14:F4} deg | r={15:F3} m | eng={16:0} | tco={17:F3} s | eps={18:E6} m^2/s^2 | body={19} | M={20:F4}",
                TimeS,
                AltitudeM,
                SpeedMps,
                VerticalMps,
                AccelMps2,
                PropellantKg,
                TotalMassKg,
                ThrustN,
                DynamicPressurePa,
                DensityKgM3,
                DragN,
                GravityMps2,
                HorizontalMps,
                FlightPathDeg,
                ThrustPitchDeg,
                RadiusM,
                EngineState,
                TimeSinceCutoffS,
                SpecificEnergyM2S2,
                string.IsNullOrEmpty(Body) ? "Earth" : Body,
                Mach);
            if (string.IsNullOrEmpty(SequencePhase)) return line + AttitudeSuffix();
            line += string.Format(c, " | phase={0} | pitchv={1:F4} deg | vrad={2:F4}", SequencePhase, ThrustPitchFromVerticalDeg, RadialMps);
            if (!string.IsNullOrEmpty(ImpactFlag))
            {
                line += string.Format(
                    c,
                    " | impact={0} | ke={1:E6} J | vimp={2:F4} | vrad_imp={3:F4} | vhimp={4:F4} | vpeak={5:F4}",
                    ImpactFlag,
                    ImpactKineticEnergyJ,
                    ImpactSpeedMps,
                    ImpactVerticalMps,
                    ImpactHorizontalMps,
                    PeakSpeedMps);
            }
            if (HorizontalFraction > 0d && GuidanceMode != "Proportional" && (SequencePhase == "LandingBurn" || !string.IsNullOrEmpty(ImpactFlag)))
            {
                line += string.Format(c, " | hf={0:F4} | herr={1:F4} deg", HorizontalFraction, ThrustPitchFromVerticalDeg);
            }
            if (GuidanceMode == "Proportional" && (SequencePhase == "LandingBurn" || !string.IsNullOrEmpty(ImpactFlag)))
            {
                line += string.Format(c, " | guide=Proportional | hf={0:F4} | herr={1:F4} deg", HorizontalFraction, ThrustPitchFromVerticalDeg);
            }
            return line + AttitudeSuffix();
        }

        private string AttitudeSuffix()
        {
            return string.Format(
                CultureInfo.InvariantCulture,
                " | qw={0:F9} | qx={1:F9} | qy={2:F9} | qz={3:F9} | wmag={4:F6} rad/s | theta={5:F9} rad | wx={6:F9} | wy={7:F9} | wz={8:F9} | L={9:F6} | Lix={10:F6} | Liy={11:F6} | Liz={12:F6} | Ixx={13:F3} | Iyy={14:F3} | Izz={15:F3} | gimbal={16:F9} rad | Mx={17:F3} | My={18:F3} | Mz={19:F3} | ax={20:F9} | ay={21:F9} | az={22:F9} | aoa={23:F9} rad | Maero={24:F3} | ctrl={25:0} | perr={26:F9} rad",
                QuaternionW,
                QuaternionX,
                QuaternionY,
                QuaternionZ,
                AngularVelocityRadS,
                RotationAngleRad,
                OmegaBodyX,
                OmegaBodyY,
                OmegaBodyZ,
                AngularMomentumKgM2S,
                AngularMomentumInertialX,
                AngularMomentumInertialY,
                AngularMomentumInertialZ,
                InertiaIxx,
                InertiaIyy,
                InertiaIzz,
                GimbalRad,
                MomentX,
                MomentY,
                MomentZ,
                AlphaX,
                AlphaY,
                AlphaZ,
                AngleOfAttackRad,
                AeroMomentZ,
                ControllerEnabled ? 1 : 0,
                PitchAngleRad);
        }
    }

    public sealed class SimulationReport
    {
        public bool DisableGravityAndAtmosphere;
        public int Substeps;
        public List<TelemetrySample> Samples = new List<TelemetrySample>();
        public List<string> LogLines = new List<string>();
        public double InitialMassKg;
        public double FinalMassKg;
        public Vector3d FinalPosition;
        public Vector3d FinalVelocity;
        public double IdealDeltaVMps;
        public double AchievedDeltaVMps;
        public double ThrustIntegratedDeltaVMps;
        public double DifferenceMps;
        public double RelativeError;
        public bool VacuumCheckPassed;
        /// <summary>True only when an analytic Kepler arc replaced RK4 after cutoff.</summary>
        public bool AnalyticKepler;
        public KeplerCapture KeplerCapture;
        public bool TerminalSequenceArmed;
        public string ImpactFlag;
        public double ImpactKineticEnergyJ;
        public double ImpactSpeedMps;
        public double ImpactVerticalMps;
        public double ImpactHorizontalMps;
        public double PeakSpeedMps;
        public double TriggerTimeS;
        public string GuidanceMode;

        public string LogText
        {
            get { return string.Join("\n", LogLines.ToArray()); }
        }
    }

    /// <summary>
    /// Headless Pass 1 verification. Sea level, position (0, R, 0), 100% +Y thrust for 90 s.
    /// Logs every 5 s through <see cref="SimLog"/> (UnityEngine.Debug.Log inside the player).
    /// </summary>
    public static class SimulationHarness
    {
        public const double BurnDurationS = 90d;
        public const double LogIntervalS = 5d;
        public const double VacuumAgreementLimit = 0.001d;

        public static SimulationReport RunVerticalBurn(bool disableGravityAndAtmosphere)
        {
            return RunVerticalBurn(disableGravityAndAtmosphere, 1);
        }

        public static SimulationReport RunVerticalBurn(bool disableGravityAndAtmosphere, int substeps)
        {
            return RunVerticalBurn(disableGravityAndAtmosphere, substeps, Vector3d.Zero);
        }

        public static SimulationReport RunVerticalBurn(bool disableGravityAndAtmosphere, int substeps, Vector3d angularVelocityBody)
        {
            return RunVerticalBurn(disableGravityAndAtmosphere, substeps, angularVelocityBody, 0d);
        }

        public static SimulationReport RunVerticalBurn(bool disableGravityAndAtmosphere, int substeps, Vector3d angularVelocityBody, double gimbalRad)
        {
            return RunVerticalBurn(disableGravityAndAtmosphere, substeps, angularVelocityBody, gimbalRad, false, QuaternionD.Identity);
        }

        public static SimulationReport RunVerticalBurn(
            bool disableGravityAndAtmosphere,
            int substeps,
            Vector3d angularVelocityBody,
            double gimbalRad,
            bool controllerEnabled,
            QuaternionD initialAttitude)
        {
            if (substeps < 1) throw new ArgumentOutOfRangeException("substeps");

            PlanetaryEnvironment env = PlanetaryEnvironment.CreateEarth(false);
            env.GravityEnabled = !disableGravityAndAtmosphere;
            env.AtmosphereEnabled = !disableGravityAndAtmosphere;
            PropulsionModel propulsion = PropulsionModel.CreateDefaultStage();
            IntegratorRK4 integrator = new IntegratorRK4(env, propulsion);
            VehicleState state = VehicleState.CreateSeaLevel(env);
            state.AngularVelocityBody = angularVelocityBody;
            state.GimbalRad = gimbalRad;
            state.ControllerEnabled = controllerEnabled;
            state.Attitude = initialAttitude;
            state.InitialAttitude = initialAttitude;
            Vector3d initialVelocity = state.Velocity;

            int steps = (int)Math.Round(BurnDurationS * IntegratorRK4.StepHz);
            int logEvery = (int)Math.Round(LogIntervalS * IntegratorRK4.StepHz);

            SimulationReport report = new SimulationReport();
            report.DisableGravityAndAtmosphere = disableGravityAndAtmosphere;
            report.Substeps = substeps;
            report.InitialMassKg = state.TotalMassKg;

            string header = disableGravityAndAtmosphere
                ? "ARES CORE vertical burn | mode=VACUUM | gravity=off | atmosphere=off | thrust=+Y | throttle=1 | dt=0.02 s"
                : "ARES CORE vertical burn | mode=EARTH | gravity=point-mass | atmosphere=exponential | thrust=+Y | throttle=1 | dt=0.02 s";
            Write(report, header);

            for (int n = 0; n <= steps; n++)
            {
                if (n % logEvery == 0)
                {
                    double timeS = n / (double)IntegratorRK4.StepHz;
                    TelemetrySample sample = Capture(integrator, state, timeS, 1d, 0d, Vector3d.Up);
                    report.Samples.Add(sample);
                    Write(report, sample.ToLogLine());
                }

                if (n == steps) break;
                integrator.Step(state, 1d / IntegratorRK4.StepHz, substeps, 1d);
            }

            report.FinalMassKg = state.TotalMassKg;
            report.FinalPosition = state.Position;
            report.FinalVelocity = state.Velocity;
            report.IdealDeltaVMps = propulsion.IdealDeltaVMps(report.InitialMassKg, report.FinalMassKg);
            report.AchievedDeltaVMps = (state.Velocity - initialVelocity).Magnitude;
            report.ThrustIntegratedDeltaVMps = state.ThrustIntegratedDeltaVMps;
            report.DifferenceMps = report.IdealDeltaVMps - report.AchievedDeltaVMps;
            report.RelativeError = report.IdealDeltaVMps > 0d
                ? Math.Abs(report.AchievedDeltaVMps - report.IdealDeltaVMps) / report.IdealDeltaVMps
                : 0d;
            report.VacuumCheckPassed = !disableGravityAndAtmosphere || report.RelativeError < VacuumAgreementLimit;

            CultureInfo c = CultureInfo.InvariantCulture;
            Write(report, string.Format(c, "ideal_dv_m_s={0:F6}", report.IdealDeltaVMps));
            Write(report, string.Format(c, "achieved_dv_m_s={0:F6}", report.AchievedDeltaVMps));
            Write(report, string.Format(c, "thrust_integrated_dv_m_s={0:F6}", report.ThrustIntegratedDeltaVMps));
            Write(report, string.Format(c, "difference_ideal_minus_achieved_m_s={0:F6}", report.DifferenceMps));
            Write(report, string.Format(c, "relative_error={0:F8} %", report.RelativeError * 100d));
            if (disableGravityAndAtmosphere)
            {
                Write(report, string.Format(
                    c,
                    "verdict={0} vacuum agreement limit=0.10000000 %",
                    report.VacuumCheckPassed ? "PASS" : "FAIL"));
            }
            else
            {
                Write(report, "verdict=GRAVITY_AND_DRAG_LOSS vacuum agreement not applicable");
            }

            return report;
        }

        /// <summary>
        /// Pass 2. Same 90 s burn with an open-loop thrust direction.
        /// A program that is still +Y at burnout delegates to <see cref="RunVerticalBurn"/>.
        /// </summary>
        public static SimulationReport RunPitchedBurn(bool disableGravityAndAtmosphere, int substeps, PitchProgram program)
        {
            if (program == null) throw new ArgumentNullException("program");
            if (program.PitchAngleDeg(BurnDurationS) == 0d)
            {
                return RunVerticalBurn(disableGravityAndAtmosphere, substeps);
            }

            if (substeps < 1) throw new ArgumentOutOfRangeException("substeps");

            PlanetaryEnvironment env = PlanetaryEnvironment.CreateEarth(false);
            env.GravityEnabled = !disableGravityAndAtmosphere;
            env.AtmosphereEnabled = !disableGravityAndAtmosphere;
            PropulsionModel propulsion = PropulsionModel.CreateDefaultStage();
            IntegratorRK4 integrator = new IntegratorRK4(env, propulsion);
            VehicleState state = VehicleState.CreateSeaLevel(env);
            state.ControllerEnabled = false;
            Vector3d initialVelocity = state.Velocity;

            int steps = (int)Math.Round(BurnDurationS * IntegratorRK4.StepHz);
            int logEvery = (int)Math.Round(LogIntervalS * IntegratorRK4.StepHz);

            SimulationReport report = new SimulationReport();
            report.DisableGravityAndAtmosphere = disableGravityAndAtmosphere;
            report.Substeps = substeps;
            report.InitialMassKg = state.TotalMassKg;

            string mode = disableGravityAndAtmosphere ? "VACUUM" : "EARTH";
            string pitchText = program.HoldPitch
                ? string.Format(CultureInfo.InvariantCulture, "hold_pitch={0} deg", program.HoldPitchDeg)
                : string.Format(CultureInfo.InvariantCulture, "pitch_rate={0} deg/s", program.PitchRateDegPerS);
            Write(
                report,
                string.Format(
                    CultureInfo.InvariantCulture,
                    "ARES CORE pitch program | mode={0} | t_vertical={1} s | {2} | plane=XY | throttle=1 | dt=0.02 s",
                    mode,
                    program.TVerticalS,
                    pitchText));

            for (int n = 0; n <= steps; n++)
            {
                double timeS = n / (double)IntegratorRK4.StepHz;
                double pitchDeg = program.PitchAngleDeg(timeS);
                Vector3d direction = program.ThrustDirection(timeS);
                if (n % logEvery == 0)
                {
                    TelemetrySample sample = Capture(integrator, state, timeS, 1d, pitchDeg, direction);
                    report.Samples.Add(sample);
                    Write(report, sample.ToLogLine());
                }

                if (n == steps) break;
                integrator.Step(state, 1d / IntegratorRK4.StepHz, substeps, 1d, direction);
            }

            report.FinalMassKg = state.TotalMassKg;
            report.FinalPosition = state.Position;
            report.FinalVelocity = state.Velocity;
            report.IdealDeltaVMps = propulsion.IdealDeltaVMps(report.InitialMassKg, report.FinalMassKg);
            report.AchievedDeltaVMps = (state.Velocity - initialVelocity).Magnitude;
            report.ThrustIntegratedDeltaVMps = state.ThrustIntegratedDeltaVMps;
            report.DifferenceMps = report.IdealDeltaVMps - report.AchievedDeltaVMps;
            report.RelativeError = report.IdealDeltaVMps > 0d
                ? Math.Abs(report.AchievedDeltaVMps - report.IdealDeltaVMps) / report.IdealDeltaVMps
                : 0d;
            report.VacuumCheckPassed = false;

            CultureInfo c = CultureInfo.InvariantCulture;
            Write(report, string.Format(c, "ideal_dv_m_s={0:F6}", report.IdealDeltaVMps));
            Write(report, string.Format(c, "achieved_dv_m_s={0:F6}", report.AchievedDeltaVMps));
            Write(report, string.Format(c, "thrust_integrated_dv_m_s={0:F6}", report.ThrustIntegratedDeltaVMps));
            Write(report, string.Format(c, "difference_ideal_minus_achieved_m_s={0:F6}", report.DifferenceMps));
            Write(report, string.Format(c, "relative_error={0:F8} %", report.RelativeError * 100d));
            Write(report, "verdict=OPEN_LOOP_PITCH");
            return report;
        }

        /// <summary>
        /// Pass 3. Optional cutoff, then ballistic coast through endTimeS.
        /// A cutoff that cannot engage on a 90 s run delegates to the verified burn.
        /// </summary>
        public static SimulationReport RunCoastBurn(
            bool disableGravityAndAtmosphere,
            int substeps,
            PitchProgram program,
            CutoffCommand cutoff,
            double endTimeS)
        {
            if (program == null) throw new ArgumentNullException("program");
            if (cutoff == null) throw new ArgumentNullException("cutoff");
            if (substeps < 1) throw new ArgumentOutOfRangeException("substeps");

            double stepCount = endTimeS * IntegratorRK4.StepHz;
            int steps = (int)Math.Round(stepCount);
            if (steps < 1 || Math.Abs(stepCount - steps) > 1e-6d) throw new ArgumentOutOfRangeException("endTimeS");

            bool inactive = !cutoff.HasPropellantCutoff && (!cutoff.HasTimeCutoff || cutoff.TCutoffS > endTimeS);
            if (inactive && endTimeS == BurnDurationS)
            {
                if (program.PitchAngleDeg(BurnDurationS) == 0d)
                {
                    return RunVerticalBurn(disableGravityAndAtmosphere, substeps);
                }

                return RunPitchedBurn(disableGravityAndAtmosphere, substeps, program);
            }

            PlanetaryEnvironment env = PlanetaryEnvironment.CreateEarth(false);
            env.GravityEnabled = !disableGravityAndAtmosphere;
            env.AtmosphereEnabled = !disableGravityAndAtmosphere;
            PropulsionModel propulsion = PropulsionModel.CreateDefaultStage();
            IntegratorRK4 integrator = new IntegratorRK4(env, propulsion);
            VehicleState state = VehicleState.CreateSeaLevel(env);
            state.ControllerEnabled = false;
            Vector3d initialVelocity = state.Velocity;

            int logEvery = (int)Math.Round(LogIntervalS * IntegratorRK4.StepHz);
            SimulationReport report = new SimulationReport();
            report.DisableGravityAndAtmosphere = disableGravityAndAtmosphere;
            report.Substeps = substeps;
            report.InitialMassKg = state.TotalMassKg;

            string mode = disableGravityAndAtmosphere ? "VACUUM" : "EARTH";
            string pitchText = program.PitchAngleDeg(endTimeS) == 0d
                ? "pitch=vertical"
                : program.HoldPitch
                    ? string.Format(CultureInfo.InvariantCulture, "hold_pitch={0} deg after {1} s", program.HoldPitchDeg, program.TVerticalS)
                    : string.Format(CultureInfo.InvariantCulture, "pitch_rate={0} deg/s after {1} s", program.PitchRateDegPerS, program.TVerticalS);
            string cutoffText = cutoff.HasTimeCutoff
                ? string.Format(CultureInfo.InvariantCulture, "t_cutoff={0} s", cutoff.TCutoffS)
                : "t_cutoff=never";
            string propText = cutoff.HasPropellantCutoff
                ? string.Format(CultureInfo.InvariantCulture, "mp_cutoff={0} kg", cutoff.PropellantRemainingKg)
                : "mp_cutoff=none";
            Write(
                report,
                string.Format(
                    CultureInfo.InvariantCulture,
                    "ARES CORE cutoff coast | mode={0} | {1} | {2} | end={3} s | {4} | dt=0.02 s",
                    mode,
                    cutoffText,
                    propText,
                    endTimeS,
                    pitchText));

            double? cutoffAt = null;
            for (int n = 0; n <= steps; n++)
            {
                double timeS = n / (double)IntegratorRK4.StepHz;
                double pitchDeg = program.PitchAngleDeg(timeS);
                Vector3d direction = program.ThrustDirection(timeS);
                double throttle = cutoff.Throttle(timeS, state.PropellantMassKg);
                if (throttle == 0d) NoteCutoff(ref cutoffAt, timeS);
                double since = cutoffAt.HasValue && timeS > cutoffAt.Value ? timeS - cutoffAt.Value : 0d;
                if (n % logEvery == 0)
                {
                    TelemetrySample sample = Capture(integrator, state, timeS, throttle, pitchDeg, direction, since);
                    report.Samples.Add(sample);
                    Write(report, sample.ToLogLine());
                }

                if (n == steps) break;
                StepCommanded(integrator, state, timeS, 1d / IntegratorRK4.StepHz, substeps, cutoff, direction, ref cutoffAt);
            }

            report.FinalMassKg = state.TotalMassKg;
            report.FinalPosition = state.Position;
            report.FinalVelocity = state.Velocity;
            report.IdealDeltaVMps = propulsion.IdealDeltaVMps(report.InitialMassKg, report.FinalMassKg);
            report.AchievedDeltaVMps = (state.Velocity - initialVelocity).Magnitude;
            report.ThrustIntegratedDeltaVMps = state.ThrustIntegratedDeltaVMps;
            report.DifferenceMps = report.IdealDeltaVMps - report.AchievedDeltaVMps;
            report.RelativeError = report.IdealDeltaVMps > 0d
                ? Math.Abs(report.AchievedDeltaVMps - report.IdealDeltaVMps) / report.IdealDeltaVMps
                : 0d;
            report.VacuumCheckPassed = false;

            CultureInfo c = CultureInfo.InvariantCulture;
            Write(report, string.Format(c, "ideal_dv_m_s={0:F6}", report.IdealDeltaVMps));
            Write(report, string.Format(c, "achieved_dv_m_s={0:F6}", report.AchievedDeltaVMps));
            Write(report, string.Format(c, "thrust_integrated_dv_m_s={0:F6}", report.ThrustIntegratedDeltaVMps));
            Write(report, string.Format(c, "difference_ideal_minus_achieved_m_s={0:F6}", report.DifferenceMps));
            Write(report, string.Format(c, "relative_error={0:F8} %", report.RelativeError * 100d));
            Write(report, cutoffAt.HasValue ? "verdict=CUTOFF_AND_COAST" : "verdict=CONTINUOUS_THRUST");
            return report;
        }

        /// <summary>
        /// Pass 4. Powered flight stays on the Pass 3 RK4 path.
        /// After thrust is zero, position and velocity come from <see cref="KeplerPropagator"/>.
        /// Drag is not applied on that arc. A cutoff that never engages delegates to <see cref="RunCoastBurn"/>.
        /// </summary>
        public static SimulationReport RunKeplerCoast(
            bool disableGravityAndAtmosphere,
            int substeps,
            PitchProgram program,
            CutoffCommand cutoff,
            double endTimeS)
        {
            if (program == null) throw new ArgumentNullException("program");
            if (cutoff == null) throw new ArgumentNullException("cutoff");

            bool inactive = !cutoff.HasPropellantCutoff && (!cutoff.HasTimeCutoff || cutoff.TCutoffS > endTimeS);
            if (inactive) return RunCoastBurn(disableGravityAndAtmosphere, substeps, program, cutoff, endTimeS);
            if (substeps < 1) throw new ArgumentOutOfRangeException("substeps");

            double stepCount = endTimeS * IntegratorRK4.StepHz;
            int steps = (int)Math.Round(stepCount);
            if (steps < 1 || Math.Abs(stepCount - steps) > 1e-6d) throw new ArgumentOutOfRangeException("endTimeS");

            PlanetaryEnvironment env = PlanetaryEnvironment.CreateEarth(false);
            env.GravityEnabled = !disableGravityAndAtmosphere;
            env.AtmosphereEnabled = !disableGravityAndAtmosphere;
            PropulsionModel propulsion = PropulsionModel.CreateDefaultStage();
            IntegratorRK4 integrator = new IntegratorRK4(env, propulsion);
            VehicleState state = VehicleState.CreateSeaLevel(env);
            state.ControllerEnabled = false;
            Vector3d initialVelocity = state.Velocity;
            double mu = env.GravityEnabled ? env.MuM3S2 : 0d;

            int logEvery = (int)Math.Round(LogIntervalS * IntegratorRK4.StepHz);
            SimulationReport report = new SimulationReport();
            report.DisableGravityAndAtmosphere = disableGravityAndAtmosphere;
            report.Substeps = substeps;
            report.InitialMassKg = state.TotalMassKg;

            string mode = disableGravityAndAtmosphere ? "VACUUM" : "EARTH";
            string pitchText = program.PitchAngleDeg(endTimeS) == 0d
                ? "pitch=vertical"
                : program.HoldPitch
                    ? string.Format(CultureInfo.InvariantCulture, "hold_pitch={0} deg after {1} s", program.HoldPitchDeg, program.TVerticalS)
                    : string.Format(CultureInfo.InvariantCulture, "pitch_rate={0} deg/s after {1} s", program.PitchRateDegPerS, program.TVerticalS);
            string cutoffText = cutoff.HasTimeCutoff
                ? string.Format(CultureInfo.InvariantCulture, "t_cutoff={0} s", cutoff.TCutoffS)
                : "t_cutoff=never";
            Write(
                report,
                string.Format(
                    CultureInfo.InvariantCulture,
                    "ARES CORE analytic kepler | mode={0} | {1} | end={2} s | {3} | drag=off | dt=0.02 s",
                    mode,
                    cutoffText,
                    endTimeS,
                    pitchText));

            double? cutoffAt = null;
            KeplerCapture capture = null;
            for (int n = 0; n <= steps; n++)
            {
                double timeS = n / (double)IntegratorRK4.StepHz;
                if (capture != null && timeS > capture.TimeS)
                {
                    KeplerState propagated = KeplerPropagator.Propagate(
                        capture.Position,
                        capture.Velocity,
                        capture.MuM3S2,
                        timeS - capture.TimeS);
                    state.Position = propagated.Position;
                    state.Velocity = propagated.Velocity;
                    state.PropellantMassKg = capture.PropellantKg;
                    state.TotalMassKg = capture.TotalMassKg;
                    state.ThrustIntegratedDeltaVMps = capture.ThrustIntegratedDeltaVMps;
                }

                double pitchDeg = program.PitchAngleDeg(timeS);
                Vector3d direction = program.ThrustDirection(timeS);
                double throttle = cutoff.Throttle(timeS, state.PropellantMassKg);
                if (capture == null && throttle == 0d)
                {
                    KeplerElements elements = KeplerPropagator.Elements(state.Position, state.Velocity, mu);
                    capture = new KeplerCapture
                    {
                        TimeS = timeS,
                        Position = state.Position,
                        Velocity = state.Velocity,
                        MuM3S2 = mu,
                        PropellantKg = state.PropellantMassKg,
                        TotalMassKg = state.TotalMassKg,
                        ThrustIntegratedDeltaVMps = state.ThrustIntegratedDeltaVMps,
                        Elements = elements
                    };
                    NoteCutoff(ref cutoffAt, timeS);
                }
                else if (throttle == 0d)
                {
                    NoteCutoff(ref cutoffAt, timeS);
                }

                double since = cutoffAt.HasValue && timeS > cutoffAt.Value ? timeS - cutoffAt.Value : 0d;
                bool onAnalyticArc = capture != null && timeS > capture.TimeS;

                if (n % logEvery == 0)
                {
                    TelemetrySample sample;
                    if (onAnalyticArc)
                    {
                        sample = CaptureAnalytic(env, state, timeS, pitchDeg, since, mu, capture, timeS - capture.TimeS);
                    }
                    else
                    {
                        sample = Capture(integrator, state, timeS, throttle, pitchDeg, direction, since);
                        sample.PropagationMode = "numerical";
                        if (capture != null && timeS == capture.TimeS)
                        {
                            sample.SemiMajorAxisM = capture.Elements.SemiMajorAxisM;
                            sample.Eccentricity = capture.Elements.Eccentricity;
                            sample.TimeSinceElementsS = 0d;
                        }
                    }

                    report.Samples.Add(sample);
                    Write(report, sample.ToLogLine() + KeplerSuffix(sample));
                }

                if (n == steps) break;
                if (capture != null)
                {
                    AdvanceAttitude(state, 1d / IntegratorRK4.StepHz, substeps);
                    continue;
                }
                StepCommanded(integrator, state, timeS, 1d / IntegratorRK4.StepHz, substeps, cutoff, direction, ref cutoffAt);
            }

            report.FinalMassKg = state.TotalMassKg;
            report.FinalPosition = state.Position;
            report.FinalVelocity = state.Velocity;
            report.IdealDeltaVMps = propulsion.IdealDeltaVMps(report.InitialMassKg, report.FinalMassKg);
            report.AchievedDeltaVMps = (state.Velocity - initialVelocity).Magnitude;
            report.ThrustIntegratedDeltaVMps = state.ThrustIntegratedDeltaVMps;
            report.DifferenceMps = report.IdealDeltaVMps - report.AchievedDeltaVMps;
            report.RelativeError = report.IdealDeltaVMps > 0d
                ? Math.Abs(report.AchievedDeltaVMps - report.IdealDeltaVMps) / report.IdealDeltaVMps
                : 0d;
            report.VacuumCheckPassed = false;
            report.AnalyticKepler = capture != null;
            report.KeplerCapture = capture;

            CultureInfo c = CultureInfo.InvariantCulture;
            Write(report, string.Format(c, "ideal_dv_m_s={0:F6}", report.IdealDeltaVMps));
            Write(report, string.Format(c, "achieved_dv_m_s={0:F6}", report.AchievedDeltaVMps));
            Write(report, string.Format(c, "thrust_integrated_dv_m_s={0:F6}", report.ThrustIntegratedDeltaVMps));
            Write(report, string.Format(c, "difference_ideal_minus_achieved_m_s={0:F6}", report.DifferenceMps));
            Write(report, string.Format(c, "relative_error={0:F8} %", report.RelativeError * 100d));
            Write(report, capture != null ? "verdict=ANALYTIC_KEPLER" : "verdict=CONTINUOUS_THRUST");
            return report;
        }

        private static string KeplerSuffix(TelemetrySample sample)
        {
            CultureInfo c = CultureInfo.InvariantCulture;
            string axis = double.IsInfinity(sample.SemiMajorAxisM)
                ? "inf"
                : sample.SemiMajorAxisM.ToString("F3", c);
            string mode = string.IsNullOrEmpty(sample.PropagationMode) ? "numerical" : sample.PropagationMode;
            return string.Format(
                c,
                " | prop={0} | a={1} m | e={2:F8} | tke={3:F3} s",
                mode,
                axis,
                sample.Eccentricity,
                sample.TimeSinceElementsS);
        }

        private static TelemetrySample CaptureAnalytic(
            PlanetaryEnvironment env,
            VehicleState state,
            double timeS,
            double thrustPitchDeg,
            double timeSinceCutoffS,
            double mu,
            KeplerCapture capture,
            double timeSinceElementsS)
        {
            double radius = state.Position.Magnitude;
            double gravity = mu > 0d && radius > 0d ? mu / (radius * radius) : 0d;
            TelemetrySample sample = new TelemetrySample
            {
                TimeS = timeS,
                AltitudeM = radius - env.EquatorialRadiusM,
                SpeedMps = state.Velocity.Magnitude,
                VerticalMps = state.Velocity.Y,
                AccelMps2 = gravity,
                PropellantKg = capture.PropellantKg,
                TotalMassKg = capture.TotalMassKg,
                ThrustN = 0d,
                DynamicPressurePa = 0d,
                DensityKgM3 = 0d,
                DragN = 0d,
                GravityMps2 = gravity,
                HorizontalMps = PitchProgram.HorizontalSpeedMps(state.Position, state.Velocity),
                FlightPathDeg = PitchProgram.FlightPathAngleDeg(state.Position, state.Velocity),
                ThrustPitchDeg = thrustPitchDeg,
                RadiusM = radius,
                EngineState = 0d,
                TimeSinceCutoffS = timeSinceCutoffS,
                SpecificEnergyM2S2 = CutoffCommand.SpecificMechanicalEnergy(env, state.Position, state.Velocity),
                PropagationMode = "analytic",
                SemiMajorAxisM = capture.Elements.SemiMajorAxisM,
                Eccentricity = capture.Elements.Eccentricity,
                TimeSinceElementsS = timeSinceElementsS,
                Body = env.Name,
                Mach = env.SpeedOfSoundMps > 0d ? state.Velocity.Magnitude / env.SpeedOfSoundMps : 0d
            };
            StampAttitude(ref sample, state);
            return sample;
        }

        private static void NoteCutoff(ref double? cutoffAt, double timeS)
        {
            if (!cutoffAt.HasValue || timeS < cutoffAt.Value) cutoffAt = timeS;
        }

        private static void StepCommanded(
            IntegratorRK4 integrator,
            VehicleState state,
            double timeS,
            double dt,
            int substeps,
            CutoffCommand cutoff,
            Vector3d direction,
            ref double? cutoffAt)
        {
            double cursor = timeS;
            double left = dt;
            for (int guard = 0; guard < 4 && left > 1e-12d; guard++)
            {
                double throttle = cutoff.Throttle(cursor, state.PropellantMassKg);
                if (!(throttle > 0d))
                {
                    NoteCutoff(ref cutoffAt, cursor);
                    integrator.Step(state, left, substeps, 0d, direction);
                    return;
                }

                double segment = left;
                bool snap = false;
                if (cutoff.HasTimeCutoff && cursor < cutoff.TCutoffS && cursor + segment > cutoff.TCutoffS)
                {
                    segment = cutoff.TCutoffS - cursor;
                }

                if (cutoff.HasPropellantCutoff)
                {
                    double threshold = cutoff.PropellantRemainingKg;
                    double burnable = state.PropellantMassKg - threshold;
                    double mdot = integrator.Propulsion.MassFlowKgS(1d, state.PropellantMassKg);
                    if (!(burnable > 0d) || !(mdot > 0d))
                    {
                        NoteCutoff(ref cutoffAt, cursor);
                        integrator.Step(state, left, substeps, 0d, direction);
                        return;
                    }

                    double dtFuel = burnable / mdot;
                    if (dtFuel < segment)
                    {
                        segment = dtFuel;
                        snap = true;
                    }
                }

                if (!(segment > 0d)) return;
                if (segment >= left - 1e-15d && !snap)
                {
                    integrator.Step(state, left, substeps, 1d, direction);
                    return;
                }

                integrator.Step(state, segment, substeps, 1d, direction);
                cursor += segment;
                left -= segment;
                if (snap)
                {
                    state.PropellantMassKg = cutoff.PropellantRemainingKg;
                    if (state.PropellantMassKg < 0d) state.PropellantMassKg = 0d;
                    state.TotalMassKg = VehicleState.DryMassKg + state.PropellantMassKg;
                    NoteCutoff(ref cutoffAt, cursor);
                    if (left > 1e-12d) integrator.Step(state, left, substeps, 0d, direction);
                    return;
                }
            }
        }

        private static TelemetrySample Capture(
            IntegratorRK4 integrator,
            VehicleState state,
            double timeS,
            double throttle,
            double thrustPitchDeg,
            Vector3d thrustDirection,
            double timeSinceCutoffS = 0d)
        {
            Vector3d direction = thrustDirection;
            double pitchDeg = thrustPitchDeg;
            double gimbal = AttitudeController.EffectiveGimbal(state);
            if (gimbal != 0d && throttle > 0d)
            {
                direction = state.Attitude.Rotate(CylinderInertia.BodyThrustDirection(gimbal));
                pitchDeg = Math.Atan2(direction.X, direction.Y) * (180d / Math.PI);
            }
            ForceEvaluation force = integrator.Evaluate(state.Position, state.Velocity, state.PropellantMassKg, throttle, direction);
            TelemetrySample sample = new TelemetrySample
            {
                TimeS = timeS,
                AltitudeM = force.AltitudeM,
                SpeedMps = state.Velocity.Magnitude,
                VerticalMps = state.Velocity.Y,
                AccelMps2 = force.AccelerationMagnitudeMps2,
                PropellantKg = state.PropellantMassKg,
                TotalMassKg = force.MassKg,
                ThrustN = force.ThrustN,
                DynamicPressurePa = force.DynamicPressurePa,
                DensityKgM3 = force.DensityKgM3,
                DragN = force.DragN,
                GravityMps2 = force.GravityMps2,
                HorizontalMps = PitchProgram.HorizontalSpeedMps(state.Position, state.Velocity),
                FlightPathDeg = PitchProgram.FlightPathAngleDeg(state.Position, state.Velocity),
                ThrustPitchDeg = pitchDeg,
                RadiusM = state.Position.Magnitude,
                EngineState = throttle > 0d ? 1d : 0d,
                TimeSinceCutoffS = timeSinceCutoffS,
                SpecificEnergyM2S2 = CutoffCommand.SpecificMechanicalEnergy(integrator.Environment, state.Position, state.Velocity),
                Body = integrator.Environment.Name,
                Mach = integrator.Environment.SpeedOfSoundMps > 0d
                    ? state.Velocity.Magnitude / integrator.Environment.SpeedOfSoundMps
                    : 0d
            };
            StampAttitude(ref sample, state);
            return sample;
        }

        private static void StampAttitude(ref TelemetrySample sample, VehicleState state)
        {
            sample.QuaternionW = state.Attitude.W;
            sample.QuaternionX = state.Attitude.X;
            sample.QuaternionY = state.Attitude.Y;
            sample.QuaternionZ = state.Attitude.Z;
            sample.AngularVelocityRadS = state.AngularVelocityBody.Magnitude;
            sample.OmegaBodyX = state.AngularVelocityBody.X;
            sample.OmegaBodyY = state.AngularVelocityBody.Y;
            sample.OmegaBodyZ = state.AngularVelocityBody.Z;
            CylinderInertia.Moments inertia = CylinderInertia.FromMass(state.TotalMassKg);
            Vector3d angularMomentum = CylinderInertia.InertialAngularMomentum(state.Attitude, state.AngularVelocityBody, state.TotalMassKg);
            sample.AngularMomentumKgM2S = angularMomentum.Magnitude;
            sample.AngularMomentumInertialX = angularMomentum.X;
            sample.AngularMomentumInertialY = angularMomentum.Y;
            sample.AngularMomentumInertialZ = angularMomentum.Z;
            sample.InertiaIxx = inertia.Ixx;
            sample.InertiaIyy = inertia.Iyy;
            sample.InertiaIzz = inertia.Izz;
            sample.RotationAngleRad = QuaternionD.RotationAngleBetween(state.InitialAttitude, state.Attitude);
            Vector3d aero = AeroMoment.Moment(state.Attitude, state.Velocity, sample.DensityKgM3);
            double gimbal = AttitudeController.EffectiveGimbal(state);
            Vector3d gimbalTorque = CylinderInertia.GimbalMoment(sample.ThrustN, gimbal);
            Vector3d moment = aero.X == 0d && aero.Y == 0d && aero.Z == 0d
                ? gimbalTorque
                : new Vector3d(gimbalTorque.X + aero.X, gimbalTorque.Y + aero.Y, gimbalTorque.Z + aero.Z);
            Vector3d alpha = CylinderInertia.EulerRate(state.AngularVelocityBody, inertia, moment);
            sample.GimbalRad = gimbal;
            sample.MomentX = moment.X;
            sample.MomentY = moment.Y;
            sample.MomentZ = moment.Z;
            sample.AlphaX = alpha.X;
            sample.AlphaY = alpha.Y;
            sample.AlphaZ = alpha.Z;
            sample.AngleOfAttackRad = AeroMoment.AngleOfAttackRad(AeroMoment.VelocityBody(state.Attitude, state.Velocity));
            sample.AeroMomentZ = aero.Z;
            sample.PitchAngleRad = AttitudeController.PitchErrorRad(state.Attitude, AttitudeController.PitchTargetRad);
            sample.ControllerEnabled = state.ControllerEnabled;
        }

        private static void AdvanceAttitude(VehicleState state, double dt, int substeps)
        {
            if (QuaternionD.AngularVelocityIsZero(state.AngularVelocityBody)) return;
            QuaternionD attitude = state.Attitude;
            Vector3d omega = state.AngularVelocityBody;
            CylinderInertia.IntegrateRk4Substeps(ref attitude, ref omega, state.TotalMassKg, dt, substeps);
            state.Attitude = attitude;
            state.AngularVelocityBody = omega;
        }

        /// <summary>Pass 5. Vertical Mars surface burn. Earth runs do not call this.</summary>
        public static SimulationReport RunMarsVerticalBurn(bool disableGravityAndAtmosphere)
        {
            return RunMarsVerticalBurn(disableGravityAndAtmosphere, 1, 60d);
        }

        public static SimulationReport RunMarsVerticalBurn(bool disableGravityAndAtmosphere, int substeps, double durationS)
        {
            if (substeps < 1) throw new ArgumentOutOfRangeException("substeps");
            double stepCount = durationS * IntegratorRK4.StepHz;
            int steps = (int)Math.Round(stepCount);
            if (steps < 1 || Math.Abs(stepCount - steps) > 1e-6d) throw new ArgumentOutOfRangeException("durationS");

            PlanetaryEnvironment env = PlanetaryEnvironment.CreateMars(false);
            env.GravityEnabled = !disableGravityAndAtmosphere;
            env.AtmosphereEnabled = !disableGravityAndAtmosphere;
            PropulsionModel propulsion = PropulsionModel.CreateDefaultStage();
            IntegratorRK4 integrator = new IntegratorRK4(env, propulsion);
            VehicleState state = VehicleState.CreateSeaLevel(env);
            state.ControllerEnabled = false;
            Vector3d initialVelocity = state.Velocity;

            int logEvery = (int)Math.Round(LogIntervalS * IntegratorRK4.StepHz);
            SimulationReport report = new SimulationReport();
            report.DisableGravityAndAtmosphere = disableGravityAndAtmosphere;
            report.Substeps = substeps;
            report.InitialMassKg = state.TotalMassKg;
            string mode = disableGravityAndAtmosphere ? "VACUUM" : "MARS";
            Write(report, string.Format(CultureInfo.InvariantCulture, "ARES CORE mars vertical burn | mode={0} | body=Mars | thrust=+Y | throttle=1 | end={1} s | dt=0.02 s", mode, durationS));

            for (int n = 0; n <= steps; n++)
            {
                double timeS = n / (double)IntegratorRK4.StepHz;
                if (n % logEvery == 0)
                {
                    TelemetrySample sample = Capture(integrator, state, timeS, 1d, 0d, Vector3d.Up, 0d);
                    report.Samples.Add(sample);
                    Write(report, sample.ToLogLine());
                }

                if (n == steps) break;
                integrator.Step(state, 1d / IntegratorRK4.StepHz, substeps, 1d);
            }

            Finish(report, state, initialVelocity, propulsion, "verdict=MARS_SURFACE_BURN");
            return report;
        }

        /// <summary>
        /// Pass 5 entry. 125 km, 6000 m/s, −12°, 50 t propellant, engines off.
        /// </summary>
        public static SimulationReport RunMarsEntry(bool disableGravityAndAtmosphere, bool analytic)
        {
            return RunMarsEntry(disableGravityAndAtmosphere, 1, analytic, 300d, 125_000d, 6_000d, -12d, 50_000d);
        }

        public static SimulationReport RunMarsEntry(
            bool disableGravityAndAtmosphere,
            int substeps,
            bool analytic,
            double endTimeS,
            double altitudeM,
            double speedMps,
            double flightPathDeg,
            double propellantKg)
        {
            if (substeps < 1) throw new ArgumentOutOfRangeException("substeps");
            double stepCount = endTimeS * IntegratorRK4.StepHz;
            int steps = (int)Math.Round(stepCount);
            if (steps < 1 || Math.Abs(stepCount - steps) > 1e-6d) throw new ArgumentOutOfRangeException("endTimeS");

            PlanetaryEnvironment env = PlanetaryEnvironment.CreateMars(false);
            env.GravityEnabled = !disableGravityAndAtmosphere;
            env.AtmosphereEnabled = !disableGravityAndAtmosphere;
            PropulsionModel propulsion = PropulsionModel.CreateDefaultStage();
            IntegratorRK4 integrator = new IntegratorRK4(env, propulsion);
            VehicleState state = VehicleState.CreateEntry(env, altitudeM, speedMps, flightPathDeg, propellantKg);
            state.ControllerEnabled = false;
            Vector3d initialVelocity = state.Velocity;
            double mu = env.GravityEnabled ? env.MuM3S2 : 0d;

            int logEvery = (int)Math.Round(LogIntervalS * IntegratorRK4.StepHz);
            SimulationReport report = new SimulationReport();
            report.DisableGravityAndAtmosphere = disableGravityAndAtmosphere;
            report.Substeps = substeps;
            report.InitialMassKg = state.TotalMassKg;
            string mode = disableGravityAndAtmosphere ? "VACUUM" : "MARS";
            Write(
                report,
                string.Format(
                    CultureInfo.InvariantCulture,
                    "ARES CORE mars entry | mode={0} | body=Mars | h0={1} m | v0={2} m/s | gamma0={3} deg | mp={4} kg | coast={5} | end={6} s | dt=0.02 s",
                    mode,
                    altitudeM,
                    speedMps,
                    flightPathDeg,
                    propellantKg,
                    analytic ? "analytic" : "numerical",
                    endTimeS));

            KeplerCapture capture = null;
            if (analytic)
            {
                capture = new KeplerCapture
                {
                    TimeS = 0d,
                    Position = state.Position,
                    Velocity = state.Velocity,
                    MuM3S2 = mu,
                    PropellantKg = state.PropellantMassKg,
                    TotalMassKg = state.TotalMassKg,
                    ThrustIntegratedDeltaVMps = state.ThrustIntegratedDeltaVMps,
                    Elements = KeplerPropagator.Elements(state.Position, state.Velocity, mu)
                };
            }

            for (int n = 0; n <= steps; n++)
            {
                double timeS = n / (double)IntegratorRK4.StepHz;
                if (capture != null && timeS > capture.TimeS)
                {
                    KeplerState propagated = KeplerPropagator.Propagate(capture.Position, capture.Velocity, capture.MuM3S2, timeS - capture.TimeS);
                    state.Position = propagated.Position;
                    state.Velocity = propagated.Velocity;
                    state.PropellantMassKg = capture.PropellantKg;
                    state.TotalMassKg = capture.TotalMassKg;
                    state.ThrustIntegratedDeltaVMps = capture.ThrustIntegratedDeltaVMps;
                }

                bool onAnalyticArc = capture != null && timeS > capture.TimeS;
                if (n % logEvery == 0)
                {
                    TelemetrySample sample;
                    if (onAnalyticArc)
                    {
                        sample = CaptureAnalytic(env, state, timeS, 0d, timeS, mu, capture, timeS - capture.TimeS);
                    }
                    else
                    {
                        sample = Capture(integrator, state, timeS, 0d, 0d, Vector3d.Up, timeS);
                        if (capture != null && timeS == capture.TimeS)
                        {
                            sample.SemiMajorAxisM = capture.Elements.SemiMajorAxisM;
                            sample.Eccentricity = capture.Elements.Eccentricity;
                            sample.TimeSinceElementsS = 0d;
                        }
                    }

                    report.Samples.Add(sample);
                    Write(report, sample.ToLogLine() + KeplerSuffix(sample));
                }

                if (n == steps) break;
                if (capture != null)
                {
                    AdvanceAttitude(state, 1d / IntegratorRK4.StepHz, substeps);
                    continue;
                }
                integrator.Step(state, 1d / IntegratorRK4.StepHz, substeps, 0d);
            }

            report.AnalyticKepler = analytic;
            report.KeplerCapture = capture;
            Finish(report, state, initialVelocity, propulsion, analytic ? "verdict=MARS_ENTRY_ANALYTIC" : "verdict=MARS_ENTRY_NUMERICAL");
            return report;
        }

        private static void Finish(
            SimulationReport report,
            VehicleState state,
            Vector3d initialVelocity,
            PropulsionModel propulsion,
            string verdict)
        {
            report.FinalMassKg = state.TotalMassKg;
            report.FinalPosition = state.Position;
            report.FinalVelocity = state.Velocity;
            report.IdealDeltaVMps = propulsion.IdealDeltaVMps(report.InitialMassKg, report.FinalMassKg);
            report.AchievedDeltaVMps = (state.Velocity - initialVelocity).Magnitude;
            report.ThrustIntegratedDeltaVMps = state.ThrustIntegratedDeltaVMps;
            report.DifferenceMps = report.IdealDeltaVMps - report.AchievedDeltaVMps;
            report.RelativeError = report.IdealDeltaVMps > 0d
                ? Math.Abs(report.AchievedDeltaVMps - report.IdealDeltaVMps) / report.IdealDeltaVMps
                : 0d;
            report.VacuumCheckPassed = false;
            CultureInfo c = CultureInfo.InvariantCulture;
            Write(report, string.Format(c, "ideal_dv_m_s={0:F6}", report.IdealDeltaVMps));
            Write(report, string.Format(c, "achieved_dv_m_s={0:F6}", report.AchievedDeltaVMps));
            Write(report, string.Format(c, "thrust_integrated_dv_m_s={0:F6}", report.ThrustIntegratedDeltaVMps));
            Write(report, string.Format(c, "difference_ideal_minus_achieved_m_s={0:F6}", report.DifferenceMps));
            Write(report, string.Format(c, "relative_error={0:F8} %", report.RelativeError * 100d));
            Write(report, verdict);
        }

        /// <summary>
        /// Pass 6. Mars entry plus an open-loop flip and landing burn.
        /// Pass 1–5 entry does not call this.
        /// </summary>
        public static SimulationReport RunMarsTerminalLanding(bool disableGravityAndAtmosphere, bool early)
        {
            return RunMarsTerminalLanding(disableGravityAndAtmosphere, 1, early);
        }

        public static SimulationReport RunMarsTerminalLanding(bool disableGravityAndAtmosphere, int substeps, bool early, double horizontalFraction = 0d)
        {
            TerminalSequence sequence = early ? TerminalSequence.EarlyProfile() : TerminalSequence.DefaultProfile();
            if (horizontalFraction > 0d)
            {
                sequence = new TerminalSequence(
                    sequence.TriggerAltitudeM,
                    sequence.TriggerTimeS,
                    sequence.FlipDurationS,
                    sequence.FlipThrottle,
                    sequence.LandingThrottle,
                    sequence.ManualCutoffS,
                    horizontalFraction);
            }
            return RunMarsTerminalLanding(disableGravityAndAtmosphere, substeps, sequence);
        }

        public static SimulationReport RunMarsTerminalLanding(
            bool disableGravityAndAtmosphere,
            int substeps,
            TerminalSequence sequence,
            double entryAltitudeM = 125_000d,
            double entrySpeedMps = 6_000d,
            double entryFlightPathDeg = -12d,
            double entryPropellantKg = 50_000d)
        {
            if (substeps < 1) throw new ArgumentOutOfRangeException("substeps");
            if (sequence == null) throw new ArgumentNullException("sequence");
            double dt = 1d / IntegratorRK4.StepHz;
            int maxSteps = (int)Math.Round(TerminalSequence.MaxTimeS * IntegratorRK4.StepHz);
            int logEvery = (int)Math.Round(LogIntervalS * IntegratorRK4.StepHz);

            PlanetaryEnvironment env = PlanetaryEnvironment.CreateMars(false);
            env.GravityEnabled = !disableGravityAndAtmosphere;
            env.AtmosphereEnabled = !disableGravityAndAtmosphere;
            PropulsionModel propulsion = PropulsionModel.CreateDefaultStage();
            IntegratorRK4 integrator = new IntegratorRK4(env, propulsion);
            VehicleState state = VehicleState.CreateEntry(env, entryAltitudeM, entrySpeedMps, entryFlightPathDeg, entryPropellantKg);
            state.ControllerEnabled = false;
            Vector3d initialVelocity = state.Velocity;

            SimulationReport report = new SimulationReport();
            report.DisableGravityAndAtmosphere = disableGravityAndAtmosphere;
            report.Substeps = substeps;
            report.InitialMassKg = state.TotalMassKg;
            report.TerminalSequenceArmed = true;
            string mode = disableGravityAndAtmosphere ? "VACUUM" : "MARS";
            string triggerLabel = sequence.TriggerTimeS.HasValue
                ? string.Format(CultureInfo.InvariantCulture, "t:{0}", sequence.TriggerTimeS.Value)
                : string.Format(CultureInfo.InvariantCulture, "h:{0}", sequence.TriggerAltitudeM.HasValue ? sequence.TriggerAltitudeM.Value.ToString(CultureInfo.InvariantCulture) : "none");
            string header = string.Format(
                CultureInfo.InvariantCulture,
                "ARES CORE mars terminal | mode={0} | body=Mars | trigger={1} | flip={2} s | flip_throttle={3} | landing_throttle={4} | dt=0.02 s",
                mode,
                triggerLabel,
                sequence.FlipDurationS,
                sequence.FlipThrottle,
                sequence.LandingThrottle);
            if (sequence.GuidanceMode != "Proportional" && sequence.HorizontalFraction > 0d)
            {
                header += string.Format(CultureInfo.InvariantCulture, " | hf={0:F4}", sequence.HorizontalFraction);
            }
            if (sequence.GuidanceMode == "Proportional")
            {
                header += string.Format(
                    CultureInfo.InvariantCulture,
                    " | guide=Proportional | k={0:F4} | vref={1:F3} | hf_max={2:F4}",
                    sequence.ProportionalGain,
                    sequence.ProportionalSpeedRefMps,
                    sequence.MaxHorizontalFraction);
                report.GuidanceMode = "Proportional";
            }
            Write(report, header);

            string loggedPhase = null;
            double peak = state.Velocity.Magnitude;
            bool impacted = false;
            ImpactAssessment impact = new ImpactAssessment();
            double endTimeS = 0d;

            for (int n = 0; n <= maxSteps; n++)
            {
                double timeS = n / (double)IntegratorRK4.StepHz;
                double height = env.AltitudeM(state.Position);
                double speed = state.Velocity.Magnitude;
                if (speed > peak) peak = speed;
                TerminalCommand command = sequence.Command(timeS, state.Position, state.Velocity, state.PropellantMassKg, height, state.Attitude, state.AngularVelocityBody.Z);
                bool flipping = command.BodyThrust && sequence.FlipControllerEnabled;
                state.ControllerEnabled = flipping;
                state.PitchTargetRad = flipping ? AttitudeController.VerticalTargetRad(state.Position) : 0d;
                state.FlipHold = flipping;
                bool phaseChanged = command.Phase != loggedPhase;
                bool onLog = n % logEvery == 0;
                if (onLog || phaseChanged)
                {
                    TelemetrySample sample = CaptureTerminal(integrator, state, timeS, command, null, peak);
                    report.Samples.Add(sample);
                    Write(report, sample.ToLogLine());
                    loggedPhase = command.Phase;
                }

                if (height <= 0d)
                {
                    Vector3d radial = state.Position.Magnitude > 0d ? state.Position.Normalized * env.EquatorialRadiusM : new Vector3d(0d, env.EquatorialRadiusM, 0d);
                    state.Position = radial;
                    if (state.Velocity.Magnitude > peak) peak = state.Velocity.Magnitude;
                    impact = TerminalSequence.Assess(state, peak);
                    if (command.Phase == "Flip") impact.Flag = "RUD";
                    impacted = true;
                    endTimeS = timeS;
                    TelemetrySample hit = CaptureTerminal(integrator, state, timeS, ImpactCommand(sequence, state, command), impact, peak);
                    report.Samples.Add(hit);
                    Write(report, hit.ToLogLine());
                    break;
                }

                if (n == maxSteps)
                {
                    endTimeS = timeS;
                    break;
                }

                VehicleState before = state.Clone();
                integrator.Step(state, dt, substeps, command.Throttle, command.Direction);
                double nextHeight = env.AltitudeM(state.Position);
                if (nextHeight <= 0d && height > 0d)
                {
                    double u;
                    state = TerminalSequence.SurfaceState(before, state, env.EquatorialRadiusM, out u);
                    endTimeS = timeS + u * dt;
                    if (state.Velocity.Magnitude > peak) peak = state.Velocity.Magnitude;
                    impact = TerminalSequence.Assess(state, peak);
                    if (command.Phase == "Flip") impact.Flag = "RUD";
                    impacted = true;
                    TerminalCommand hitCommand = sequence.Command(endTimeS, state.Position, state.Velocity, state.PropellantMassKg, 0d, state.Attitude, state.AngularVelocityBody.Z);
                    TelemetrySample hit = CaptureTerminal(integrator, state, endTimeS, ImpactCommand(sequence, state, hitCommand), impact, peak);
                    report.Samples.Add(hit);
                    Write(report, hit.ToLogLine());
                    break;
                }
            }

            report.TriggerTimeS = sequence.ArmedAtS.HasValue ? sequence.ArmedAtS.Value : 0d;
            report.PeakSpeedMps = peak;
            if (impacted)
            {
                report.ImpactFlag = impact.Flag;
                report.ImpactKineticEnergyJ = impact.KineticEnergyJ;
                report.ImpactSpeedMps = impact.SpeedMps;
                report.ImpactVerticalMps = impact.VerticalMps;
                report.ImpactHorizontalMps = impact.HorizontalMps;
            }

            Finish(
                report,
                state,
                initialVelocity,
                propulsion,
                !impacted ? "verdict=TERMINAL_NO_IMPACT" : impact.Flag == "nominal" ? "verdict=TERMINAL_NOMINAL" : "verdict=TERMINAL_RUD");
            return report;
        }

        private static TelemetrySample CaptureTerminal(
            IntegratorRK4 integrator,
            VehicleState state,
            double timeS,
            TerminalCommand command,
            ImpactAssessment? impact,
            double peakSpeedMps)
        {
            double radial = state.Position.Magnitude > 0d ? state.Velocity.Dot(state.Position.Normalized) : 0d;
            TelemetrySample sample = Capture(
                integrator,
                state,
                timeS,
                command.Throttle,
                TerminalSequence.InertialPitchFromYDeg(command.Direction),
                command.Direction,
                0d);
            sample.SequencePhase = impact.HasValue ? "Complete" : command.Phase;
            sample.ThrustPitchFromVerticalDeg = command.PitchFromVerticalDeg;
            sample.RadialMps = radial;
            sample.PeakSpeedMps = peakSpeedMps;
            if (command.GuidanceMode == "Proportional")
            {
                sample.GuidanceMode = "Proportional";
                sample.HorizontalFraction = command.HorizontalFraction;
            }
            else if (command.HorizontalFraction > 0d)
            {
                sample.HorizontalFraction = command.HorizontalFraction;
            }
            if (impact.HasValue)
            {
                sample.AltitudeM = 0d;
                sample.ImpactFlag = impact.Value.Flag;
                sample.ImpactKineticEnergyJ = impact.Value.KineticEnergyJ;
                sample.ImpactSpeedMps = impact.Value.SpeedMps;
                sample.ImpactVerticalMps = impact.Value.VerticalMps;
                sample.ImpactHorizontalMps = impact.Value.HorizontalMps;
                sample.PeakSpeedMps = impact.Value.PeakSpeedMps;
            }
            return sample;
        }

        /// <summary>
        /// Fraction 0 returns the command unchanged. A positive fraction stamps the
        /// scheduled landing heading onto the impact line without affecting the step.
        /// </summary>
        private static TerminalCommand ImpactCommand(TerminalSequence sequence, VehicleState state, TerminalCommand command)
        {
            if (sequence.GuidanceMode == "Proportional")
            {
                double fraction = sequence.ProportionalFraction(state.Position, state.Velocity);
                double blend = fraction > 1d ? 1d : fraction;
                Vector3d up = state.Position.Magnitude > 0d ? state.Position.Normalized : Vector3d.Up;
                Vector3d aim;
                double pitch;
                if (TerminalSequence.TryLandingAim(up, state.Velocity, blend, out aim, out pitch))
                {
                    command.Direction = aim;
                    command.PitchFromVerticalDeg = pitch;
                }
                command.HorizontalFraction = fraction;
                command.GuidanceMode = "Proportional";
                command.Phase = "Complete";
                command.Throttle = 0d;
                return command;
            }
            if (!(sequence.HorizontalFraction > 0d)) return command;
            double fixedFraction = sequence.HorizontalFraction;
            Vector3d fixedUp = state.Position.Magnitude > 0d ? state.Position.Normalized : Vector3d.Up;
            Vector3d fixedAim;
            double fixedPitch;
            if (TerminalSequence.TryLandingAim(fixedUp, state.Velocity, fixedFraction, out fixedAim, out fixedPitch))
            {
                command.Direction = fixedAim;
                command.PitchFromVerticalDeg = fixedPitch;
            }
            command.HorizontalFraction = fixedFraction;
            command.Phase = "Complete";
            command.Throttle = 0d;
            return command;
        }

        private static void Write(SimulationReport report, string line)
        {
            report.LogLines.Add(line);
            SimLog.Write(line);
        }
    }

    public static class SimLog
    {
        public static void Write(string message)
        {
#if UNITY_5_3_OR_NEWER
            UnityEngine.Debug.Log(message);
#else
            Console.WriteLine(message);
#endif
        }
    }
}
