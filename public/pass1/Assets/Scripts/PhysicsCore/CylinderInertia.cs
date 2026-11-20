using System;
using MarsMission.Math;

namespace MarsMission.PhysicsCore
{
    using Math = System.Math;
    /// <summary>
    /// Uniform solid cylinder. Body +Y is the longitudinal axis.
    /// Height 50 m, radius 4.5 m. Moments scale with the current mass.
    /// The nozzle is on the aft face. A zero gimbal leaves M = 0, so
    /// I ω̇ + ω × (I ω) = 0. A fixed gimbal supplies M = r × F.
    /// Propellant that leaves is assumed to carry its share of angular momentum,
    /// so a change in mass does not itself change ω. Ratios are independent of mass.
    /// </summary>
    public static class CylinderInertia
    {
        public const double HeightM = 50d;
        public const double RadiusM = 4.5d;

        public struct Moments
        {
            public double Ixx;
            public double Iyy;
            public double Izz;
        }

        public static Moments FromMass(double massKg)
        {
            double r2 = RadiusM * RadiusM;
            double axial = 0.5d * massKg * r2;
            double transverse = massKg * (0.25d * r2 + (HeightM * HeightM) / 12d);
            return new Moments
            {
                Ixx = transverse,
                Iyy = axial,
                Izz = transverse
            };
        }

        public static Vector3d EulerRate(Vector3d omega, Moments inertia)
        {
            double wx = omega.X;
            double wy = omega.Y;
            double wz = omega.Z;
            return new Vector3d(
                ((inertia.Iyy - inertia.Izz) / inertia.Ixx) * wy * wz,
                ((inertia.Izz - inertia.Ixx) / inertia.Iyy) * wz * wx,
                ((inertia.Ixx - inertia.Iyy) / inertia.Izz) * wx * wy);
        }

        /// <summary>I ω̇ + ω × (I ω) = M. A zero moment matches the torque-free rate.</summary>
        public static Vector3d EulerRate(Vector3d omega, Moments inertia, Vector3d moment)
        {
            Vector3d gyro = EulerRate(omega, inertia);
            if (moment.X == 0d && moment.Y == 0d && moment.Z == 0d) return gyro;
            return new Vector3d(
                gyro.X + moment.X / inertia.Ixx,
                gyro.Y + moment.Y / inertia.Iyy,
                gyro.Z + moment.Z / inertia.Izz);
        }

        public static Vector3d BodyAngularMomentum(Vector3d omega, Moments inertia)
        {
            return new Vector3d(inertia.Ixx * omega.X, inertia.Iyy * omega.Y, inertia.Izz * omega.Z);
        }

        public static Vector3d InertialAngularMomentum(QuaternionD attitude, Vector3d omega, double massKg)
        {
            return attitude.Rotate(BodyAngularMomentum(omega, FromMass(massKg)));
        }

        /// <summary>Nozzle on the aft face. CoM is the geometric center, so the offset is −H/2 on body Y.</summary>
        public const double ThrustAxialOffsetM = HeightM * 0.5d;

        public static Vector3d ThrustPointBody()
        {
            return new Vector3d(0d, -ThrustAxialOffsetM, 0d);
        }

        /// <summary>Positive gimbal deflects thrust from +Y toward +X. Zero is exactly +Y.</summary>
        public static Vector3d BodyThrustDirection(double gimbalRad)
        {
            if (gimbalRad == 0d) return new Vector3d(0d, 1d, 0d);
            return new Vector3d(Math.Sin(gimbalRad), Math.Cos(gimbalRad), 0d);
        }

        public static Vector3d ThrustMoment(Vector3d forceBody)
        {
            return ThrustPointBody().Cross(forceBody);
        }

        /// <summary>
        /// M = r × F for this gimbal. F = T (sin δ, cos δ, 0) at r = (0, −d, 0),
        /// so M = (0, 0, d · T · sin δ). Zero gimbal or zero thrust is the zero vector.
        /// </summary>
        public static Vector3d GimbalMoment(double thrustN, double gimbalRad)
        {
            if (gimbalRad == 0d || !(thrustN > 0d)) return Vector3d.Zero;
            return new Vector3d(0d, 0d, ThrustAxialOffsetM * thrustN * Math.Sin(gimbalRad));
        }

