using System;
using MarsMission.Math;

namespace MarsMission.PhysicsCore
{
    using Math = System.Math;

    /// <summary>
    /// Aerodynamic moment about the center of mass.
    /// CoP is H/4 aft of the CoM on body −Y. Reference area matches the drag model.
    /// F_normal = ½ ρ |v|² S sin α along body +X.
    /// M_z = r_cop.Y * F_x = −(H/4) * F_normal, which restores a positive angle of attack.
    /// Vacuum, zero speed, and zero α return the zero vector and do not change translation.
    /// </summary>
    public static class AeroMoment
    {
        public const double CopAxialOffsetM = CylinderInertia.HeightM * 0.25d;
        public const double ReferenceAreaM2 = PropulsionModel.DefaultDragAreaM2;

        public static Vector3d CopPointBody()
        {
            return new Vector3d(0d, -CopAxialOffsetM, 0d);
        }

        public static Vector3d VelocityBody(QuaternionD attitude, Vector3d velocityInertial)
        {
            return attitude.Conjugate.Rotate(velocityInertial);
        }

        public static double AngleOfAttackRad(Vector3d velocityBody)
        {
            if (velocityBody.X == 0d && velocityBody.Y == 0d) return 0d;
            return Math.Atan2(velocityBody.X, velocityBody.Y);
        }

        public static double SinAngleOfAttack(Vector3d velocityBody)
        {
            if (velocityBody.X == 0d) return 0d;
            double lateral = Math.Sqrt(velocityBody.X * velocityBody.X + velocityBody.Y * velocityBody.Y);
            if (!(lateral > 0d)) return 0d;
            return velocityBody.X / lateral;
        }

        public static double NormalForceN(double densityKgM3, double speedMps, double sinAlpha)
        {
            if (!(densityKgM3 > 0d) || !(speedMps > 0d) || sinAlpha == 0d) return 0d;
            double v2 = speedMps * speedMps;
            return 0.5d * densityKgM3 * v2 * ReferenceAreaM2 * sinAlpha;
        }

        public static Vector3d Moment(QuaternionD attitude, Vector3d velocityInertial, double densityKgM3)
        {
            if (!(densityKgM3 > 0d)) return Vector3d.Zero;
            double speed = velocityInertial.Magnitude;
            if (!(speed > 0d)) return Vector3d.Zero;
            double sinAlpha = SinAngleOfAttack(VelocityBody(attitude, velocityInertial));
            if (sinAlpha == 0d) return Vector3d.Zero;
            double mz = -CopAxialOffsetM * NormalForceN(densityKgM3, speed, sinAlpha);
            if (mz == 0d) return Vector3d.Zero;
            return new Vector3d(0d, 0d, mz);
        }
    }
}
