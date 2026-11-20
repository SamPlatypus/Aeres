using System;
using MarsMission.Math;

namespace MarsMission.PhysicsCore
{
    using Math = System.Math;
    /// <summary>
    /// Open-loop inertial pitch command. Point mass only: no attitude state.
    /// Through tVertical the thrust unit vector is inertial +Y.
    /// After that, either a constant rate toward +X or a held pitch angle.
    /// A zero angle for the whole burn is pure vertical and must match Pass 1.
    /// </summary>
    public sealed class PitchProgram
    {
        public double TVerticalS;
        public double PitchRateDegPerS;
        public bool HoldPitch;
        public double HoldPitchDeg;

        public static PitchProgram PureVertical()
        {
            return new PitchProgram
            {
                TVerticalS = 0d,
                PitchRateDegPerS = 0d,
                HoldPitch = false,
                HoldPitchDeg = 0d
            };
        }

        /// <summary>Verification case: 20 s vertical, then 1 deg/s toward horizontal.</summary>
        public static PitchProgram DefaultPitchOver()
        {
            return RateAfterVertical(20d, 1d);
        }

        public static PitchProgram RateAfterVertical(double tVerticalS, double pitchRateDegPerS)
        {
            return new PitchProgram
            {
                TVerticalS = tVerticalS,
                PitchRateDegPerS = pitchRateDegPerS,
                HoldPitch = false,
                HoldPitchDeg = 0d
            };
        }

        public static PitchProgram HoldAfterVertical(double tVerticalS, double holdPitchDeg)
        {
            return new PitchProgram
            {
                TVerticalS = tVerticalS,
                PitchRateDegPerS = 0d,
                HoldPitch = true,
                HoldPitchDeg = holdPitchDeg
            };
        }

        public double PitchAngleDeg(double timeS)
        {
            if (!(timeS > TVerticalS)) return 0d;
            if (HoldPitch) return HoldPitchDeg;
            return PitchRateDegPerS * (timeS - TVerticalS);
        }

        public Vector3d ThrustDirection(double timeS)
        {
            double deg = PitchAngleDeg(timeS);
            if (deg == 0d) return Vector3d.Up;
            double rad = deg * (Math.PI / 180d);
            return new Vector3d(Math.Sin(rad), Math.Cos(rad), 0d);
        }

        public static double HorizontalSpeedMps(Vector3d position, Vector3d velocity)
        {
            double radius = position.Magnitude;
            if (!(radius > 0d)) return 0d;
            double radial = Vector3d.Dot(velocity, position) / radius;
            Vector3d radialVelocity = position * (radial / radius);
            return (velocity - radialVelocity).Magnitude;
        }

        /// <summary>+90 deg is radially outward. Rest is reported as 90 deg.</summary>
        public static double FlightPathAngleDeg(Vector3d position, Vector3d velocity)
        {
            double radius = position.Magnitude;
            double speed = velocity.Magnitude;
            if (!(radius > 0d) || !(speed > 0d)) return 90d;
            double radial = Vector3d.Dot(velocity, position) / radius;
            double horizontalSq = speed * speed - radial * radial;
            if (horizontalSq < 0d) horizontalSq = 0d;
            double horizontal = Math.Sqrt(horizontalSq);
            return Math.Atan2(radial, horizontal) * (180d / Math.PI);
        }
    }
}
