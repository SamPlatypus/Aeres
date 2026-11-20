using System;
using MarsMission.Math;

namespace MarsMission.PhysicsCore
{
    using Math = System.Math;
    /// <summary>
    /// Open-loop cutoff. Thrust command is 1 until a limit is reached, then exactly 0.
    /// No staging. A command with neither limit never cuts off.
    /// Time cutoff is active when time >= TCutoffS.
    /// </summary>
    public sealed class CutoffCommand
    {
        public bool HasTimeCutoff;
        public double TCutoffS;
        public bool HasPropellantCutoff;
        public double PropellantRemainingKg;

        public static CutoffCommand Never()
        {
            return new CutoffCommand
            {
                HasTimeCutoff = false,
                TCutoffS = 0d,
                HasPropellantCutoff = false,
                PropellantRemainingKg = 0d
            };
        }

        public static CutoffCommand AtTime(double tCutoffS)
        {
            return new CutoffCommand
            {
                HasTimeCutoff = true,
                TCutoffS = tCutoffS,
                HasPropellantCutoff = false,
                PropellantRemainingKg = 0d
            };
        }

        public static CutoffCommand AtPropellant(double propellantRemainingKg)
        {
            return new CutoffCommand
            {
                HasTimeCutoff = false,
                TCutoffS = 0d,
                HasPropellantCutoff = true,
                PropellantRemainingKg = propellantRemainingKg
            };
        }

        /// <summary>1 while commanded on, 0 at and after cutoff.</summary>
        public double Throttle(double timeS, double propellantKg)
        {
            if (HasTimeCutoff && !(timeS < TCutoffS)) return 0d;
            if (HasPropellantCutoff && !(propellantKg > PropellantRemainingKg)) return 0d;
            return 1d;
        }

        /// <summary>
        /// Specific mechanical energy, m²/s².
        /// v²/2 − μ/r when gravity is on. Kinetic only when gravity is off.
        /// </summary>
        public static double SpecificMechanicalEnergy(PlanetaryEnvironment env, Vector3d position, Vector3d velocity)
        {
            double kinetic = 0.5d * velocity.SqrMagnitude;
            if (env == null || !env.GravityEnabled || !(env.MuM3S2 > 0d)) return kinetic;
            double radius = position.Magnitude;
            if (!(radius > 0d)) return kinetic;
            return kinetic - env.MuM3S2 / radius;
        }
    }
}
