using System;
using MarsMission.Math;
using MarsMission.PhysicsCore;

internal static class Program
{
    private static int Main()
    {
        SimulationReport vacuum = SimulationHarness.RunVerticalBurn(true, 1);
        SimulationReport earth = SimulationHarness.RunVerticalBurn(false, 1);

        PitchProgram pureVertical = PitchProgram.RateAfterVertical(20d, 0d);
        SimulationReport earthAgain = SimulationHarness.RunPitchedBurn(false, 1, pureVertical);
        SimulationReport vacuumAgain = SimulationHarness.RunPitchedBurn(true, 1, pureVertical);

        SimulationReport pitched = SimulationHarness.RunPitchedBurn(false, 1, PitchProgram.DefaultPitchOver());
        TelemetrySample at20 = pitched.Samples[4];
        TelemetrySample at90 = pitched.Samples[18];

        bool caseA = vacuum.VacuumCheckPassed
            && vacuumAgain.VacuumCheckPassed
            && earth.DifferenceMps > 0d
            && earth.Samples.Count == 19
            && earth.AchievedDeltaVMps == earthAgain.AchievedDeltaVMps
            && vacuum.AchievedDeltaVMps == vacuumAgain.AchievedDeltaVMps
            && earth.Samples[18].AltitudeM == earthAgain.Samples[18].AltitudeM
            && earth.Samples[18].HorizontalMps == 0d
            && earth.Samples[18].ThrustPitchDeg == 0d;

        bool caseB = at20.TimeS == 20d
            && at20.HorizontalMps == 0d
            && at20.ThrustPitchDeg == 0d
            && at20.AltitudeM == earth.Samples[4].AltitudeM
            && Math.Abs(pitched.Samples[5].ThrustPitchDeg - 5d) < 1e-12d
            && Math.Abs(at90.ThrustPitchDeg - 70d) < 1e-12d
            && at90.HorizontalMps > 1d
            && at90.FlightPathDeg < 89d
            && at90.FlightPathDeg < at20.FlightPathDeg;

        SimulationReport verticalAgain = SimulationHarness.RunCoastBurn(
            false, 1, PitchProgram.PureVertical(), CutoffCommand.AtTime(120d), 90d);
        SimulationReport pitchedAgain = SimulationHarness.RunCoastBurn(
            false, 1, PitchProgram.DefaultPitchOver(), CutoffCommand.Never(), 90d);
        SimulationReport cutoff = SimulationHarness.RunCoastBurn(
            false, 1, PitchProgram.PureVertical(), CutoffCommand.AtTime(60d), 120d);
        SimulationReport pitchedCutoff = SimulationHarness.RunCoastBurn(
            false, 1, PitchProgram.DefaultPitchOver(), CutoffCommand.AtTime(60d), 120d);

        TelemetrySample cut60 = cutoff.Samples[12];
        TelemetrySample cut120 = cutoff.Samples[24];
        bool caseCutoff = verticalAgain.AchievedDeltaVMps == earth.AchievedDeltaVMps
            && verticalAgain.Samples[18].AltitudeM == earth.Samples[18].AltitudeM
            && pitchedAgain.AchievedDeltaVMps == pitched.AchievedDeltaVMps
            && cutoff.Samples.Count == 25
            && cut60.AltitudeM == earth.Samples[12].AltitudeM
            && cut60.PropellantKg == earth.Samples[12].PropellantKg
            && cut60.ThrustN == 0d
            && cut120.PropellantKg == cut60.PropellantKg
            && cut120.EngineState == 0d
            && cut120.TimeSinceCutoffS == 60d
            && pitchedCutoff.Samples[12].HorizontalMps == pitched.Samples[12].HorizontalMps
            && pitchedCutoff.Samples[24].HorizontalMps > 1d
            && pitchedCutoff.Samples[24].PropellantKg == pitchedCutoff.Samples[12].PropellantKg;

        bool pass = caseA && caseB && caseCutoff;
        if (!pass)
        {
            Console.WriteLine("VERIFY FAIL");
            return 1;
        }

        SimulationReport delegated = SimulationHarness.RunKeplerCoast(
            false, 1, PitchProgram.PureVertical(), CutoffCommand.Never(), 90d);
        SimulationReport analytic = SimulationHarness.RunKeplerCoast(
            false, 1, PitchProgram.PureVertical(), CutoffCommand.AtTime(60d), 120d);
        SimulationReport pitchedAnalytic = SimulationHarness.RunKeplerCoast(
            false, 1, PitchProgram.DefaultPitchOver(), CutoffCommand.AtTime(60d), 120d);

        bool caseOff = delegated.AnalyticKepler == false
            && delegated.AchievedDeltaVMps == earth.AchievedDeltaVMps
            && delegated.Samples[18].AltitudeM == earth.Samples[18].AltitudeM
            && delegated.Samples[18].HorizontalMps == 0d
            && Math.Abs(earth.AchievedDeltaVMps - 296.123d) < 0.001d
            && Math.Abs(earth.Samples[18].AltitudeM - 10800.316d) < 0.01d;

        KeplerCapture cap = analytic.KeplerCapture;
        VehicleState vac90 = VacuumCoast(cap, 30d);
        VehicleState vac120 = VacuumCoast(cap, 60d);
        TelemetrySample a90 = analytic.Samples[18];
        TelemetrySample a120 = analytic.Samples[24];
        bool caseKepler = analytic.AnalyticKepler
            && analytic.Samples[12].AltitudeM == cut60.AltitudeM
            && analytic.Samples[12].SpeedMps == cut60.SpeedMps
            && analytic.Samples[12].PropellantKg == cut60.PropellantKg
            && Math.Abs(analytic.Samples[12].PropellantKg - 958488.265d) < 0.001d
            && a90.PropagationMode == "analytic"
            && a90.DragN == 0d
            && a120.DragN == 0d
            && a120.TimeSinceElementsS == 60d
            && Math.Abs(a90.RadiusM - vac90.Position.Magnitude) < 1d
            && Math.Abs(a120.RadiusM - vac120.Position.Magnitude) < 1d
            && Math.Abs(a90.SpeedMps - vac90.Velocity.Magnitude) < 0.01d
            && Math.Abs(a120.SpeedMps - vac120.Velocity.Magnitude) < 0.01d;

        TelemetrySample p60 = pitchedAnalytic.Samples[12];
        TelemetrySample p120 = pitchedAnalytic.Samples[24];
        bool casePitchKepler = pitchedAnalytic.AnalyticKepler
            && p60.HorizontalMps == pitchedCutoff.Samples[12].HorizontalMps
            && p60.HorizontalMps > 1d
            && p120.HorizontalMps > 1d
            && p120.DragN == 0d
            && p120.PropellantKg == p60.PropellantKg
            && Math.Abs(p120.SpecificEnergyM2S2 - pitchedAnalytic.Samples[18].SpecificEnergyM2S2) < 1e-4d
            && Math.Abs(p120.FlightPathDeg - p60.FlightPathDeg) > 0.1d;

        Vector3d circR = new Vector3d(EARTH_CHECK_RADIUS, 0d, 0d);
        double circV = Math.Sqrt(EARTH_CHECK_MU / EARTH_CHECK_RADIUS);
        Vector3d circVel = new Vector3d(0d, circV, 0d);
        KeplerElements circ = KeplerPropagator.Elements(circR, circVel, EARTH_CHECK_MU);
        double period = 2d * Math.PI * Math.Sqrt(EARTH_CHECK_RADIUS * EARTH_CHECK_RADIUS * EARTH_CHECK_RADIUS / EARTH_CHECK_MU);
        KeplerState back = KeplerPropagator.Propagate(circR, circVel, EARTH_CHECK_MU, period);
        bool caseOrbit = Math.Abs(circ.SemiMajorAxisM - EARTH_CHECK_RADIUS) < 1e-4d
            && circ.Eccentricity < 1e-10d
            && (back.Position - circR).Magnitude < 1e-3d;

        pass = caseOff && caseKepler && casePitchKepler && caseOrbit;

        SimulationReport marsBurn = SimulationHarness.RunMarsVerticalBurn(false, 1, 60d);
        double marsG = PlanetaryEnvironment.MarsMuM3S2
            / (PlanetaryEnvironment.MarsEquatorialRadiusM * PlanetaryEnvironment.MarsEquatorialRadiusM);
        bool caseMarsBurn = Math.Abs(marsG - 3.71d) < 0.03d
            && marsBurn.Samples.Count == 13
            && marsBurn.Samples[0].Body == "Mars"
            && marsBurn.Samples[0].AltitudeM == 0d
            && marsBurn.Samples[12].TimeS == 60d
            && marsBurn.Samples[12].HorizontalMps == 0d
            && marsBurn.Samples[12].AltitudeM > marsBurn.Samples[6].AltitudeM
            && marsBurn.Samples[12].DensityKgM3 > 0d
            && marsBurn.Samples[12].DensityKgM3 < marsBurn.Samples[0].DensityKgM3
            && Math.Abs(earth.AchievedDeltaVMps - 296.123d) < 0.001d;

        SimulationReport marsEntry = SimulationHarness.RunMarsEntry(false, false);
        bool densityRose = false;
        for (int i = 1; i < marsEntry.Samples.Count; i++)
        {
            TelemetrySample prev = marsEntry.Samples[i - 1];
            TelemetrySample next = marsEntry.Samples[i];
            if (next.AltitudeM > 0d && next.AltitudeM < prev.AltitudeM && next.DensityKgM3 > prev.DensityKgM3)
                densityRose = true;
        }

        SimulationReport marsAnalytic = SimulationHarness.RunMarsEntry(false, true);
        double entryEnergy = marsAnalytic.Samples[1].SpecificEnergyM2S2;
        bool caseMarsEntry = marsEntry.Samples.Count == 61
            && marsEntry.Samples[0].AltitudeM == 125_000d
            && Math.Abs(marsEntry.Samples[0].SpeedMps - 6_000d) < 1e-6d
            && Math.Abs(marsEntry.Samples[0].FlightPathDeg - (-12d)) < 1e-6d
            && marsEntry.Samples[0].PropellantKg == 50_000d
            && marsEntry.Samples[0].ThrustN == 0d
            && marsEntry.Samples[1].AltitudeM < marsEntry.Samples[0].AltitudeM
            && marsEntry.Samples[6].SpeedMps != marsEntry.Samples[0].SpeedMps
            && densityRose
            && marsAnalytic.AnalyticKepler
            && marsAnalytic.Samples[1].DragN == 0d
            && marsAnalytic.Samples[1].DensityKgM3 == 0d
            && Math.Abs(marsAnalytic.Samples[60].SpecificEnergyM2S2 - entryEnergy) < 1e-6d * Math.Abs(entryEnergy);

        pass = pass && caseMarsBurn && caseMarsEntry;

        SimulationReport terminal = SimulationHarness.RunMarsTerminalLanding(false, false);
        SimulationReport terminalEarly = SimulationHarness.RunMarsTerminalLanding(false, true);
        bool sawFlip = false;
        bool sawBurn = false;
        double flipAltitude = -1d;
        double burnAltitude = -1d;
        double burnTime = -1d;
        double burnThrust = -1d;
        for (int i = 0; i < terminal.Samples.Count; i++)
        {
            if (!sawFlip && terminal.Samples[i].SequencePhase == "Flip")
            {
                sawFlip = true;
                flipAltitude = terminal.Samples[i].AltitudeM;
            }
            if (!sawBurn && terminal.Samples[i].SequencePhase == "LandingBurn")
            {
                sawBurn = true;
                burnThrust = terminal.Samples[i].ThrustN;
                burnAltitude = terminal.Samples[i].AltitudeM;
                burnTime = terminal.Samples[i].TimeS;
            }
        }
        double flipElapsed = burnTime - terminal.TriggerTimeS;
        TerminalSequence locked = new TerminalSequence(
            TerminalSequence.DefaultTriggerAltitudeM,
            null,
            TerminalSequence.DefaultFlipDurationS,
            TerminalSequence.DefaultFlipThrottle,
            TerminalSequence.DefaultLandingThrottle,
            null,
            0d,
            "FixedFraction",
            1d,
            500d,
            0.75d,
            false);
        SimulationReport openLoop = SimulationHarness.RunMarsTerminalLanding(false, 1, locked);
        bool openBurn = false;
        for (int i = 0; i < openLoop.Samples.Count; i++)
        {
            if (openLoop.Samples[i].SequencePhase == "LandingBurn") openBurn = true;
        }
        TelemetrySample terminalLast = terminal.Samples[terminal.Samples.Count - 1];
        bool caseTerminal = sawFlip
            && sawBurn
            && flipAltitude <= 3_000d
            && flipAltitude > 2_500d
            && flipElapsed >= 3d
            && flipElapsed <= 6d
            && burnAltitude >= 2_200d
            && burnAltitude <= 2_800d
            && Math.Abs(burnThrust - 0.6d * 15_000_000d) < 1d
            && terminalLast.AltitudeM == 0d
            && (terminal.ImpactFlag == "RUD" || terminal.ImpactFlag == "nominal")
            && !openBurn
            && openLoop.ImpactFlag == "RUD"
            && terminalEarly.Samples[0].SequencePhase == "Coast"
            && terminalEarly.TriggerTimeS < terminal.TriggerTimeS
            && Math.Abs(earth.AchievedDeltaVMps - 296.123d) < 0.001d;

        pass = pass && caseTerminal;

        TerminalSequence tilt = new TerminalSequence(
            TerminalSequence.DefaultTriggerAltitudeM,
            null,
            TerminalSequence.DefaultFlipDurationS,
            TerminalSequence.DefaultFlipThrottle,
            TerminalSequence.DefaultLandingThrottle,
            null,
            0.3d);
        TerminalSequence wider = new TerminalSequence(
            TerminalSequence.DefaultTriggerAltitudeM,
            null,
            TerminalSequence.DefaultFlipDurationS,
            TerminalSequence.DefaultFlipThrottle,
            TerminalSequence.DefaultLandingThrottle,
            null,
            0.6d);
        SimulationReport caseTilt = SimulationHarness.RunMarsTerminalLanding(false, 1, tilt);
        SimulationReport caseC = SimulationHarness.RunMarsTerminalLanding(false, 1, wider);
        bool caseHorizontal = caseTilt.ImpactHorizontalMps < terminal.ImpactHorizontalMps
            && caseC.ImpactHorizontalMps < caseTilt.ImpactHorizontalMps
            && (caseTilt.ImpactFlag == "RUD" || caseTilt.ImpactFlag == "nominal")
            && (caseC.ImpactFlag == "RUD" || caseC.ImpactFlag == "nominal")
            && Math.Abs(earth.AchievedDeltaVMps - 296.123d) < 0.001d;
        pass = pass && caseHorizontal;

        TerminalSequence proportional = new TerminalSequence(
            TerminalSequence.DefaultTriggerAltitudeM,
            null,
            TerminalSequence.DefaultFlipDurationS,
            TerminalSequence.DefaultFlipThrottle,
            TerminalSequence.DefaultLandingThrottle,
            null,
            0d,
            "Proportional",
            1d,
            500d,
            0.75d);
        SimulationReport caseProp = SimulationHarness.RunMarsTerminalLanding(false, 1, proportional);
        bool sawGuide = false;
        for (int i = 0; i < caseProp.Samples.Count; i++)
        {
            if (caseProp.Samples[i].SequencePhase == "LandingBurn" && caseProp.Samples[i].GuidanceMode == "Proportional")
                sawGuide = true;
        }
        TerminalSequence heavy = new TerminalSequence(
            TerminalSequence.EarlyTriggerAltitudeM,
            null,
            TerminalSequence.DefaultFlipDurationS,
            TerminalSequence.DefaultFlipThrottle,
            TerminalSequence.EarlyLandingThrottle,
            null,
            0d,
            "Proportional");
        SimulationReport caseHeavy = SimulationHarness.RunMarsTerminalLanding(false, 1, heavy, 125_000d, 3_500d, -12d, 200_000d);
        bool caseProportional = sawGuide
            && caseProp.ImpactHorizontalMps < terminal.ImpactHorizontalMps
            && (caseProp.ImpactFlag == "RUD" || caseProp.ImpactFlag == "nominal")
            && caseHeavy.ImpactFlag == "RUD"
            && caseHeavy.FinalMassKg > 300_000d
            && Math.Abs(earth.AchievedDeltaVMps - 296.123d) < 0.001d;
        pass = pass && caseProportional;

        bool attitudeQuiet = true;
        for (int i = 0; i < earth.Samples.Count; i++)
        {
            TelemetrySample s = earth.Samples[i];
            if (s.QuaternionW != 1d || s.QuaternionX != 0d || s.QuaternionY != 0d || s.QuaternionZ != 0d) attitudeQuiet = false;
            if (s.AngularVelocityRadS != 0d || s.RotationAngleRad != 0d) attitudeQuiet = false;
            if (!s.ToLogLine().Contains("qw=1.000000000")) attitudeQuiet = false;
            if (!s.ToLogLine().Contains("theta=0.000000000 rad")) attitudeQuiet = false;
        }
        SimulationReport spinning = SimulationHarness.RunVerticalBurn(false, 1, new Vector3d(0.1d, 0d, 0d));
        bool attitudeTranslation = spinning.AchievedDeltaVMps == earth.AchievedDeltaVMps
            && spinning.Samples[18].AltitudeM == earth.Samples[18].AltitudeM
            && spinning.Samples[18].SpeedMps == earth.Samples[18].SpeedMps
            && spinning.Samples[18].PropellantKg == earth.Samples[18].PropellantKg
            && spinning.Samples[18].HorizontalMps == earth.Samples[18].HorizontalMps
            && spinning.Samples[4].TimeS == 20d
            && Math.Abs(spinning.Samples[2].RotationAngleRad - 1d) < 1e-9d
            && Math.Abs(spinning.Samples[6].RotationAngleRad - 3d) < 1e-9d
            && spinning.Samples[2].TimeS == 10d
            && spinning.Samples[6].TimeS == 30d;
        bool spin10 = SpinPrincipal(new Vector3d(0.1d, 0d, 0d), 10d);
        bool spin30 = SpinPrincipal(new Vector3d(0.1d, 0d, 0d), 30d);
        bool spinY = SpinPrincipal(new Vector3d(0d, 0.1d, 0d), 10d);
        bool spinZ = SpinPrincipal(new Vector3d(0d, 0d, 0.1d), 30d);
        bool spinSub = SpinPrincipal(new Vector3d(0.1d, 0d, 0d), 10d, 4);
        bool euler = VerifyTorqueFree(earth, spinning);
        bool gimbal = VerifyGimbal(earth);
        bool aero = VerifyAero(earth, vacuum);
        bool hold = VerifyAttitudeHold(earth);
        pass = pass && attitudeQuiet && attitudeTranslation && spin10 && spin30 && spinY && spinZ && spinSub && euler && gimbal && aero && hold;
        Console.WriteLine(pass ? "VERIFY PASS" : "VERIFY FAIL");
        if (pass)
        {
            Console.WriteLine("vertical dv " + earth.AchievedDeltaVMps.ToString("F6"));
            Console.WriteLine("vertical alt " + earth.Samples[18].AltitudeM.ToString("F6"));
            Console.WriteLine("prop60 " + analytic.Samples[12].PropellantKg.ToString("F6"));
            Console.WriteLine("kepler90 r " + a90.RadiusM.ToString("F6") + " vac " + vac90.Position.Magnitude.ToString("F6"));
            Console.WriteLine("pitch vh120 " + p120.HorizontalMps.ToString("F6") + " gamma " + p120.FlightPathDeg.ToString("F6"));
        }
        return pass ? 0 : 1;
    }

