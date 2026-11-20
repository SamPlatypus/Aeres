using System;
using MarsMission.Math;

namespace MarsMission.PhysicsCore
{
    using Math = System.Math;
    /// <summary>
    /// Spherical primary body. Gravity is point-mass Newtonian, with an optional J2 term.
    /// Atmosphere is exponential: ρ = ρ0 exp(−h / H). Pass 1 verification uses Earth, J2 off.
    /// </summary>
    public sealed class PlanetaryEnvironment
    {
        public const double EarthMuM3S2 = 3.986004418e14;
        public const double EarthEquatorialRadiusM = 6_371_000d;
        public const double EarthSeaLevelDensityKgM3 = 1.225d;
        public const double EarthScaleHeightM = 8_500d;
        public const double EarthJ2 = 1.08262668e-3;

        public const double MarsMuM3S2 = 4.282837e13;
        public const double MarsEquatorialRadiusM = 3_389_500d;
        public const double MarsSeaLevelDensityKgM3 = 0.020d;
        public const double MarsScaleHeightM = 11_100d;
        public const double MarsJ2 = 1.96045e-3;

        public const double EarthSpeedOfSoundMps = 340d;
        public const double MarsSpeedOfSoundMps = 240d;

        public string Name { get; private set; }
        public double MuM3S2 { get; private set; }
        public double EquatorialRadiusM { get; private set; }
        public double SeaLevelDensityKgM3 { get; private set; }
        public double ScaleHeightM { get; private set; }
        public double J2 { get; private set; }
        public double SpeedOfSoundMps { get; private set; }
        public bool GravityEnabled { get; set; }
        public bool AtmosphereEnabled { get; set; }

        private PlanetaryEnvironment()
        {
            Name = string.Empty;
        }

        public static PlanetaryEnvironment CreateEarth(bool includeJ2)
        {
            return new PlanetaryEnvironment
            {
                Name = "Earth",
                MuM3S2 = EarthMuM3S2,
                EquatorialRadiusM = EarthEquatorialRadiusM,
                SeaLevelDensityKgM3 = EarthSeaLevelDensityKgM3,
                ScaleHeightM = EarthScaleHeightM,
                J2 = includeJ2 ? EarthJ2 : 0d,
                SpeedOfSoundMps = EarthSpeedOfSoundMps,
                GravityEnabled = true,
                AtmosphereEnabled = true
            };
        }

        public static PlanetaryEnvironment CreateEarth()
        {
            return CreateEarth(false);
        }

        public static PlanetaryEnvironment CreateMars(bool includeJ2)
        {
            return new PlanetaryEnvironment
            {
                Name = "Mars",
                MuM3S2 = MarsMuM3S2,
                EquatorialRadiusM = MarsEquatorialRadiusM,
                SeaLevelDensityKgM3 = MarsSeaLevelDensityKgM3,
                ScaleHeightM = MarsScaleHeightM,
                J2 = includeJ2 ? MarsJ2 : 0d,
                SpeedOfSoundMps = MarsSpeedOfSoundMps,
                GravityEnabled = true,
                AtmosphereEnabled = true
            };
        }

        public static PlanetaryEnvironment CreateMars()
        {
            return CreateMars(false);
        }

        public double AltitudeM(Vector3d position)
        {
            return position.Magnitude - EquatorialRadiusM;
        }

        public double AtmosphericDensityKgM3(Vector3d position)
        {
            if (!AtmosphereEnabled) return 0d;
            double height = AltitudeM(position);
            if (height < 0d) height = 0d;
            return SeaLevelDensityKgM3 * Math.Exp(-height / ScaleHeightM);
        }

        /// <summary>
        /// a = −μ r / |r|³ + a_J2.
        /// a_J2 = −(3/2) J2 μ Re² / r⁵ · [(1 − 5 z²/r²) x, (1 − 5 z²/r²) y, (3 − 5 z²/r²) z]
        /// </summary>
        public Vector3d GravitationalAcceleration(Vector3d position)
        {
            if (!GravityEnabled) return Vector3d.Zero;
            double r2 = position.SqrMagnitude;
            double r = Math.Sqrt(r2);
            if (!(r > 0d)) return Vector3d.Zero;

            double r3 = r2 * r;
            Vector3d accel = position * (-MuM3S2 / r3);

            if (J2 != 0d)
            {
                double z2 = position.Z * position.Z;
                double fiveZ2OverR2 = (5d * z2) / r2;
                double factor = (-1.5d * J2 * MuM3S2 * EquatorialRadiusM * EquatorialRadiusM) / (r3 * r2);
                accel += new Vector3d(
                    factor * position.X * (1d - fiveZ2OverR2),
                    factor * position.Y * (1d - fiveZ2OverR2),
                    factor * position.Z * (3d - fiveZ2OverR2));
            }

            return accel;
        }
    }
}
