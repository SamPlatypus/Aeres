using MarsMission.Math;

namespace MarsMission.PhysicsCore
{
    using Math = System.Math;
    /// <summary>
    /// Vehicle state in SI units, relative to the primary-body center.
    /// Attitude is body-to-inertial. Angular velocity is body-frame, rad/s.
    /// Both default to identity and zero. A zero gimbal keeps external torque at zero.
    /// A non-zero gimbal applies M = r × F from thrust at the aft face. A zero rate
    /// with zero gimbal does not change translation.
    /// </summary>
    public sealed class VehicleState
    {
        public const double DryMassKg = 120_000d;
        public const double InitialPropellantMassKg = 1_200_000d;

        public Vector3d Position;
        public Vector3d Velocity;
        public double TotalMassKg;
        public double PropellantMassKg;

        /// <summary>
        /// ∫ |a_thrust| dt, integrated with the same RK4 weights as velocity.
        /// </summary>
        public double ThrustIntegratedDeltaVMps;

        /// <summary>Body-to-inertial attitude. Identity unless overridden.</summary>
        public QuaternionD Attitude = QuaternionD.Identity;

        /// <summary>Attitude at initialization. The integrator does not change it.</summary>
        public QuaternionD InitialAttitude = QuaternionD.Identity;

        /// <summary>Body-frame angular velocity, rad/s. Torque-free Euler when the gimbal is zero.</summary>
        public Vector3d AngularVelocityBody = Vector3d.Zero;

        /// <summary>Constant deflection of thrust from body +Y toward +X, radians. Zero keeps Pass 10.</summary>
        public double GimbalRad = 0d;

        public static VehicleState CreateSeaLevel(PlanetaryEnvironment environment)
        {
            return new VehicleState
            {
                Position = new Vector3d(0d, environment.EquatorialRadiusM, 0d),
                Velocity = Vector3d.Zero,
                PropellantMassKg = InitialPropellantMassKg,
                TotalMassKg = DryMassKg + InitialPropellantMassKg,
                ThrustIntegratedDeltaVMps = 0d,
                Attitude = QuaternionD.Identity,
                InitialAttitude = QuaternionD.Identity,
                AngularVelocityBody = Vector3d.Zero
            };
        }

        /// <summary>
        /// Entry interface. +Y is radial. Flight-path angle is from the local horizontal.
        /// </summary>
        public static VehicleState CreateEntry(
            PlanetaryEnvironment environment,
            double altitudeM,
            double speedMps,
            double flightPathDeg,
            double propellantKg)
        {
            double radius = environment.EquatorialRadiusM + altitudeM;
            double gamma = flightPathDeg * System.Math.PI / 180d;
            return new VehicleState
            {
                Position = new Vector3d(0d, radius, 0d),
                Velocity = new Vector3d(speedMps * System.Math.Cos(gamma), speedMps * System.Math.Sin(gamma), 0d),
                PropellantMassKg = propellantKg,
                TotalMassKg = DryMassKg + propellantKg,
                ThrustIntegratedDeltaVMps = 0d,
                Attitude = QuaternionD.Identity,
                InitialAttitude = QuaternionD.Identity,
                AngularVelocityBody = Vector3d.Zero
            };
        }

        public VehicleState Clone()
        {
            return new VehicleState
            {
                Position = Position,
                Velocity = Velocity,
                TotalMassKg = TotalMassKg,
                PropellantMassKg = PropellantMassKg,
                ThrustIntegratedDeltaVMps = ThrustIntegratedDeltaVMps,
                Attitude = Attitude,
                InitialAttitude = InitialAttitude,
                AngularVelocityBody = AngularVelocityBody,
                GimbalRad = GimbalRad
            };
        }
    }
}