    private static bool SpinPrincipal(Vector3d omega, double seconds, int substeps = 1)
    {
        PlanetaryEnvironment env = PlanetaryEnvironment.CreateEarth(false);
        env.GravityEnabled = false;
        env.AtmosphereEnabled = false;
        IntegratorRK4 integrator = new IntegratorRK4(env, PropulsionModel.CreateDefaultStage());
        VehicleState state = VehicleState.CreateSeaLevel(env);
        state.AngularVelocityBody = omega;
        int steps = (int)Math.Round(seconds * IntegratorRK4.StepHz);
        for (int i = 0; i < steps; i++) integrator.Step(state, 1d / IntegratorRK4.StepHz, substeps, 0d);
        double theta = omega.Magnitude * seconds;
        QuaternionD expected = QuaternionD.FromAxisAngle(omega, theta);
        double angle = QuaternionD.RotationAngleBetween(QuaternionD.Identity, state.Attitude);
        bool components = Math.Abs(state.Attitude.X - expected.X) < 1e-9d
            && Math.Abs(state.Attitude.Y - expected.Y) < 1e-9d
            && Math.Abs(state.Attitude.Z - expected.Z) < 1e-9d
            && Math.Abs(state.Attitude.W - expected.W) < 1e-9d;
        bool held = state.AngularVelocityBody.X == omega.X
            && state.AngularVelocityBody.Y == omega.Y
            && state.AngularVelocityBody.Z == omega.Z;
        bool still = state.Velocity.X == 0d && state.Velocity.Y == 0d && state.Velocity.Z == 0d
            && state.Position.X == 0d && state.Position.Z == 0d
            && state.Position.Y == env.EquatorialRadiusM;
        return components && held && still && Math.Abs(angle - theta) < 1e-9d && Math.Abs(state.Attitude.Magnitude - 1d) < 1e-12d;
    }

