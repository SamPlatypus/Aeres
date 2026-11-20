using System;
using MarsMission.Math;

namespace MarsMission.PhysicsCore
{
    using Math = System.Math;
    /// <summary>
    /// Vacuum rocket. Mass flow is T / (Isp · g0). g0 is the standard gravity used by Isp,
    /// not the local gravitational acceleration of the primary.
    /// </summary>
    public sealed class PropulsionModel
    {
        public const double DefaultMaxVacuumThrustN = 15_000_000d;
        public const double DefaultVacuumIspS = 380d;
        public const double G0Mps2 = 9.80665d;
        public const double DefaultDragCd = 0.5d;
        public const double DefaultDragAreaM2 = 60d;

        public double MaxVacuumThrustN { get; private set; }
        public double VacuumIspS { get; private set; }
        public double G0 { get; private set; }
        public double DragCd { get; private set; }
        public double DragAreaM2 { get; private set; }
        public Vector3d ThrustDirectionInertial { get; private set; }

        private PropulsionModel()
        {
        }

        public static PropulsionModel CreateDefaultStage()
        {
            return new PropulsionModel
            {
                MaxVacuumThrustN = DefaultMaxVacuumThrustN,
                VacuumIspS = DefaultVacuumIspS,
                G0 = G0Mps2,
                DragCd = DefaultDragCd,
                DragAreaM2 = DefaultDragAreaM2,
                ThrustDirectionInertial = Vector3d.Up
            };
        }

        public double ExhaustVelocityMps
        {
            get { return VacuumIspS * G0; }
        }

        public static bool IsFiring(double throttle, double propellantKg)
        {
            return throttle > 0d && propellantKg > -1e-8d;
        }

        public double ThrustMagnitudeN(double throttle, double propellantKg)
        {
            if (!IsFiring(throttle, propellantKg)) return 0d;
            double limited = throttle > 1d ? 1d : throttle;
            return limited * MaxVacuumThrustN;
        }

        public double MassFlowKgS(double throttle, double propellantKg)
        {
            double thrust = ThrustMagnitudeN(throttle, propellantKg);
            if (thrust <= 0d) return 0d;
            return thrust / ExhaustVelocityMps;
        }

        public double IdealDeltaVMps(double initialMassKg, double finalMassKg)
        {
            if (!(initialMassKg > 0d) || !(finalMassKg > 0d) || finalMassKg > initialMassKg)
            {
                throw new ArgumentOutOfRangeException("finalMassKg", "Rocket equation requires 0 < mf ≤ m0.");
            }

            return ExhaustVelocityMps * Math.Log(initialMassKg / finalMassKg);
        }
    }
}