        /// <summary>
        /// One RK4 step of torque-free Euler and dq/dt = ½ q ⊗ ω.
        /// Identically zero ω returns without reading mass.
        /// A principal-axis rate keeps ω and matches QuaternionD.IntegrateRk4.
        /// </summary>
        public static void IntegrateRk4(ref QuaternionD attitude, ref Vector3d omega, double massKg, double dt)
        {
            if (QuaternionD.AngularVelocityIsZero(omega)) return;
            if (!(dt > 0d) || !(massKg > 0d)) return;

            Moments inertia = FromMass(massKg);
            QuaternionD q0 = attitude;
            Vector3d w0 = omega;

            QuaternionD k1q = QuaternionD.Derivative(q0, w0);
            Vector3d k1w = EulerRate(w0, inertia);
            QuaternionD k2q = QuaternionD.Derivative(q0 + k1q * (dt * 0.5d), w0 + k1w * (dt * 0.5d));
            Vector3d k2w = EulerRate(w0 + k1w * (dt * 0.5d), inertia);
            QuaternionD k3q = QuaternionD.Derivative(q0 + k2q * (dt * 0.5d), w0 + k2w * (dt * 0.5d));
            Vector3d k3w = EulerRate(w0 + k2w * (dt * 0.5d), inertia);
            QuaternionD k4q = QuaternionD.Derivative(q0 + k3q * dt, w0 + k3w * dt);
            Vector3d k4w = EulerRate(w0 + k3w * dt, inertia);

            double scale = dt / 6d;
            attitude = (q0 + (k1q + (k2q * 2d) + (k3q * 2d) + k4q) * scale).Normalized;
            omega = w0 + (k1w + (k2w * 2d) + (k3w * 2d) + k4w) * scale;
        }

        /// <summary>
        /// Euler step with a constant body-frame moment. A zero moment delegates to the torque-free step.
        /// </summary>
        public static void IntegrateRk4(ref QuaternionD attitude, ref Vector3d omega, double massKg, double dt, Vector3d moment)
        {
            if (moment.X == 0d && moment.Y == 0d && moment.Z == 0d)
            {
                IntegrateRk4(ref attitude, ref omega, massKg, dt);
                return;
            }
            if (!(dt > 0d) || !(massKg > 0d)) return;

            Moments inertia = FromMass(massKg);
            QuaternionD q0 = attitude;
            Vector3d w0 = omega;

            QuaternionD k1q = QuaternionD.Derivative(q0, w0);
            Vector3d k1w = EulerRate(w0, inertia, moment);
            QuaternionD k2q = QuaternionD.Derivative(q0 + k1q * (dt * 0.5d), w0 + k1w * (dt * 0.5d));
            Vector3d k2w = EulerRate(w0 + k1w * (dt * 0.5d), inertia, moment);
            QuaternionD k3q = QuaternionD.Derivative(q0 + k2q * (dt * 0.5d), w0 + k2w * (dt * 0.5d));
            Vector3d k3w = EulerRate(w0 + k2w * (dt * 0.5d), inertia, moment);
            QuaternionD k4q = QuaternionD.Derivative(q0 + k3q * dt, w0 + k3w * dt);
            Vector3d k4w = EulerRate(w0 + k3w * dt, inertia, moment);

            double scale = dt / 6d;
            attitude = (q0 + (k1q + (k2q * 2d) + (k3q * 2d) + k4q) * scale).Normalized;
            omega = w0 + (k1w + (k2w * 2d) + (k3w * 2d) + k4w) * scale;
        }

        public static void IntegrateRk4Substeps(ref QuaternionD attitude, ref Vector3d omega, double massKg, double dt, int substeps)
        {
            if (QuaternionD.AngularVelocityIsZero(omega)) return;
            if (substeps < 1) throw new ArgumentOutOfRangeException("substeps");
            if (!(dt > 0d)) return;
            double h = dt / substeps;
            for (int i = 0; i < substeps; i++)
            {
                IntegrateRk4(ref attitude, ref omega, massKg, h);
            }
        }
    }
}