    private static bool VerifyTorqueFree(SimulationReport quiet, SimulationReport principalBurn)
    {
        CylinderInertia.Moments full = CylinderInertia.FromMass(VehicleState.DryMassKg + VehicleState.InitialPropellantMassKg);
        double r2 = CylinderInertia.RadiusM * CylinderInertia.RadiusM;
        bool geometry = CylinderInertia.HeightM == 50d
            && CylinderInertia.RadiusM == 4.5d
            && full.Iyy == 0.5d * (VehicleState.DryMassKg + VehicleState.InitialPropellantMassKg) * r2
            && full.Ixx == full.Izz
            && full.Ixx > full.Iyy
            && CylinderInertia.EulerRate(new Vector3d(0.2d, 0d, 0d), full).SqrMagnitude == 0d
            && CylinderInertia.EulerRate(new Vector3d(0d, 0.2d, 0d), full).SqrMagnitude == 0d
            && CylinderInertia.EulerRate(new Vector3d(0d, 0d, 0.2d), full).SqrMagnitude == 0d;

        PlanetaryEnvironment env = PlanetaryEnvironment.CreateEarth(false);
        env.GravityEnabled = false;
        env.AtmosphereEnabled = false;
        IntegratorRK4 integrator = new IntegratorRK4(env, PropulsionModel.CreateDefaultStage());
        Vector3d omega = new Vector3d(0.04d, 0.07d, 0.02d);
        VehicleState state = VehicleState.CreateSeaLevel(env);
        state.AngularVelocityBody = omega;
        double mass = state.TotalMassKg;
        Vector3d l0 = CylinderInertia.InertialAngularMomentum(state.Attitude, state.AngularVelocityBody, mass);
        int steps = 30 * IntegratorRK4.StepHz;
        for (int i = 0; i < steps; i++) integrator.Step(state, 1d / IntegratorRK4.StepHz, 1, 0d);
        Vector3d l1 = CylinderInertia.InertialAngularMomentum(state.Attitude, state.AngularVelocityBody, state.TotalMassKg);
        double relative = (l1 - l0).Magnitude / l0.Magnitude;
        bool conserved = state.TotalMassKg == mass
            && state.AngularVelocityBody.Y == omega.Y
            && Math.Abs(state.AngularVelocityBody.X - omega.X) > 1e-4d
            && Math.Abs(state.AngularVelocityBody.Z - omega.Z) > 1e-4d
            && relative < 1e-9d
            && state.Velocity.X == 0d
            && state.Velocity.Y == 0d
            && state.Velocity.Z == 0d
            && Math.Abs(state.Attitude.Magnitude - 1d) < 1e-12d;

        Vector3d perturbed = new Vector3d(1e-4d, 0.2d, 0d);
        VehicleState spin = VehicleState.CreateSeaLevel(env);
        spin.AngularVelocityBody = perturbed;
        int holdSteps = 40 * IntegratorRK4.StepHz;
        for (int i = 0; i < holdSteps; i++) integrator.Step(spin, 1d / IntegratorRK4.StepHz, 1, 0d);
        double transverse = Math.Sqrt(spin.AngularVelocityBody.X * spin.AngularVelocityBody.X + spin.AngularVelocityBody.Z * spin.AngularVelocityBody.Z);
        bool stable = spin.AngularVelocityBody.Y == perturbed.Y && Math.Abs(transverse - 1e-4d) / 1e-4d < 1e-6d;

        TelemetrySample start = principalBurn.Samples[0];
        TelemetrySample end = principalBurn.Samples[18];
        double specific0 = start.AngularMomentumKgM2S / start.TotalMassKg;
        double specificEnd = end.AngularMomentumKgM2S / end.TotalMassKg;
        bool scales = end.TotalMassKg < start.TotalMassKg
            && Math.Abs(specificEnd - specific0) / specific0 < 1e-8d
            && end.OmegaBodyX == 0.1d
            && end.OmegaBodyY == 0d
            && end.OmegaBodyZ == 0d
            && end.AltitudeM == quiet.Samples[18].AltitudeM
            && principalBurn.AchievedDeltaVMps == quiet.AchievedDeltaVMps
            && quiet.Samples[0].AngularMomentumKgM2S == 0d
            && quiet.Samples[0].InertiaIyy > 0d
            && quiet.Samples[18].InertiaIyy < quiet.Samples[0].InertiaIyy;

        if (!geometry || !conserved || !stable || !scales)
        {
            Console.WriteLine("EULER FAIL geometry=" + geometry + " conserved=" + conserved + " rel=" + relative.ToString("E6") + " stable=" + stable + " scales=" + scales);
        }
        return geometry && conserved && stable && scales;
    }

