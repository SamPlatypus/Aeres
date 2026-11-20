#if UNITY_5_3_OR_NEWER
using UnityEngine;

namespace MarsMission.PhysicsCore
{
    using Math = System.Math;
    /// <summary>
    /// Headless driver. Attach to an empty GameObject and press Play.
    /// No renderer, no Rigidbody, no PhysX.
    /// </summary>
    public sealed class AresVerticalBurnDriver : MonoBehaviour
    {
        [Tooltip("Turn off gravity and atmosphere so integrated Δv can be checked against the ideal rocket equation.")]
        public bool disableGravityAndAtmosphere;

        [Tooltip("RK4 sub-steps inside each 0.02 s major step.")]
        public int substeps = 1;

        [Tooltip("When set, run the open-loop pitch program instead of pure +Y.")]
        public bool runPitchProgram;

        [Tooltip("Seconds of inertial +Y thrust before pitch-over.")]
        public double tVerticalSeconds = 20d;

        [Tooltip("Pitch rate in deg/s from +Y toward +X after the vertical segment.")]
        public double pitchRateDegPerS = 1d;

        [Tooltip("When set, cut the engine off and coast. Default Play stays on the verified burn.")]
        public bool runCutoff;

        [Tooltip("Cutoff time in seconds. Ignored unless runCutoff is set.")]
        public double tCutoffSeconds = 60d;

        [Tooltip("Integration end time in seconds when runCutoff is set.")]
        public double coastEndSeconds = 120d;

        [Tooltip("After cutoff, replace RK4 with an analytic Kepler coast. Drag is zero on that arc. Ignored while thrust is still commanded.")]
        public bool analyticKepler;

        [Tooltip("Select Mars as the primary. Leave off to keep the verified Earth runs.")]
        public bool marsPrimary;

        [Tooltip("Start at the Mars entry interface instead of the surface. Ignored unless marsPrimary is set.")]
        public bool marsEntryInterface;

        [Tooltip("Arm the open-loop terminal flip and landing burn. Mars entry only. Leave off to keep Pass 1–5.")]
        public bool terminalSequence;

        [Tooltip("5 km trigger and 100% landing thrust. Ignored unless terminalSequence is set.")]
        public bool terminalEarly;

        [Tooltip("Landing-burn horizontal fraction, 0 to 1. 0 keeps pure local vertical. Ignored in Proportional mode.")]
        public double horizontalFraction = 0d;

        [Tooltip("FixedFraction keeps Pass 7. Proportional sets the fraction from horizontal speed.")]
        public string guidanceMode = "FixedFraction";

        [Tooltip("Mars entry speed. 6000 m/s is the verified interface.")]
        public double entrySpeedMps = 6000d;

        [Tooltip("Mars entry propellant. 50000 kg is the verified interface.")]
        public double entryPropellantKg = 50000d;

        [Tooltip("Mars entry flight-path angle from local horizontal. -12 deg is the verified interface.")]
        public double entryFlightPathDeg = -12d;

        public double proportionalGain = 1d;
        public double proportionalSpeedRefMps = 500d;
        public double maxHorizontalFraction = 0.75d;

        private void Start()
        {
            if (marsPrimary)
            {
                if (marsEntryInterface)
                {
                    bool defaultEntry = entrySpeedMps == 6000d && entryPropellantKg == 50000d && entryFlightPathDeg == -12d;
                    if (terminalSequence)
                    {
                        bool proportional = guidanceMode == "Proportional";
                        if (!proportional && !(horizontalFraction > 0d) && defaultEntry)
                        {
                            SimulationHarness.RunMarsTerminalLanding(disableGravityAndAtmosphere, substeps, terminalEarly);
                            return;
                        }

                        TerminalSequence profile = terminalEarly ? TerminalSequence.EarlyProfile() : TerminalSequence.DefaultProfile();
                        TerminalSequence sequence = proportional || horizontalFraction > 0d
                            ? new TerminalSequence(
                                profile.TriggerAltitudeM,
                                profile.TriggerTimeS,
                                profile.FlipDurationS,
                                profile.FlipThrottle,
                                profile.LandingThrottle,
                                profile.ManualCutoffS,
                                horizontalFraction,
                                proportional ? "Proportional" : "FixedFraction",
                                proportionalGain,
                                proportionalSpeedRefMps,
                                maxHorizontalFraction)
                            : profile;
                        if (defaultEntry)
                        {
                            SimulationHarness.RunMarsTerminalLanding(disableGravityAndAtmosphere, substeps, sequence);
                            return;
                        }

                        SimulationHarness.RunMarsTerminalLanding(
                            disableGravityAndAtmosphere,
                            substeps,
                            sequence,
                            125_000d,
                            entrySpeedMps,
                            entryFlightPathDeg,
                            entryPropellantKg);
                        return;
                    }

                    if (defaultEntry)
                    {
                        SimulationHarness.RunMarsEntry(disableGravityAndAtmosphere, analyticKepler);
                        return;
                    }

                    SimulationHarness.RunMarsEntry(
                        disableGravityAndAtmosphere,
                        substeps,
                        analyticKepler,
                        300d,
                        125_000d,
                        entrySpeedMps,
                        entryFlightPathDeg,
                        entryPropellantKg);
                    return;
                }

                SimulationHarness.RunMarsVerticalBurn(disableGravityAndAtmosphere, substeps, 60d);
                return;
            }
            if (runCutoff)
            {
                PitchProgram cutoffProgram = runPitchProgram
                    ? PitchProgram.RateAfterVertical(tVerticalSeconds, pitchRateDegPerS)
                    : PitchProgram.PureVertical();
                CutoffCommand cutoff = CutoffCommand.AtTime(tCutoffSeconds);
                if (analyticKepler)
                {
                    SimulationHarness.RunKeplerCoast(
                        disableGravityAndAtmosphere,
                        substeps,
                        cutoffProgram,
                        cutoff,
                        coastEndSeconds);
                    return;
                }

                SimulationHarness.RunCoastBurn(
                    disableGravityAndAtmosphere,
                    substeps,
                    cutoffProgram,
                    cutoff,
                    coastEndSeconds);
                return;
            }

            if (!runPitchProgram)
            {
                SimulationHarness.RunVerticalBurn(disableGravityAndAtmosphere, substeps);
                return;
            }

            PitchProgram program = PitchProgram.RateAfterVertical(tVerticalSeconds, pitchRateDegPerS);
            SimulationHarness.RunPitchedBurn(disableGravityAndAtmosphere, substeps, program);
        }
    }
}
#endif