    /// <summary>
    /// Pass 11. Constant gimbal δ maps thrust at r = (0, −H/2, 0) into Mz = d · T · sin δ.
    /// From rest, αz = Mz / Izz and ωx = ωy = 0. Zero gimbal is the Pass 10 burn.
    /// </summary>
    private static bool VerifyGimbal(SimulationReport quiet)
    {
        const double delta = 0.01d;
        PropulsionModel propulsion = PropulsionModel.CreateDefaultStage();
        double thrust = propulsion.ThrustMagnitudeN(1d, VehicleState.InitialPropellantMassKg);
        Vector3d moment = CylinderInertia.GimbalMoment(thrust, delta);
        double expectedMz = CylinderInertia.ThrustAxialOffsetM * thrust * Math.Sin(delta);
        double m0 = VehicleState.DryMassKg + VehicleState.InitialPropellantMassKg;
        CylinderInertia.Moments full = CylinderInertia.FromMass(m0);
        Vector3d alpha = CylinderInertia.EulerRate(Vector3d.Zero, full, moment);
        bool geometry = CylinderInertia.ThrustAxialOffsetM == CylinderInertia.HeightM * 0.5d
            && moment.X == 0d
            && moment.Y == 0d
            && moment.Z == expectedMz
            && CylinderInertia.GimbalMoment(thrust, 0d).SqrMagnitude == 0d
            && CylinderInertia.GimbalMoment(0d, delta).SqrMagnitude == 0d
            && alpha.X == 0d
            && alpha.Y == 0d
            && alpha.Z == expectedMz / full.Izz;

        double mdot = propulsion.MassFlowKgS(1d, VehicleState.InitialPropellantMassKg);
        double specificIzz = CylinderInertia.FromMass(1d).Izz;
        bool integrated = true;
        int[] splits = new int[] { 1, 4 };
        for (int s = 0; s < splits.Length; s++)
        {
            int substeps = splits[s];
            double omegaZ = 0d;
            double h = 1d / IntegratorRK4.StepHz / substeps;
            int steps = 10 * IntegratorRK4.StepHz * substeps;
            for (int n = 1; n <= steps; n++)
            {
                double mass = m0 - mdot * n * h;
                omegaZ += (expectedMz / (specificIzz * mass)) * h;
            }
            SimulationReport steered = SimulationHarness.RunVerticalBurn(true, substeps, Vector3d.Zero, delta);
            TelemetrySample at10 = steered.Samples[2];
            double relative = Math.Abs(at10.OmegaBodyZ - omegaZ) / omegaZ;
            double alphaRel = Math.Abs(at10.AlphaZ - expectedMz / (specificIzz * at10.TotalMassKg)) / at10.AlphaZ;
            bool stepOk = at10.TimeS == 10d
                && at10.OmegaBodyX == 0d
                && at10.OmegaBodyY == 0d
                && relative < 1e-9d
                && alphaRel < 1e-12d
                && at10.MomentZ > 0d
                && at10.MomentX == 0d
                && at10.MomentY == 0d
                && at10.GimbalRad == delta;
            if (!stepOk)
            {
                Console.WriteLine("GIMBAL STEP FAIL sub=" + substeps + " wz=" + at10.OmegaBodyZ.ToString("G17") + " exp=" + omegaZ.ToString("G17") + " rel=" + relative.ToString("E6") + " aRel=" + alphaRel.ToString("E6"));
                integrated = false;
            }
        }

        SimulationReport explicitZero = SimulationHarness.RunVerticalBurn(false, 1, Vector3d.Zero, 0d);
        TelemetrySample q18 = quiet.Samples[18];
        TelemetrySample e18 = explicitZero.Samples[18];
        bool recovered = explicitZero.AchievedDeltaVMps == quiet.AchievedDeltaVMps
            && explicitZero.ThrustIntegratedDeltaVMps == quiet.ThrustIntegratedDeltaVMps
            && e18.AltitudeM == q18.AltitudeM
            && e18.SpeedMps == q18.SpeedMps
            && e18.HorizontalMps == q18.HorizontalMps
            && e18.PropellantKg == q18.PropellantKg
            && e18.QuaternionW == 1d
            && e18.OmegaBodyX == 0d
            && e18.OmegaBodyY == 0d
            && e18.OmegaBodyZ == 0d
            && e18.MomentZ == 0d
            && e18.GimbalRad == 0d;

        SimulationReport tilted = SimulationHarness.RunVerticalBurn(false, 1, Vector3d.Zero, delta);
        bool tilts = tilted.Samples[18].HorizontalMps > 1d
            && tilted.Samples[18].AltitudeM != q18.AltitudeM
            && tilted.ThrustIntegratedDeltaVMps == quiet.ThrustIntegratedDeltaVMps;

        Vector3d spinOmega = new Vector3d(0.1d, 0d, 0d);
        SimulationReport spinA = SimulationHarness.RunVerticalBurn(false, 1, spinOmega);
        SimulationReport spinB = SimulationHarness.RunVerticalBurn(false, 1, spinOmega, 0d);
        bool spinMatch = spinA.AchievedDeltaVMps == spinB.AchievedDeltaVMps
            && spinA.Samples[18].AltitudeM == spinB.Samples[18].AltitudeM
            && spinA.Samples[18].SpeedMps == spinB.Samples[18].SpeedMps
            && spinA.Samples[18].PropellantKg == spinB.Samples[18].PropellantKg
            && spinA.Samples[18].HorizontalMps == spinB.Samples[18].HorizontalMps
            && spinA.Samples[18].OmegaBodyX == spinB.Samples[18].OmegaBodyX
            && spinA.Samples[18].QuaternionW == spinB.Samples[18].QuaternionW;

        bool ok = geometry && integrated && recovered && tilts && spinMatch;
        if (!ok)
        {
            Console.WriteLine("GIMBAL FAIL geometry=" + geometry + " integrated=" + integrated + " recovered=" + recovered + " tilts=" + tilts + " spin=" + spinMatch);
        }
        return ok;
    }

    /// <summary>
    /// Aerodynamic moment. CoP is H/4 aft. Mz at ρ=1.225, v=100, α=90° is −4,593,750 N·m.
    /// Vacuum and zero α leave the previous burns unchanged. A 5° disturbance restores.
    /// </summary>
    private static bool VerifyAero(SimulationReport earth, SimulationReport vacuum)
    {
        bool geometry = AeroMoment.CopAxialOffsetM == CylinderInertia.HeightM * 0.25d
            && AeroMoment.CopAxialOffsetM == 12.5d
            && AeroMoment.ReferenceAreaM2 == 60d;
        Vector3d sideways = new Vector3d(100d, 0d, 0d);
        double force = AeroMoment.NormalForceN(1.225d, 100d, 1d);
        Vector3d moment = AeroMoment.Moment(QuaternionD.Identity, sideways, 1.225d);
        bool reference = moment.X == 0d
            && moment.Y == 0d
            && moment.Z == -AeroMoment.CopAxialOffsetM * force
            && moment.Z == -4593750d
            && AeroMoment.Moment(QuaternionD.Identity, sideways, 0d).SqrMagnitude == 0d
            && AeroMoment.Moment(QuaternionD.Identity, new Vector3d(0d, 100d, 0d), 1.225d).SqrMagnitude == 0d
            && AeroMoment.SinAngleOfAttack(new Vector3d(0d, -40d, 0d)) == 0d;
        bool quiet = earth.Samples[18].AeroMomentZ == 0d
            && earth.Samples[18].AngleOfAttackRad == 0d
            && earth.Samples[18].QuaternionW == 1d
            && Math.Abs(earth.AchievedDeltaVMps - 296.123035d) < 1e-4d
            && vacuum.Samples[18].AeroMomentZ == 0d
            && vacuum.Samples[18].MomentZ == 0d
            && vacuum.AchievedDeltaVMps == earth.ThrustIntegratedDeltaVMps;

        PlanetaryEnvironment env = PlanetaryEnvironment.CreateEarth();
        env.GravityEnabled = false;
        env.AtmosphereEnabled = true;
        IntegratorRK4 integrator = new IntegratorRK4(env, PropulsionModel.CreateDefaultStage());
        VehicleState state = VehicleState.CreateSeaLevel(env);
        state.Velocity = new Vector3d(0d, 100d, 0d);
        double alpha0 = 5d * Math.PI / 180d;
        QuaternionD pitched = QuaternionD.FromAxisAngle(new Vector3d(0d, 0d, 1d), alpha0);
        state.Attitude = pitched;
        state.InitialAttitude = pitched;
        double alphaStart = AeroMoment.AngleOfAttackRad(AeroMoment.VelocityBody(state.Attitude, state.Velocity));
        Vector3d m0 = AeroMoment.Moment(state.Attitude, state.Velocity, env.AtmosphericDensityKgM3(state.Position));
        bool restoringStart = Math.Abs(alphaStart - alpha0) < 1e-12d && m0.Z < 0d;

        double maxAbs = 0d;
        bool crossed = false;
        bool early = false;
        bool finite = true;
        int steps = 120 * IntegratorRK4.StepHz;
        for (int n = 1; n <= steps; n++)
        {
            integrator.Step(state, 1d / IntegratorRK4.StepHz, 1, 0d);
            double alpha = AeroMoment.AngleOfAttackRad(AeroMoment.VelocityBody(state.Attitude, state.Velocity));
            if (double.IsNaN(alpha) || double.IsNaN(state.AngularVelocityBody.Z) || double.IsNaN(state.Attitude.W)) finite = false;
            double abs = Math.Abs(alpha);
            if (abs > maxAbs) maxAbs = abs;
            if (alpha < 0d) crossed = true;
            if (n == 5 * IntegratorRK4.StepHz)
            {
                early = state.AngularVelocityBody.Z < 0d && alpha < alpha0;
            }
        }
        bool oscillates = restoringStart && early && crossed && finite && maxAbs < 0.35d;
        bool ok = geometry && reference && quiet && oscillates;
        if (!ok)
        {
            Console.WriteLine("AERO FAIL geometry=" + geometry + " reference=" + reference + " quiet=" + quiet + " oscillates=" + oscillates + " max=" + maxAbs.ToString("G6") + " mz=" + moment.Z.ToString("G17"));
        }
        return ok;
    }

    /// <summary>
    /// Pitch PD. δ = −(Kp θ + Kd ωz), clamped to ±5°.
    /// Zero error leaves the atmospheric burn unchanged. Off forces δ = 0.
    /// A 5° vacuum disturbance saturates, then settles inside 10 s.
    /// </summary>
    private static bool VerifyAttitudeHold(SimulationReport earth)
    {
        SimulationReport held = SimulationHarness.RunVerticalBurn(false, 1, Vector3d.Zero, 0d, true, QuaternionD.Identity);
        SimulationReport disabled = SimulationHarness.RunVerticalBurn(false, 1, Vector3d.Zero, 0d, false, QuaternionD.Identity);
        TelemetrySample end = held.Samples[18];
        bool baseline = held.AchievedDeltaVMps == earth.AchievedDeltaVMps
            && end.AltitudeM == earth.Samples[18].AltitudeM
            && end.SpeedMps == earth.Samples[18].SpeedMps
            && end.PropellantKg == earth.Samples[18].PropellantKg
            && Math.Abs(held.AchievedDeltaVMps - 296.123d) < 0.001d
            && Math.Abs(end.AltitudeM - 10800.316d) < 0.01d
            && end.GimbalRad == 0d
            && end.MomentZ == 0d
            && Math.Abs(end.QuaternionW - 1d) < 1e-9d
            && Math.Abs(end.QuaternionX) < 1e-9d
            && Math.Abs(end.QuaternionY) < 1e-9d
            && Math.Abs(end.QuaternionZ) < 1e-9d
            && end.OmegaBodyX == 0d
            && end.OmegaBodyY == 0d
            && end.OmegaBodyZ == 0d
            && disabled.AchievedDeltaVMps == earth.AchievedDeltaVMps
            && disabled.Samples[18].AltitudeM == earth.Samples[18].AltitudeM
            && disabled.Samples[18].GimbalRad == 0d;

        QuaternionD pitched = QuaternionD.FromAxisAngle(new Vector3d(0d, 0d, 1d), AttitudeController.GimbalLimitRad);
        PlanetaryEnvironment env = PlanetaryEnvironment.CreateEarth(false);
        env.GravityEnabled = false;
        env.AtmosphereEnabled = false;
        VehicleState openLoop = VehicleState.CreateSeaLevel(env);
        openLoop.ControllerEnabled = false;
        openLoop.Attitude = pitched;
        bool forced = AttitudeController.EffectiveGimbal(openLoop) == 0d
            && AttitudeController.Kp == 1d
            && AttitudeController.Kd == 1.5d;

        IntegratorRK4 integrator = new IntegratorRK4(env, PropulsionModel.CreateDefaultStage());
        VehicleState state = VehicleState.CreateSeaLevel(env);
        state.ControllerEnabled = true;
        state.Attitude = pitched;
        state.InitialAttitude = pitched;
        double command = AttitudeController.Command(state.Attitude, 0d);
        bool saturated = command == -AttitudeController.GimbalLimitRad
            && Math.Abs(AttitudeController.PitchAngleRad(state.Attitude) - AttitudeController.GimbalLimitRad) < 1e-15d
            && state.TotalMassKg == 1320000d;

        bool crossed = false;
        double overshoot = 0d;
        double theta5 = 1d;
        double wz5 = 1d;
        double theta10 = 1d;
        double wz10 = 1d;
        bool finite = true;
        int steps = 10 * IntegratorRK4.StepHz;
        for (int n = 0; n <= steps; n++)
        {
            double theta = AttitudeController.PitchAngleRad(state.Attitude);
            double wz = state.AngularVelocityBody.Z;
            if (n > 0 && theta <= 0d) crossed = true;
            if (crossed && -theta > overshoot) overshoot = -theta;
            if (n == 5 * IntegratorRK4.StepHz)
            {
                theta5 = theta;
                wz5 = wz;
            }
            if (n == 10 * IntegratorRK4.StepHz)
            {
                theta10 = theta;
                wz10 = wz;
            }
            if (n == steps) break;
            integrator.Step(state, 1d / IntegratorRK4.StepHz, 1, 1d);
            if (double.IsNaN(state.Attitude.W) || Math.Abs(AttitudeController.EffectiveGimbal(state)) > AttitudeController.GimbalLimitRad + 1e-15d)
            {
                finite = false;
            }
        }
        double deg = Math.PI / 180d;
        bool settled = finite
            && crossed
            && Math.Abs(theta5) < 0.10d * deg
            && Math.Abs(wz5) < 0.010d
            && Math.Abs(theta10) < 0.05d * deg
            && Math.Abs(wz10) < 0.005d
            && overshoot < 0.20d * deg;
        bool ok = baseline && forced && saturated && settled;
        if (!ok)
        {
            Console.WriteLine("HOLD FAIL baseline=" + baseline + " forced=" + forced + " saturated=" + saturated + " settled=" + settled
                + " th5=" + theta5.ToString("G6") + " wz5=" + wz5.ToString("G6")
                + " th10=" + theta10.ToString("G6") + " wz10=" + wz10.ToString("G6")
                + " over=" + overshoot.ToString("G6"));
        }
        return ok;
    }

    private const double EARTH_CHECK_MU = 3.986004418e14d;
    private const double EARTH_CHECK_RADIUS = 6_371_000d + 200_000d;

    private static VehicleState VacuumCoast(KeplerCapture capture, double seconds)
    {
        PlanetaryEnvironment env = PlanetaryEnvironment.CreateEarth(false);
        env.GravityEnabled = true;
        env.AtmosphereEnabled = false;
        IntegratorRK4 integrator = new IntegratorRK4(env, PropulsionModel.CreateDefaultStage());
        VehicleState state = new VehicleState
        {
            Position = capture.Position,
            Velocity = capture.Velocity,
            PropellantMassKg = capture.PropellantKg,
            TotalMassKg = capture.TotalMassKg,
            ThrustIntegratedDeltaVMps = capture.ThrustIntegratedDeltaVMps
        };
        int steps = (int)Math.Round(seconds * IntegratorRK4.StepHz);
        for (int i = 0; i < steps; i++) integrator.Step(state, 1d / IntegratorRK4.StepHz, 1, 0d);
        return state;
    }
}
